"""
Phase 4: Model Training, Comparison & ROI Scoring
====================================================
Trains three models on the final training set:
  1. Cox Proportional Hazards  (lifelines)
  2. Random Forest Classifier  (sklearn)
  3. Logistic Regression        (sklearn)

Compares them using: C-index, AUC-ROC, Precision@K, Recall@K, Brier Score.
Computes ROI scores for refactoring priorities.
Generates comparison plots.
"""

import os
import sys
import warnings
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns

from lifelines import CoxPHFitter, KaplanMeierFitter
from lifelines.utils import concordance_index
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    roc_auc_score, roc_curve, precision_score, recall_score,
    brier_score_loss, classification_report
)

warnings.filterwarnings("ignore", category=FutureWarning)

# ── Paths ────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
DATA_PATH = os.path.join(PROJECT_ROOT, "data", "final_training_set.csv")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "results")


# ── Feature Columns ─────────────────────────────────────────────────────
FEATURE_COLS = [
    "total_lines_added", "total_lines_removed", "commit_count", "total_churn",
    "num_contributors", "major_contributor_ratio",
    "bug_count", "vulnerability_count", "code_smell_count",
    "total_debt_minutes", "avg_severity_score",
    "sqale_index", "cognitive_complexity", "complexity",
]

# Failure horizon in days for binary classification conversion
FAILURE_HORIZON = 365  # 1 year


def load_and_prepare_data():
    """Load dataset and create train/test split + binary target."""
    print(f"Loading data from {DATA_PATH}...")
    df = pd.read_csv(DATA_PATH)
    print(f"  Shape: {df.shape}")

    # Drop rows with zero or near-zero duration (noise)
    df = df[df["DURATION_DAYS"] > 1].copy()

    # Binary target for RF/LR: did the file fail within FAILURE_HORIZON days?
    df["FAILED_WITHIN_HORIZON"] = (
        (df["EVENT"] == 1) & (df["DURATION_DAYS"] <= FAILURE_HORIZON)
    ).astype(int)

    # Remove constant features (coverage, refactoring_count are all 0)
    valid_features = []
    for col in FEATURE_COLS:
        if col in df.columns and df[col].std() > 0:
            valid_features.append(col)
        else:
            print(f"  Dropping constant feature: {col}")

    print(f"  Using {len(valid_features)} features: {valid_features}")
    print(f"  Failure horizon: {FAILURE_HORIZON} days")
    print(f"  Binary target distribution:")
    print(f"    FAILED_WITHIN_HORIZON=1: {df['FAILED_WITHIN_HORIZON'].sum():,} "
          f"({df['FAILED_WITHIN_HORIZON'].mean():.1%})")
    print(f"    FAILED_WITHIN_HORIZON=0: {(~df['FAILED_WITHIN_HORIZON'].astype(bool)).sum():,}")

    # ── Temporal split ──────────────────────────────────────────────────
    # Use first 70% of data as train, last 30% as test (sorted by duration
    # proxy — this is already ordered somewhat temporally)
    # A cleaner approach: use project-based split
    projects = df["PROJECT_ID"].unique()
    np.random.seed(42)
    np.random.shuffle(projects)
    split_idx = int(len(projects) * 0.7)
    train_projects = set(projects[:split_idx])
    test_projects = set(projects[split_idx:])

    train_mask = df["PROJECT_ID"].isin(train_projects)
    test_mask = df["PROJECT_ID"].isin(test_projects)

    train_df = df[train_mask].copy()
    test_df = df[test_mask].copy()

    print(f"\n  Train: {len(train_df):,} rows ({len(train_projects)} projects)")
    print(f"  Test:  {len(test_df):,} rows ({len(test_projects)} projects)")

    return train_df, test_df, valid_features


# ═══════════════════════════════════════════════════════════════════════
# Model 1: Cox Proportional Hazards
# ═══════════════════════════════════════════════════════════════════════

def train_cox(train_df, test_df, features):
    """Train Cox PH model and return predictions."""
    print("\n" + "="*60)
    print("MODEL 1: Cox Proportional Hazards")
    print("="*60)

    # Prepare data for lifelines
    cox_cols = features + ["DURATION_DAYS", "EVENT"]
    train_cox = train_df[cox_cols].copy()
    test_cox = test_df[cox_cols].copy()

    # Scale features for numeric stability
    scaler = StandardScaler()
    train_cox[features] = scaler.fit_transform(train_cox[features])
    test_cox[features] = scaler.transform(test_cox[features])

    # Handle any remaining NaN/inf
    train_cox = train_cox.replace([np.inf, -np.inf], np.nan).dropna()
    test_cox = test_cox.replace([np.inf, -np.inf], np.nan).dropna()

    # Fit Cox model
    cph = CoxPHFitter(penalizer=0.01)
    print("  Fitting Cox PH model...")
    cph.fit(train_cox, duration_col="DURATION_DAYS", event_col="EVENT")

    # Print summary
    print("\n  Hazard Ratios (top features by |coef|):")
    summary = cph.summary.sort_values("coef", key=abs, ascending=False)
    for idx, row in summary.head(10).iterrows():
        hr = np.exp(row["coef"])
        print(f"    {idx:35s}  coef={row['coef']:+.4f}  HR={hr:.4f}  p={row['p']:.4f}")

    # Predictions
    # Survival probability at the failure horizon
    surv_funcs = cph.predict_survival_function(test_cox[features], times=[FAILURE_HORIZON])
    test_survival_prob = surv_funcs.iloc[0].values  # P(survive past horizon)
    test_failure_prob = 1 - test_survival_prob       # P(fail within horizon)

    # C-index on test set
    c_index = concordance_index(
        test_cox["DURATION_DAYS"], 
        -cph.predict_partial_hazard(test_cox[features]).values.flatten(),
        test_cox["EVENT"]
    )
    print(f"\n  C-index (test): {c_index:.4f}")

    return cph, test_failure_prob, c_index, scaler


# ═══════════════════════════════════════════════════════════════════════
# Model 2: Random Forest
# ═══════════════════════════════════════════════════════════════════════

def train_random_forest(train_df, test_df, features):
    """Train Random Forest and return predictions."""
    print("\n" + "="*60)
    print("MODEL 2: Random Forest Classifier")
    print("="*60)

    X_train = train_df[features].fillna(0)
    y_train = train_df["FAILED_WITHIN_HORIZON"]
    X_test = test_df[features].fillna(0)

    rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=15,
        min_samples_split=20,
        min_samples_leaf=10,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    print("  Fitting Random Forest...")
    rf.fit(X_train, y_train)

    # Predictions
    y_prob = rf.predict_proba(X_test)[:, 1]

    # Feature importance
    importances = pd.Series(rf.feature_importances_, index=features).sort_values(ascending=False)
    print("\n  Feature Importances (top 10):")
    for feat, imp in importances.head(10).items():
        print(f"    {feat:35s}  {imp:.4f}")

    return rf, y_prob, importances


# ═══════════════════════════════════════════════════════════════════════
# Model 3: Logistic Regression
# ═══════════════════════════════════════════════════════════════════════

def train_logistic_regression(train_df, test_df, features):
    """Train Logistic Regression and return predictions."""
    print("\n" + "="*60)
    print("MODEL 3: Logistic Regression")
    print("="*60)

    scaler = StandardScaler()
    X_train = scaler.fit_transform(train_df[features].fillna(0))
    y_train = train_df["FAILED_WITHIN_HORIZON"]
    X_test = scaler.transform(test_df[features].fillna(0))

    lr = LogisticRegression(
        max_iter=1000,
        class_weight="balanced",
        random_state=42,
    )
    print("  Fitting Logistic Regression...")
    lr.fit(X_train, y_train)

    # Predictions
    y_prob = lr.predict_proba(X_test)[:, 1]

    # Coefficients
    coefs = pd.Series(lr.coef_[0], index=features).sort_values(key=abs, ascending=False)
    print("\n  Coefficients (top 10 by |coef|):")
    for feat, coef in coefs.head(10).items():
        print(f"    {feat:35s}  {coef:+.4f}")

    return lr, y_prob, coefs


# ═══════════════════════════════════════════════════════════════════════
# Evaluation & Comparison
# ═══════════════════════════════════════════════════════════════════════

def precision_at_k(y_true, y_prob, k):
    """Precision at top-K predictions."""
    top_k_idx = np.argsort(y_prob)[-k:]
    return y_true.iloc[top_k_idx].mean()

def recall_at_k(y_true, y_prob, k):
    """Recall at top-K predictions."""
    top_k_idx = np.argsort(y_prob)[-k:]
    if y_true.sum() == 0:
        return 0.0
    return y_true.iloc[top_k_idx].sum() / y_true.sum()


def evaluate_and_compare(test_df, cox_probs, rf_probs, lr_probs, cox_c_index):
    """Compare all three models on the same test set."""
    print("\n" + "="*60)
    print("MODEL COMPARISON")
    print("="*60)

    y_true = test_df["FAILED_WITHIN_HORIZON"].reset_index(drop=True)
    K = min(500, len(y_true) // 10)  # Top-K for precision/recall

    results = {}

    for name, probs in [("Cox PH", cox_probs), ("Random Forest", rf_probs), ("Logistic Regression", lr_probs)]:
        probs_series = pd.Series(probs).reset_index(drop=True)

        # Handle NaN in probabilities
        valid_mask = ~probs_series.isna()
        y_true_valid = y_true[valid_mask]
        probs_valid = probs_series[valid_mask]

        auc = roc_auc_score(y_true_valid, probs_valid) if y_true_valid.nunique() > 1 else 0
        brier = brier_score_loss(y_true_valid, probs_valid)
        p_at_k = precision_at_k(y_true_valid, probs_valid.values, K)
        r_at_k = recall_at_k(y_true_valid, probs_valid.values, K)

        results[name] = {
            "AUC-ROC": auc,
            "Brier Score": brier,
            f"Precision@{K}": p_at_k,
            f"Recall@{K}": r_at_k,
        }

    # Add C-index for Cox
    results["Cox PH"]["C-index"] = cox_c_index

    # Print comparison table
    results_df = pd.DataFrame(results).T
    print(f"\n  Evaluation Metrics (failure horizon = {FAILURE_HORIZON} days, K = {K}):\n")
    print(results_df.round(4).to_string())

    return results_df


# ═══════════════════════════════════════════════════════════════════════
# ROI Scoring
# ═══════════════════════════════════════════════════════════════════════

def compute_roi_scores(test_df, failure_probs, model_name="Cox PH"):
    """
    ROI(file) = [P(failure) * estimated_bug_fix_cost] / estimated_refactoring_cost
    
    Proxies:
      - bug_fix_cost ~ total_debt_minutes (Sonar debt = effort to fix)
      - refactoring_cost ~ total_churn + complexity (effort to change)
    """
    print(f"\n  Computing ROI scores using {model_name} predictions...")
    roi_df = test_df[["PROJECT_ID", "FILE", "total_debt_minutes", "total_churn",
                       "complexity", "DURATION_DAYS", "EVENT"]].copy()
    roi_df["failure_prob"] = failure_probs

    # Estimated cost proxies
    roi_df["bug_fix_cost"] = roi_df["total_debt_minutes"].clip(lower=1)
    roi_df["refactoring_cost"] = (roi_df["total_churn"].clip(lower=1) + 
                                   roi_df["complexity"].clip(lower=1))

    # ROI = expected loss avoided / cost to refactor
    roi_df["ROI_SCORE"] = (
        roi_df["failure_prob"] * roi_df["bug_fix_cost"]
    ) / roi_df["refactoring_cost"]

    roi_df = roi_df.sort_values("ROI_SCORE", ascending=False)

    print(f"\n  Top 20 Files by ROI Score ({model_name}):")
    print(f"  {'PROJECT':<30} {'FILE':<40} {'ROI':>8} {'P(fail)':>8} {'Debt(min)':>10}")
    print(f"  {'-'*96}")
    for _, row in roi_df.head(20).iterrows():
        print(f"  {row['PROJECT_ID']:<30} {row['FILE']:<40} "
              f"{row['ROI_SCORE']:>8.4f} {row['failure_prob']:>8.4f} "
              f"{row['total_debt_minutes']:>10.0f}")

    return roi_df


# ═══════════════════════════════════════════════════════════════════════
# Visualization
# ═══════════════════════════════════════════════════════════════════════

def generate_plots(test_df, cox_probs, rf_probs, lr_probs, 
                   rf_importances, results_df, roi_df):
    """Generate all comparison and analysis plots."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    y_true = test_df["FAILED_WITHIN_HORIZON"].reset_index(drop=True)

    # ── 1. ROC Curves ──────────────────────────────────────────────────
    fig, ax = plt.subplots(figsize=(8, 6))
    for name, probs in [("Cox PH", cox_probs), ("Random Forest", rf_probs), 
                         ("Logistic Regression", lr_probs)]:
        probs_clean = pd.Series(probs).fillna(0).values
        fpr, tpr, _ = roc_curve(y_true, probs_clean)
        auc = roc_auc_score(y_true, probs_clean)
        ax.plot(fpr, tpr, label=f"{name} (AUC={auc:.3f})", linewidth=2)
    ax.plot([0, 1], [0, 1], "k--", alpha=0.5, label="Random")
    ax.set_xlabel("False Positive Rate", fontsize=12)
    ax.set_ylabel("True Positive Rate", fontsize=12)
    ax.set_title(f"ROC Curve Comparison (Horizon = {FAILURE_HORIZON} days)", fontsize=14)
    ax.legend(fontsize=11)
    ax.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "roc_comparison.png"), dpi=150)
    plt.close()
    print("  Saved: roc_comparison.png")

    # ── 2. Feature Importance (RF) ─────────────────────────────────────
    fig, ax = plt.subplots(figsize=(10, 6))
    rf_importances.head(12).plot(kind="barh", ax=ax, color="steelblue")
    ax.set_xlabel("Importance", fontsize=12)
    ax.set_title("Random Forest Feature Importance", fontsize=14)
    ax.invert_yaxis()
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "feature_importance_rf.png"), dpi=150)
    plt.close()
    print("  Saved: feature_importance_rf.png")

    # ── 3. Metrics Comparison Bar Chart ─────────────────────────────────
    fig, ax = plt.subplots(figsize=(10, 6))
    plot_cols = [c for c in results_df.columns if c != "C-index"]
    results_df[plot_cols].plot(kind="bar", ax=ax)
    ax.set_ylabel("Score", fontsize=12)
    ax.set_title("Model Comparison Metrics", fontsize=14)
    ax.set_xticklabels(results_df.index, rotation=0)
    ax.legend(fontsize=10)
    ax.grid(axis="y", alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "metrics_comparison.png"), dpi=150)
    plt.close()
    print("  Saved: metrics_comparison.png")

    # ── 4. Kaplan-Meier Survival Curve ──────────────────────────────────
    fig, ax = plt.subplots(figsize=(10, 6))
    kmf = KaplanMeierFitter()
    
    # Split by event for KM curve
    for label, group in test_df.groupby("EVENT"):
        kmf.fit(group["DURATION_DAYS"], event_observed=group["EVENT"],
                label=f"Event={label}")
        kmf.plot_survival_function(ax=ax)
    
    ax.set_xlabel("Days", fontsize=12)
    ax.set_ylabel("Survival Probability", fontsize=12)
    ax.set_title("Kaplan-Meier Survival Curve (Test Set)", fontsize=14)
    ax.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "kaplan_meier.png"), dpi=150)
    plt.close()
    print("  Saved: kaplan_meier.png")

    # ── 5. ROI Score Distribution ──────────────────────────────────────
    fig, ax = plt.subplots(figsize=(8, 5))
    roi_valid = roi_df["ROI_SCORE"][roi_df["ROI_SCORE"].between(0, roi_df["ROI_SCORE"].quantile(0.95))]
    ax.hist(roi_valid, bins=50, color="darkorange", edgecolor="black", alpha=0.7)
    ax.set_xlabel("ROI Score", fontsize=12)
    ax.set_ylabel("Count", fontsize=12)
    ax.set_title("Distribution of ROI Scores (Top 95%)", fontsize=14)
    ax.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "roi_distribution.png"), dpi=150)
    plt.close()
    print("  Saved: roi_distribution.png")


# ═══════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════

def main():
    # Load data
    train_df, test_df, features = load_and_prepare_data()

    # Train models
    cph, cox_probs, cox_c_index, cox_scaler = train_cox(train_df, test_df, features)
    rf, rf_probs, rf_importances = train_random_forest(train_df, test_df, features)
    lr, lr_probs, lr_coefs = train_logistic_regression(train_df, test_df, features)

    # Compare
    results_df = evaluate_and_compare(test_df, cox_probs, rf_probs, lr_probs, cox_c_index)

    # ROI scores (using Cox predictions as primary)
    roi_df = compute_roi_scores(test_df.reset_index(drop=True), cox_probs, "Cox PH")

    # Generate plots
    print("\nGenerating plots...")
    generate_plots(test_df, cox_probs, rf_probs, lr_probs,
                   rf_importances, results_df, roi_df)

    # Save results
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    results_df.to_csv(os.path.join(OUTPUT_DIR, "model_comparison.csv"))
    roi_df.to_csv(os.path.join(OUTPUT_DIR, "roi_scores.csv"), index=False)
    print(f"\n[OK] All results saved to: {OUTPUT_DIR}/")

    return results_df


if __name__ == "__main__":
    main()
