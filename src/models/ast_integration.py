"""
Integrate AST features with the survival model and compare performance.
Merges time-traveled AST features with the existing training set,
retrains Cox PH with combined features, and reports C-index improvement.
"""

import os
import sys
import pandas as pd
import numpy as np
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data"
RESULTS_DIR = PROJECT_ROOT / "results"

def main():
    print("=" * 60)
    print("AST FEATURE INTEGRATION & MODEL COMPARISON")
    print("=" * 60)

    # ── Load datasets ───────────────────────────────────────────
    print("\n[1/5] Loading datasets...")
    train_df = pd.read_csv(DATA_DIR / "final_training_set.csv")
    ast_df = pd.read_csv(DATA_DIR / "ast_features_timetraveled.csv")

    print(f"  Training set:  {train_df.shape[0]:,} rows × {train_df.shape[1]} cols")
    print(f"  AST features:  {ast_df.shape[0]:,} rows × {ast_df.shape[1]} cols")

    # Filter training set to only the 2 repos we have AST data for
    target_projects = ast_df["PROJECT_ID"].unique().tolist()
    train_subset = train_df[train_df["PROJECT_ID"].isin(target_projects)].copy()
    print(f"  Training subset ({len(target_projects)} repos): {len(train_subset):,} rows")

    # ── Aggregate AST features per (PROJECT_ID, FILE) ───────────
    # The AST data has multiple rows per file (one per fault commit).
    # Aggregate: take the MEAN for continuous features (captures the
    # file's structural state across its history).
    print("\n[2/5] Aggregating AST features per file...")

    ast_feature_cols = [
        "total_lines", "num_classes", "num_interfaces", "num_methods",
        "avg_method_length", "max_method_length", "max_nesting_depth",
        "import_count", "object_creation_count", "has_inheritance",
        "implements_count", "empty_catch_blocks", "try_count", "catch_count",
        "assert_count", "return_count", "lambda_count", "control_flow_count",
        "comment_lines", "comment_density",
    ]

    ast_agg = (
        ast_df.groupby(["PROJECT_ID", "FILE"])[ast_feature_cols]
        .mean()
        .reset_index()
    )
    # Prefix AST columns to avoid clashes
    rename_map = {col: f"ast_{col}" for col in ast_feature_cols}
    ast_agg.rename(columns=rename_map, inplace=True)

    print(f"  Aggregated to {len(ast_agg):,} unique (project, file) pairs")

    # ── Merge ───────────────────────────────────────────────────
    print("\n[3/5] Merging AST features with training data...")
    merged = train_subset.merge(ast_agg, on=["PROJECT_ID", "FILE"], how="inner")
    print(f"  Merged rows: {len(merged):,} (inner join)")
    print(f"  Merged cols: {merged.shape[1]}")

    if len(merged) < 100:
        print("\n[ERROR] Too few merged rows. Check join keys.")
        # Debug: show sample keys
        print("  Training FILE samples:", train_subset["FILE"].head(5).tolist())
        print("  AST FILE samples:", ast_agg["FILE"].head(5).tolist())
        sys.exit(1)

    # ── Train models ────────────────────────────────────────────
    print("\n[4/5] Training models...")
    from lifelines import CoxPHFitter
    from sklearn.model_selection import train_test_split

    # Original features (what we had before)
    original_features = [
        "total_lines_added", "total_lines_removed", "commit_count",
        "total_churn", "num_contributors", "major_contributor_ratio",
        "bug_count", "vulnerability_count", "code_smell_count",
        "total_debt_minutes", "avg_severity_score",
        "sqale_index", "cognitive_complexity", "complexity",
    ]

    # New AST features
    new_ast_features = [f"ast_{c}" for c in ast_feature_cols]

    # Combined features
    combined_features = original_features + new_ast_features

    # Ensure no NaNs/infinities
    for col in combined_features:
        if col in merged.columns:
            merged[col] = merged[col].fillna(0)
            merged[col] = merged[col].replace([np.inf, -np.inf], 0)

    # Train/test split (same random state for fair comparison)
    train, test = train_test_split(merged, test_size=0.33, random_state=42,
                                    stratify=merged["EVENT"])

    print(f"  Train: {len(train):,} | Test: {len(test):,}")

    # ── Model A: Original features only ─────────────────────────
    print("\n  Training Model A: Original features only...")
    cph_original = CoxPHFitter(penalizer=0.01)
    train_a = train[original_features + ["DURATION_DAYS", "EVENT"]].copy()
    test_a = test[original_features + ["DURATION_DAYS", "EVENT"]].copy()

    cph_original.fit(train_a, duration_col="DURATION_DAYS", event_col="EVENT")
    c_original = cph_original.concordance_index_
    print(f"    C-index (train): {c_original:.4f}")
    c_original_test = cph_original.score(test_a, scoring_method="concordance_index")
    print(f"    C-index (test):  {c_original_test:.4f}")

    # ── Model B: AST features only ──────────────────────────────
    print("\n  Training Model B: AST features only...")
    cph_ast = CoxPHFitter(penalizer=0.01)
    available_ast = [c for c in new_ast_features if c in merged.columns]
    train_b = train[available_ast + ["DURATION_DAYS", "EVENT"]].copy()
    test_b = test[available_ast + ["DURATION_DAYS", "EVENT"]].copy()

    cph_ast.fit(train_b, duration_col="DURATION_DAYS", event_col="EVENT")
    c_ast = cph_ast.concordance_index_
    print(f"    C-index (train): {c_ast:.4f}")
    c_ast_test = cph_ast.score(test_b, scoring_method="concordance_index")
    print(f"    C-index (test):  {c_ast_test:.4f}")

    # ── Model C: Combined (Original + AST) ──────────────────────
    print("\n  Training Model C: Combined (Original + AST)...")
    cph_combined = CoxPHFitter(penalizer=0.01)
    available_combined = [c for c in combined_features if c in merged.columns]
    train_c = train[available_combined + ["DURATION_DAYS", "EVENT"]].copy()
    test_c = test[available_combined + ["DURATION_DAYS", "EVENT"]].copy()

    cph_combined.fit(train_c, duration_col="DURATION_DAYS", event_col="EVENT")
    c_combined = cph_combined.concordance_index_
    print(f"    C-index (train): {c_combined:.4f}")
    c_combined_test = cph_combined.score(test_c, scoring_method="concordance_index")
    print(f"    C-index (test):  {c_combined_test:.4f}")

    # ── Results ─────────────────────────────────────────────────
    print(f"\n{'=' * 60}")
    print(f"RESULTS: C-INDEX COMPARISON")
    print(f"{'=' * 60}")
    print(f"  {'Model':<30} {'Train':>8} {'Test':>8}")
    print(f"  {'-'*46}")
    print(f"  {'A: Original (DB metrics)':<30} {c_original:>8.4f} {c_original_test:>8.4f}")
    print(f"  {'B: AST only':<30} {c_ast:>8.4f} {c_ast_test:>8.4f}")
    print(f"  {'C: Combined (DB + AST)':<30} {c_combined:>8.4f} {c_combined_test:>8.4f}")

    improvement = c_combined_test - c_original_test
    print(f"\n  Improvement (C vs A, test): {improvement:+.4f} ({improvement/c_original_test*100:+.1f}%)")

    if improvement > 0:
        print(f"  [OK] AST features IMPROVED the model!")
    else:
        print(f"  [--] AST features did not improve test performance.")

    # ── Top AST feature coefficients ────────────────────────────
    print(f"\n{'=' * 60}")
    print(f"TOP AST FEATURE COEFFICIENTS (Combined Model)")
    print(f"{'=' * 60}")
    summary = cph_combined.summary
    ast_rows = summary[summary.index.str.startswith("ast_")]
    ast_rows = ast_rows.sort_values("coef", key=abs, ascending=False)
    print(ast_rows[["coef", "exp(coef)", "p"]].head(10).to_string())

    # ── Save comparison ─────────────────────────────────────────
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    comparison = pd.DataFrame({
        "Model": ["A: Original (DB metrics)", "B: AST only", "C: Combined (DB + AST)"],
        "C-index (train)": [c_original, c_ast, c_combined],
        "C-index (test)": [c_original_test, c_ast_test, c_combined_test],
    })
    comparison.to_csv(RESULTS_DIR / "ast_integration_comparison.csv", index=False)
    print(f"\n[OK] Saved comparison to: {RESULTS_DIR / 'ast_integration_comparison.csv'}")

    # ── Visualization ───────────────────────────────────────────
    print("\n[5/5] Generating comparison plot...")
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    # Bar chart: C-index comparison
    ax = axes[0]
    models = ["Original\n(DB metrics)", "AST\nonly", "Combined\n(DB + AST)"]
    train_scores = [c_original, c_ast, c_combined]
    test_scores = [c_original_test, c_ast_test, c_combined_test]
    x = range(len(models))
    bars1 = ax.bar([i - 0.15 for i in x], train_scores, 0.3, label="Train", color="#4A90D9")
    bars2 = ax.bar([i + 0.15 for i in x], test_scores, 0.3, label="Test", color="#E8744A")
    ax.set_ylabel("C-index")
    ax.set_title("Cox PH: C-index Comparison")
    ax.set_xticks(x)
    ax.set_xticklabels(models)
    ax.legend()
    ax.set_ylim(0.5, max(max(train_scores), max(test_scores)) + 0.05)
    for bar in bars1 + bars2:
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.005,
                f"{bar.get_height():.3f}", ha="center", va="bottom", fontsize=9)

    # Horizontal bar: top AST coefficients
    ax2 = axes[1]
    top_ast = ast_rows.head(10)
    colors = ["#E8744A" if c > 0 else "#4A90D9" for c in top_ast["coef"]]
    labels = [n.replace("ast_", "") for n in top_ast.index]
    ax2.barh(range(len(labels)), top_ast["coef"], color=colors)
    ax2.set_yticks(range(len(labels)))
    ax2.set_yticklabels(labels)
    ax2.invert_yaxis()
    ax2.set_xlabel("Cox PH Coefficient")
    ax2.set_title("Top AST Feature Hazard Coefficients")
    ax2.axvline(0, color="black", linewidth=0.5)

    plt.tight_layout()
    plot_path = RESULTS_DIR / "ast_integration_comparison.png"
    plt.savefig(plot_path, dpi=150, bbox_inches="tight")
    print(f"  Saved: {plot_path}")


if __name__ == "__main__":
    main()
