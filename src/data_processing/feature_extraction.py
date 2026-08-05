"""
Phase 2: Feature Extraction (DB-Only)
======================================
Extracts features per (PROJECT_ID, FILE) from the database:

1. Churn features     - lines added/removed, commit count
2. Ownership features - number of contributors, major contributor ratio
3. Sonar TD features  - bug/vulnerability/smell counts, debt minutes (from SONAR_ISSUES)
4. Refactoring history - count of refactorings per file (from REFACTORING_MINER)
"""

import os
import sys
import sqlite3
import pandas as pd
import numpy as np

# ── Paths ────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
DB_PATH = os.path.join(PROJECT_ROOT, "data", "td_V2.db")
OUTPUT_PATH = os.path.join(PROJECT_ROOT, "data", "features.csv")


# ── 1. Churn Features ───────────────────────────────────────────────────

def extract_churn_features(conn: sqlite3.Connection) -> pd.DataFrame:
    """
    Per (PROJECT_ID, FILE):
      - total_lines_added
      - total_lines_removed
      - total_churn (added + removed)
      - commit_count
    """
    print("  Extracting churn features from GIT_COMMITS_CHANGES...")
    query = """
    SELECT
        PROJECT_ID,
        FILE,
        SUM(CAST(LINES_ADDED AS INTEGER))   AS total_lines_added,
        SUM(CAST(LINES_REMOVED AS INTEGER)) AS total_lines_removed,
        COUNT(DISTINCT COMMIT_HASH)          AS commit_count
    FROM GIT_COMMITS_CHANGES
    GROUP BY PROJECT_ID, FILE
    """
    df = pd.read_sql(query, conn)
    df["total_lines_added"] = df["total_lines_added"].fillna(0).astype(int)
    df["total_lines_removed"] = df["total_lines_removed"].fillna(0).astype(int)
    df["total_churn"] = df["total_lines_added"] + df["total_lines_removed"]
    print(f"    -> {len(df):,} (project, file) pairs")
    return df


# ── 2. Ownership Features ──────────────────────────────────────────────

def extract_ownership_features(conn: sqlite3.Connection) -> pd.DataFrame:
    """
    Per (PROJECT_ID, FILE):
      - num_contributors        : distinct committers who touched this file
      - major_contributor_ratio  : fraction of commits by the top committer
    """
    print("  Extracting ownership features...")
    # Get per-file, per-committer commit counts
    query = """
    SELECT
        PROJECT_ID,
        FILE,
        COMMITTER_ID,
        COUNT(*) AS commits_by_author
    FROM GIT_COMMITS_CHANGES
    GROUP BY PROJECT_ID, FILE, COMMITTER_ID
    """
    df = pd.read_sql(query, conn)

    # Aggregate per file
    file_stats = (
        df.groupby(["PROJECT_ID", "FILE"])
        .agg(
            num_contributors=("COMMITTER_ID", "nunique"),
            total_commits=("commits_by_author", "sum"),
            max_author_commits=("commits_by_author", "max"),
        )
        .reset_index()
    )
    file_stats["major_contributor_ratio"] = (
        file_stats["max_author_commits"] / file_stats["total_commits"]
    )
    file_stats.drop(columns=["total_commits", "max_author_commits"], inplace=True)

    print(f"    -> {len(file_stats):,} (project, file) pairs")
    return file_stats


# ── 3. SonarQube Issue Features (file-level) ───────────────────────────

def extract_sonar_issue_features(conn: sqlite3.Connection) -> pd.DataFrame:
    """
    Per (PROJECT_ID, FILE basename):
      - bug_count, vulnerability_count, code_smell_count
      - total_debt_minutes
      - avg_severity_score (BLOCKER=5, CRITICAL=4, MAJOR=3, MINOR=2, INFO=1)
    
    SONAR_ISSUES.COMPONENT uses 'ProjectKey:path/to/File.java' format.
    GIT_COMMITS_CHANGES.FILE uses just the filename (e.g., 'File.java').
    We extract the basename from COMPONENT for matching.
    """
    print("  Extracting SonarQube issue features from SONAR_ISSUES...")
    print("  (extracting basename from COMPONENT for matching with GIT files)")

    # We'll do the aggregation in SQL, then extract basename in pandas
    # since SQLite string functions are limited
    query = """
    SELECT
        PROJECT_ID,
        COMPONENT,
        SUM(CASE WHEN TYPE = 'BUG' THEN 1 ELSE 0 END)           AS bug_count,
        SUM(CASE WHEN TYPE = 'VULNERABILITY' THEN 1 ELSE 0 END) AS vulnerability_count,
        SUM(CASE WHEN TYPE = 'CODE_SMELL' THEN 1 ELSE 0 END)    AS code_smell_count,
        SUM(CAST(DEBT AS INTEGER))                                AS total_debt_minutes,
        AVG(CASE
            WHEN SEVERITY = 'BLOCKER'  THEN 5
            WHEN SEVERITY = 'CRITICAL' THEN 4
            WHEN SEVERITY = 'MAJOR'    THEN 3
            WHEN SEVERITY = 'MINOR'    THEN 2
            WHEN SEVERITY = 'INFO'     THEN 1
            ELSE 0
        END) AS avg_severity_score
    FROM SONAR_ISSUES
    GROUP BY PROJECT_ID, COMPONENT
    """
    df = pd.read_sql(query, conn)
    df["total_debt_minutes"] = df["total_debt_minutes"].fillna(0).astype(int)

    # Extract basename from COMPONENT:
    #   "Apache_Cayenne:framework/cayenne/.../SomeFile.java" -> "SomeFile.java"
    df["FILE"] = df["COMPONENT"].apply(
        lambda c: c.rsplit("/", 1)[-1] if "/" in str(c) else str(c).split(":", 1)[-1]
    )

    # Re-aggregate at (PROJECT_ID, FILE-basename) level since multiple 
    # full paths may map to the same basename
    sonar_agg = (
        df.groupby(["PROJECT_ID", "FILE"])
        .agg(
            bug_count=("bug_count", "sum"),
            vulnerability_count=("vulnerability_count", "sum"),
            code_smell_count=("code_smell_count", "sum"),
            total_debt_minutes=("total_debt_minutes", "sum"),
            avg_severity_score=("avg_severity_score", "mean"),
        )
        .reset_index()
    )

    print(f"    -> {len(df):,} raw component-level rows")
    print(f"    -> {len(sonar_agg):,} after basename aggregation")
    return sonar_agg


# ── 4. SonarQube Project-Level Measures ─────────────────────────────────

def extract_sonar_project_features(conn: sqlite3.Connection) -> pd.DataFrame:
    """
    Per PROJECT_ID (latest analysis snapshot):
      - SQALE_INDEX, COGNITIVE_COMPLEXITY, COMPLEXITY, COVERAGE
    
    These are project-level metrics, not file-level. We take the latest
    analysis for each project and broadcast to all files in that project.
    """
    print("  Extracting project-level SonarQube measures...")

    # Get the latest analysis key per project
    query = """
    SELECT sm.PROJECT_ID,
           CAST(sm.SQALE_INDEX AS REAL)           AS sqale_index,
           CAST(sm.COGNITIVE_COMPLEXITY AS REAL)   AS cognitive_complexity,
           CAST(sm.COMPLEXITY AS REAL)             AS complexity,
           CAST(sm.COVERAGE AS REAL)               AS coverage
    FROM SONAR_MEASURES sm
    INNER JOIN (
        SELECT PROJECT_ID, MAX(ANALYSIS_KEY) AS LATEST_KEY
        FROM SONAR_ANALYSIS
        GROUP BY PROJECT_ID
    ) latest ON sm.PROJECT_ID = latest.PROJECT_ID
            AND sm.ANALYSIS_KEY = latest.LATEST_KEY
    """
    df = pd.read_sql(query, conn)
    # Convert columns to numeric, coercing errors
    for col in ["sqale_index", "cognitive_complexity", "complexity", "coverage"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    print(f"    -> {len(df):,} project-level rows")
    return df


# ── 5. Refactoring History ──────────────────────────────────────────────

def extract_refactoring_features(conn: sqlite3.Connection) -> pd.DataFrame:
    """
    Per (PROJECT_ID, FILE):
      - refactoring_count : total number of refactoring operations on this file
    
    REFACTORING_MINER table schema needs inspection for the file column.
    """
    print("  Extracting refactoring features from REFACTORING_MINER...")

    # First check the schema
    schema = pd.read_sql("PRAGMA table_info(REFACTORING_MINER)", conn)
    col_names = schema["name"].tolist()
    print(f"    REFACTORING_MINER columns: {col_names}")

    # Identify the file-path column (varies by dataset version)
    file_col = None
    for candidate in ["FILE_PATH_BEFORE", "FILE", "LEFT_SIDE_FILE", "FILEPATH"]:
        if candidate in col_names:
            file_col = candidate
            break

    if file_col is None:
        print("    [WARN] No file column found in REFACTORING_MINER, skipping.")
        return pd.DataFrame(columns=["PROJECT_ID", "FILE", "refactoring_count"])

    query = f"""
    SELECT PROJECT_ID, {file_col} AS FILE, COUNT(*) AS refactoring_count
    FROM REFACTORING_MINER
    GROUP BY PROJECT_ID, {file_col}
    """
    df = pd.read_sql(query, conn)
    print(f"    -> {len(df):,} (project, file) pairs")
    return df


# ── Main Pipeline ───────────────────────────────────────────────────────

def extract_all_features() -> pd.DataFrame:
    """Run all feature extractors and merge into a single dataframe."""
    print(f"Connecting to database: {DB_PATH}\n")
    conn = sqlite3.connect(DB_PATH)

    # Extract individual feature groups
    print("[1/5] Churn features")
    churn_df = extract_churn_features(conn)

    print("\n[2/5] Ownership features")
    ownership_df = extract_ownership_features(conn)

    print("\n[3/5] SonarQube issue features (file-level)")
    sonar_issues_df = extract_sonar_issue_features(conn)

    print("\n[4/5] SonarQube project measures")
    sonar_proj_df = extract_sonar_project_features(conn)

    print("\n[5/5] Refactoring features")
    refactoring_df = extract_refactoring_features(conn)

    conn.close()

    # ── Merge all features ──────────────────────────────────────────────
    print("\nMerging feature groups...")

    # Start with churn (most complete file list)
    merged = churn_df.copy()

    # Merge ownership
    merged = merged.merge(ownership_df, on=["PROJECT_ID", "FILE"], how="left")

    # Merge sonar issues (file-level) — NOTE: SONAR_ISSUES uses COMPONENT
    # which may have a different path format than GIT_COMMITS_CHANGES FILE.
    # We keep them as a left join; unmatched files get 0.
    merged = merged.merge(sonar_issues_df, on=["PROJECT_ID", "FILE"], how="left")

    # Merge project-level sonar measures (broadcast to all files)
    merged = merged.merge(sonar_proj_df, on="PROJECT_ID", how="left")

    # Merge refactoring
    merged = merged.merge(refactoring_df, on=["PROJECT_ID", "FILE"], how="left")

    # Fill NaN in count/metric columns with 0
    fill_cols = [
        "bug_count", "vulnerability_count", "code_smell_count",
        "total_debt_minutes", "avg_severity_score", "refactoring_count",
    ]
    for col in fill_cols:
        if col in merged.columns:
            merged[col] = merged[col].fillna(0)

    print(f"\nFinal feature matrix: {merged.shape[0]:,} rows x {merged.shape[1]} columns")
    print(f"Columns: {list(merged.columns)}")

    return merged


if __name__ == "__main__":
    df = extract_all_features()

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    df.to_csv(OUTPUT_PATH, index=False)
    print(f"\n[OK] Saved features to: {OUTPUT_PATH}")
    print(f"     Shape: {df.shape}")
