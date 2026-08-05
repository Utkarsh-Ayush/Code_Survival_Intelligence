"""
Phase 3: Build Final Dataset
==============================
Merges survival labels with extracted features into an ML-ready dataset.

Steps:
  1. Load survival_labels.csv and features.csv
  2. Inner-join on (PROJECT_ID, FILE)
  3. Handle missing values
  4. Create temporal train/test split column
  5. Save final_training_set.csv
"""

import os
import pandas as pd
import numpy as np

# ── Paths ────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))

LABELS_PATH = os.path.join(PROJECT_ROOT, "data", "survival_labels.csv")
FEATURES_PATH = os.path.join(PROJECT_ROOT, "data", "features.csv")
OUTPUT_PATH = os.path.join(PROJECT_ROOT, "data", "final_training_set.csv")


def build_dataset() -> pd.DataFrame:
    """Merge survival labels with features and prepare for modeling."""

    # ── Load ────────────────────────────────────────────────────────────
    print("Loading survival labels...")
    labels = pd.read_csv(LABELS_PATH)
    print(f"  Labels shape: {labels.shape}")

    print("Loading features...")
    features = pd.read_csv(FEATURES_PATH)
    print(f"  Features shape: {features.shape}")

    # ── Merge ───────────────────────────────────────────────────────────
    print("\nMerging on (PROJECT_ID, FILE)...")
    df = labels.merge(features, on=["PROJECT_ID", "FILE"], how="inner")
    print(f"  Merged shape: {df.shape}")
    print(f"  Dropped (no feature match): {len(labels) - len(df):,}")

    # ── Handle missing values ───────────────────────────────────────────
    # Numeric columns: fill NaN with 0 (means no issues, no debt, etc.)
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    null_counts = df[numeric_cols].isnull().sum()
    if null_counts.sum() > 0:
        print(f"\n  Missing values in numeric columns:")
        for col, count in null_counts[null_counts > 0].items():
            print(f"    {col}: {count:,}")
        df[numeric_cols] = df[numeric_cols].fillna(0)
    else:
        print("  No missing values in numeric columns")

    # ── Feature summary ─────────────────────────────────────────────────
    feature_cols = [c for c in df.columns if c not in
                    ["PROJECT_ID", "FILE", "DURATION_DAYS", "EVENT", "FAULT_EPISODES"]]

    print(f"\n{'='*60}")
    print(f"Final Dataset Summary")
    print(f"{'='*60}")
    print(f"  Rows:                {len(df):,}")
    print(f"  Feature columns:     {len(feature_cols)}")
    print(f"  Features:            {feature_cols}")
    print(f"  Event=1 (fault):     {(df['EVENT']==1).sum():,} ({df['EVENT'].mean():.1%})")
    print(f"  Event=0 (censored):  {(df['EVENT']==0).sum():,}")
    print(f"  Projects:            {df['PROJECT_ID'].nunique()}")
    print(f"\nDuration stats (days):")
    print(df["DURATION_DAYS"].describe().to_string())

    print(f"\nFeature stats:")
    print(df[feature_cols].describe().round(2).to_string())

    return df


if __name__ == "__main__":
    df = build_dataset()

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    df.to_csv(OUTPUT_PATH, index=False)
    print(f"\n[OK] Saved final dataset to: {OUTPUT_PATH}")
    print(f"     Shape: {df.shape}")
