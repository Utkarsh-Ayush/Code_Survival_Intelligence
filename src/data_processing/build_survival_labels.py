"""
Phase 1: Build Survival Labels
================================
Constructs the time-to-failure target variable for each (PROJECT, FILE) pair.

For fault-inducing files:
    duration = fixing_commit_date - inducing_commit_date (in days)
    event    = 1

For right-censored files (never fault-inducing):
    duration = project_end_date - file_first_commit_date (in days)
    event    = 0
"""

import os
import sys
import sqlite3
import pandas as pd
import numpy as np
from datetime import datetime

# ── Paths ────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
DB_PATH = os.path.join(PROJECT_ROOT, "data", "td_V2.db")
OUTPUT_PATH = os.path.join(PROJECT_ROOT, "data", "survival_labels.csv")


def _parse_dates(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    """Parse ISO datetime strings to pandas datetime (UTC)."""
    for col in cols:
        df[col] = pd.to_datetime(df[col], utc=True, errors="coerce")
    return df


def build_fault_observations(conn: sqlite3.Connection) -> pd.DataFrame:
    """
    Build observations where a fault WAS observed (event=1).
    
    Each row = one (project, file, inducing_commit, fixing_commit) tuple.
    Duration = days between the inducing commit and the fixing commit.
    """
    query = """
    SELECT 
        szz.PROJECT_ID,
        gcc.FILE,
        szz.FAULT_INDUCING_COMMIT_HASH,
        szz.FAULT_FIXING_COMMIT_HASH,
        gc_induce.COMMITTER_DATE  AS INDUCING_DATE,
        gc_fix.COMMITTER_DATE     AS FIXING_DATE
    FROM SZZ_FAULT_INDUCING_COMMITS szz
    -- Join to get FILES touched by the inducing commit
    JOIN GIT_COMMITS_CHANGES gcc
        ON  szz.PROJECT_ID = gcc.PROJECT_ID
        AND szz.FAULT_INDUCING_COMMIT_HASH = gcc.COMMIT_HASH
    -- Join to get the DATE of the inducing commit
    JOIN GIT_COMMITS gc_induce
        ON  szz.PROJECT_ID = gc_induce.PROJECT_ID
        AND szz.FAULT_INDUCING_COMMIT_HASH = gc_induce.COMMIT_HASH
    -- Join to get the DATE of the fixing commit
    JOIN GIT_COMMITS gc_fix
        ON  szz.PROJECT_ID = gc_fix.PROJECT_ID
        AND szz.FAULT_FIXING_COMMIT_HASH = gc_fix.COMMIT_HASH
    """
    print("  Querying fault-inducing observations (this may take a minute)...")
    df = pd.read_sql(query, conn)
    print(f"  Raw fault observations: {len(df):,} rows")

    # Parse dates
    df = _parse_dates(df, ["INDUCING_DATE", "FIXING_DATE"])

    # Compute duration in days
    df["DURATION_DAYS"] = (df["FIXING_DATE"] - df["INDUCING_DATE"]).dt.total_seconds() / 86400.0

    # Drop rows with invalid durations (negative or NaN)
    before = len(df)
    df = df[df["DURATION_DAYS"] > 0].copy()
    dropped = before - len(df)
    if dropped > 0:
        print(f"  Dropped {dropped:,} rows with non-positive duration")

    # Aggregate: per (PROJECT, FILE), take the MEDIAN duration across all
    # fault episodes, and count total fault episodes  
    fault_agg = (
        df.groupby(["PROJECT_ID", "FILE"])
        .agg(
            DURATION_DAYS=("DURATION_DAYS", "median"),
            FAULT_EPISODES=("DURATION_DAYS", "count"),
            FIRST_INDUCING_DATE=("INDUCING_DATE", "min"),
            LAST_FIXING_DATE=("FIXING_DATE", "max"),
        )
        .reset_index()
    )
    fault_agg["EVENT"] = 1

    print(f"  Unique (project, file) fault observations: {len(fault_agg):,}")
    return fault_agg


def build_censored_observations(conn: sqlite3.Connection, fault_files: set) -> pd.DataFrame:
    """
    Build right-censored observations (event=0) for files that were
    NEVER involved in a fault-inducing commit.
    
    Duration = project_end_date - file_first_commit_date.
    """
    # Get project end dates (last commit per project)
    project_bounds = pd.read_sql("""
        SELECT PROJECT_ID,
               MIN(COMMITTER_DATE) AS PROJECT_START,
               MAX(COMMITTER_DATE) AS PROJECT_END
        FROM GIT_COMMITS
        GROUP BY PROJECT_ID
    """, conn)
    project_bounds = _parse_dates(project_bounds, ["PROJECT_START", "PROJECT_END"])

    # Get first and last commit date per file
    print("  Querying file commit histories for censored observations...")
    file_dates = pd.read_sql("""
        SELECT PROJECT_ID, FILE,
               MIN(DATE) AS FILE_FIRST_COMMIT,
               MAX(DATE) AS FILE_LAST_COMMIT,
               COUNT(*) AS COMMIT_COUNT
        FROM GIT_COMMITS_CHANGES
        GROUP BY PROJECT_ID, FILE
    """, conn)
    file_dates = _parse_dates(file_dates, ["FILE_FIRST_COMMIT", "FILE_LAST_COMMIT"])
    print(f"  Total unique (project, file) pairs: {len(file_dates):,}")

    # Filter out files that ARE in fault set
    file_dates["_key"] = file_dates["PROJECT_ID"] + "|" + file_dates["FILE"]
    censored = file_dates[~file_dates["_key"].isin(fault_files)].copy()
    censored.drop(columns=["_key"], inplace=True)
    print(f"  Censored (non-fault) files: {len(censored):,}")

    # Merge with project bounds
    censored = censored.merge(project_bounds, on="PROJECT_ID", how="left")

    # Duration = project end - file first commit
    censored["DURATION_DAYS"] = (
        (censored["PROJECT_END"] - censored["FILE_FIRST_COMMIT"]).dt.total_seconds() / 86400.0
    )

    # Drop invalid
    censored = censored[censored["DURATION_DAYS"] > 0].copy()

    censored["EVENT"] = 0
    censored["FAULT_EPISODES"] = 0

    return censored[["PROJECT_ID", "FILE", "DURATION_DAYS", "EVENT", "FAULT_EPISODES"]]


def build_survival_labels() -> pd.DataFrame:
    """Main pipeline: construct survival labels for all files."""
    print(f"Connecting to database: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)

    # Step 1: Fault observations
    print("\n[Step 1/3] Building fault observations (event=1)...")
    fault_df = build_fault_observations(conn)

    # Build the set of fault-affected files for exclusion
    fault_file_keys = set(fault_df["PROJECT_ID"] + "|" + fault_df["FILE"])

    # Step 2: Censored observations
    print("\n[Step 2/3] Building censored observations (event=0)...")
    censored_df = build_censored_observations(conn, fault_file_keys)

    conn.close()

    # Step 3: Combine
    print("\n[Step 3/3] Combining...")
    fault_out = fault_df[["PROJECT_ID", "FILE", "DURATION_DAYS", "EVENT", "FAULT_EPISODES"]]
    combined = pd.concat([fault_out, censored_df], ignore_index=True)

    # Summary statistics
    print(f"\n{'='*50}")
    print(f"Survival Labels Summary")
    print(f"{'='*50}")
    print(f"  Total observations:  {len(combined):,}")
    print(f"  Fault events (1):    {(combined['EVENT']==1).sum():,}")
    print(f"  Censored (0):        {(combined['EVENT']==0).sum():,}")
    print(f"  Event rate:          {combined['EVENT'].mean():.2%}")
    print(f"  Duration (median):   {combined['DURATION_DAYS'].median():.1f} days")
    print(f"  Duration (mean):     {combined['DURATION_DAYS'].mean():.1f} days")
    print(f"  Projects:            {combined['PROJECT_ID'].nunique()}")

    return combined


if __name__ == "__main__":
    df = build_survival_labels()

    # Save
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    df.to_csv(OUTPUT_PATH, index=False)
    print(f"\n[OK] Saved survival labels to: {OUTPUT_PATH}")
    print(f"   Shape: {df.shape}")
