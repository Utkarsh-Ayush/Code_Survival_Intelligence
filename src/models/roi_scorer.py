"""
ROI Scoring Engine
===================
Converts Cox PH survival probabilities into dollar-value ROI scores
for prioritized refactoring recommendations.

The key insight: SonarQube's SQALE debt is measured in minutes of
developer effort. We convert this directly to dollars using industry
standard billing rates to produce financially actionable refactoring plans.

Outputs:
  - Per-file survival curves at multiple horizons (90, 180, 365, 730 days)
  - Dollar-value Expected Loss = P(failure) x Cost_to_fix_bug($)
  - Dollar-value Investment    = Cost_to_refactor($)
  - ROI = (Expected Loss - Investment) / Investment
  - Risk-tier classification (Critical / High / Medium / Low)
  - Ranked refactoring priority list with financial justification
"""

import os
import warnings
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker

from lifelines import CoxPHFitter
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore", category=FutureWarning)

# ── Paths ────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
DATA_PATH = os.path.join(PROJECT_ROOT, "data", "final_training_set.csv")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "results")

# ── Financial Parameters ─────────────────────────────────────────────────
# These are configurable industry-standard assumptions
DEVELOPER_HOURLY_RATE = 75       # USD per hour (mid-level developer)
DOWNTIME_COST_PER_HOUR = 500     # USD per hour of production outage
AVG_OUTAGE_HOURS = 4             # Average hours of downtime per failure incident
OVERHEAD_MULTIPLIER = 1.5        # PM, testing, deployment overhead on refactoring

# ── Horizons to evaluate ─────────────────────────────────────────────────
HORIZONS = [90, 180, 365, 730]   # days

# ── Feature Columns ──────────────────────────────────────────────────────
FEATURE_COLS = [
    "total_lines_added", "total_lines_removed", "commit_count", "total_churn",
    "num_contributors", "major_contributor_ratio",
    "bug_count", "vulnerability_count", "code_smell_count",
    "total_debt_minutes", "avg_severity_score",
    "sqale_index", "cognitive_complexity", "complexity",
]


def load_data():
    """Load the final training set and prepare train/test split."""
    print(f"Loading data from {DATA_PATH}...")
    df = pd.read_csv(DATA_PATH)
    df = df[df["DURATION_DAYS"] > 1].copy()

    # Filter to valid features
    valid_features = [c for c in FEATURE_COLS if c in df.columns and df[c].std() > 0]

    # Project-based split (same seed as train_and_compare.py)
    projects = df["PROJECT_ID"].unique()
    np.random.seed(42)
    np.random.shuffle(projects)
    split_idx = int(len(projects) * 0.7)
    train_projects = set(projects[:split_idx])

    train_df = df[df["PROJECT_ID"].isin(train_projects)].copy()
    test_df = df[~df["PROJECT_ID"].isin(train_projects)].copy()

    print(f"  Train: {len(train_df):,} rows | Test: {len(test_df):,} rows")
    print(f"  Features: {len(valid_features)}")
    return train_df, test_df, valid_features


def train_cox_model(train_df, features):
    """Train Cox PH and return the fitted model + scaler."""
    print("\nTraining Cox PH model...")
    cox_cols = features + ["DURATION_DAYS", "EVENT"]
    train_data = train_df[cox_cols].copy()

    scaler = StandardScaler()
    train_data[features] = scaler.fit_transform(train_data[features])
    train_data = train_data.replace([np.inf, -np.inf], np.nan).dropna()

    cph = CoxPHFitter(penalizer=0.01)
    cph.fit(train_data, duration_col="DURATION_DAYS", event_col="EVENT")
    print(f"  Cox PH trained. Concordance: {cph.concordance_index_:.4f}")
    return cph, scaler


def compute_survival_probabilities(cph, scaler, test_df, features, horizons):
    """
    Compute P(failure within t) for each file at multiple time horizons.

    Returns a DataFrame with columns:
      P_FAIL_90, P_FAIL_180, P_FAIL_365, P_FAIL_730
    """
    print("\nComputing survival probabilities at multiple horizons...")
    test_scaled = test_df[features].copy()
    test_scaled[features] = scaler.transform(test_scaled[features])
    test_scaled = test_scaled.replace([np.inf, -np.inf], np.nan).fillna(0)

    # S(t) = survival probability;  P(fail before t) = 1 - S(t)
    surv = cph.predict_survival_function(test_scaled, times=horizons)

    prob_df = pd.DataFrame(index=test_df.index)
    for t in horizons:
        col_name = f"P_FAIL_{t}"
        prob_df[col_name] = (1 - surv.loc[t]).values
        prob_df[col_name] = prob_df[col_name].clip(0, 1)

    for t in horizons:
        col = f"P_FAIL_{t}"
        print(f"  P(fail within {t:>4d} days):  "
              f"mean={prob_df[col].mean():.4f}  "
              f"median={prob_df[col].median():.4f}  "
              f"max={prob_df[col].max():.4f}")

    return prob_df


def compute_financial_roi(test_df, prob_df, horizons):
    """
    Compute dollar-value ROI for each file.

    Financial Model:
      Cost_of_Bug ($):
        = (SQALE_debt_minutes / 60) * hourly_rate        [direct fix cost]
        + downtime_cost_per_hour * avg_outage_hours       [incident cost]

      Cost_to_Refactor ($):
        = (estimated_refactor_hours) * hourly_rate * overhead_multiplier
        where estimated_refactor_hours ~ (total_debt_minutes / 60) * 0.3
        (rule of thumb: proactive refactoring costs ~30% of reactive fixing)

      Expected Loss ($) = P(failure) * Cost_of_Bug
      ROI = (Expected Loss - Investment) / Investment
      Net Savings ($) = Expected Loss - Investment
    """
    print("\nComputing financial ROI scores...")

    roi = test_df[["PROJECT_ID", "FILE", "DURATION_DAYS", "EVENT",
                    "total_debt_minutes", "total_churn", "complexity",
                    "bug_count", "code_smell_count", "avg_severity_score",
                    "commit_count", "num_contributors"]].copy()

    # ── Merge probability columns ────────────────────────────────────────
    for col in prob_df.columns:
        roi[col] = prob_df[col].values

    # ── Cost of Bug (reactive fix after failure) ─────────────────────────
    # SonarQube SQALE debt = minutes of effort to fix all issues
    # For file-level: use total_debt_minutes if available, else estimate
    # from code_smell_count
    file_debt_minutes = roi["total_debt_minutes"].copy()

    # Files with no Sonar data: estimate from code smells (avg 15 min each)
    no_debt = file_debt_minutes == 0
    file_debt_minutes[no_debt] = roi.loc[no_debt, "code_smell_count"] * 15

    # Still zero? Use a minimum floor based on complexity
    still_zero = file_debt_minutes == 0
    file_debt_minutes[still_zero] = 30  # 30 min minimum

    fix_hours = file_debt_minutes / 60.0
    direct_fix_cost = fix_hours * DEVELOPER_HOURLY_RATE
    incident_cost = DOWNTIME_COST_PER_HOUR * AVG_OUTAGE_HOURS

    # Severity multiplier: critical bugs have higher incident costs
    severity_mult = 1 + (roi["avg_severity_score"] / 5.0)  # 1.0 to 2.0x
    roi["COST_OF_BUG"] = (direct_fix_cost + incident_cost) * severity_mult

    # ── Cost to Refactor (proactive investment) ──────────────────────────
    # Proactive refactoring typically costs 30% of reactive fixing
    # Plus overhead for testing, code review, deployment
    refactor_hours = fix_hours * 0.3
    refactor_hours = refactor_hours.clip(lower=0.5)  # minimum 30 min
    roi["COST_TO_REFACTOR"] = refactor_hours * DEVELOPER_HOURLY_RATE * OVERHEAD_MULTIPLIER

    # ── ROI at each horizon ──────────────────────────────────────────────
    primary_horizon = 365  # Use 1-year as the primary decision horizon
    p_fail = roi[f"P_FAIL_{primary_horizon}"]

    roi["EXPECTED_LOSS"] = p_fail * roi["COST_OF_BUG"]
    roi["NET_SAVINGS"] = roi["EXPECTED_LOSS"] - roi["COST_TO_REFACTOR"]
    roi["ROI_PERCENT"] = (
        (roi["EXPECTED_LOSS"] - roi["COST_TO_REFACTOR"]) / roi["COST_TO_REFACTOR"]
    ) * 100

    # ── Risk Tier Classification ─────────────────────────────────────────
    conditions = [
        (p_fail >= 0.7) & (roi["ROI_PERCENT"] > 200),
        (p_fail >= 0.4) & (roi["ROI_PERCENT"] > 50),
        (p_fail >= 0.2) & (roi["ROI_PERCENT"] > 0),
    ]
    choices = ["CRITICAL", "HIGH", "MEDIUM"]
    roi["RISK_TIER"] = np.select(conditions, choices, default="LOW")

    # Sort by ROI
    roi = roi.sort_values("ROI_PERCENT", ascending=False).reset_index(drop=True)

    # ── Summary Statistics ───────────────────────────────────────────────
    print(f"\n{'='*70}")
    print(f"FINANCIAL ROI SUMMARY (Horizon: {primary_horizon} days)")
    print(f"{'='*70}")
    print(f"  Developer rate:        ${DEVELOPER_HOURLY_RATE}/hr")
    print(f"  Downtime cost:         ${DOWNTIME_COST_PER_HOUR}/hr x {AVG_OUTAGE_HOURS}hr = "
          f"${DOWNTIME_COST_PER_HOUR * AVG_OUTAGE_HOURS} per incident")
    print(f"  Overhead multiplier:   {OVERHEAD_MULTIPLIER}x")
    print(f"")
    print(f"  Total files analyzed:      {len(roi):,}")
    print(f"  Files with positive ROI:   {(roi['ROI_PERCENT'] > 0).sum():,} "
          f"({(roi['ROI_PERCENT'] > 0).mean():.1%})")
    print(f"  Total Expected Loss:       ${roi['EXPECTED_LOSS'].sum():,.0f}")
    print(f"  Total Refactoring Cost:    ${roi['COST_TO_REFACTOR'].sum():,.0f}")
    print(f"  Total Net Savings:         ${roi['NET_SAVINGS'].sum():,.0f}")
    print(f"")
    print(f"  Risk Tier Distribution:")
    for tier in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
        count = (roi["RISK_TIER"] == tier).sum()
        pct = count / len(roi)
        total_loss = roi.loc[roi["RISK_TIER"] == tier, "EXPECTED_LOSS"].sum()
        print(f"    {tier:10s}  {count:>6,} files ({pct:>5.1%})  "
              f"  Expected Loss: ${total_loss:>12,.0f}")

    # ── Top 25 Priority Files ────────────────────────────────────────────
    print(f"\n{'='*70}")
    print(f"TOP 25 REFACTORING PRIORITIES (by ROI)")
    print(f"{'='*70}")
    print(f"  {'#':>3}  {'PROJECT':<25} {'FILE':<35} "
          f"{'P(fail)':>8} {'Exp.Loss':>10} {'Refactor':>10} {'Net Save':>10} {'ROI%':>8} {'TIER':>8}")
    print(f"  {'-'*148}")

    for i, (_, row) in enumerate(roi.head(25).iterrows()):
        print(f"  {i+1:>3}  {row['PROJECT_ID']:<25} {str(row['FILE'])[:35]:<35} "
              f"{row[f'P_FAIL_{primary_horizon}']:>8.1%} "
              f"${row['EXPECTED_LOSS']:>9,.0f} "
              f"${row['COST_TO_REFACTOR']:>9,.0f} "
              f"${row['NET_SAVINGS']:>9,.0f} "
              f"{row['ROI_PERCENT']:>7.0f}% "
              f"{row['RISK_TIER']:>8}")

    return roi


def generate_roi_plots(roi_df):
    """Generate ROI-specific visualizations."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # ── 1. Refactoring Priority Heatmap (Top 30) ─────────────────────────
    fig, ax = plt.subplots(figsize=(14, 8))
    top30 = roi_df.head(30).copy()
    top30["label"] = top30["FILE"].apply(lambda f: str(f)[:30])

    colors = {"CRITICAL": "#e74c3c", "HIGH": "#e67e22", "MEDIUM": "#f1c40f", "LOW": "#2ecc71"}
    bar_colors = [colors.get(t, "#95a5a6") for t in top30["RISK_TIER"]]

    bars = ax.barh(range(len(top30)), top30["ROI_PERCENT"], color=bar_colors, edgecolor="black", alpha=0.85)
    ax.set_yticks(range(len(top30)))
    ax.set_yticklabels(top30["label"], fontsize=8)
    ax.set_xlabel("Return on Investment (%)", fontsize=12)
    ax.set_title("Top 30 Refactoring Priorities by ROI", fontsize=14, fontweight="bold")
    ax.invert_yaxis()
    ax.grid(axis="x", alpha=0.3)

    # Legend
    from matplotlib.patches import Patch
    legend_elements = [Patch(facecolor=c, label=t) for t, c in colors.items()]
    ax.legend(handles=legend_elements, loc="lower right", fontsize=10)

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "roi_priority_heatmap.png"), dpi=150)
    plt.close()
    print("  Saved: roi_priority_heatmap.png")

    # ── 2. Expected Loss vs Refactoring Cost Scatter ─────────────────────
    fig, ax = plt.subplots(figsize=(10, 8))
    positive_roi = roi_df[roi_df["ROI_PERCENT"] > 0].head(200)

    tier_colors = {"CRITICAL": "#e74c3c", "HIGH": "#e67e22", "MEDIUM": "#f1c40f", "LOW": "#2ecc71"}
    for tier in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]:
        mask = positive_roi["RISK_TIER"] == tier
        if mask.sum() > 0:
            ax.scatter(
                positive_roi.loc[mask, "COST_TO_REFACTOR"],
                positive_roi.loc[mask, "EXPECTED_LOSS"],
                c=tier_colors[tier], label=tier, alpha=0.6,
                s=positive_roi.loc[mask, "P_FAIL_365"] * 200 + 10,
                edgecolors="black", linewidth=0.3
            )

    # Break-even line
    max_val = max(positive_roi["COST_TO_REFACTOR"].max(), positive_roi["EXPECTED_LOSS"].max())
    ax.plot([0, max_val], [0, max_val], "k--", alpha=0.5, label="Break-even")

    ax.set_xlabel("Cost to Refactor ($)", fontsize=12)
    ax.set_ylabel("Expected Loss from Failure ($)", fontsize=12)
    ax.set_title("Expected Loss vs Refactoring Investment", fontsize=14, fontweight="bold")
    ax.legend(fontsize=10)
    ax.grid(alpha=0.3)

    # Format axes as dollars
    ax.xaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"${x:,.0f}"))
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"${x:,.0f}"))

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "loss_vs_investment.png"), dpi=150)
    plt.close()
    print("  Saved: loss_vs_investment.png")

    # ── 3. Failure Probability at Multiple Horizons ──────────────────────
    fig, ax = plt.subplots(figsize=(10, 6))
    horizon_cols = [c for c in roi_df.columns if c.startswith("P_FAIL_")]
    horizons = [int(c.split("_")[-1]) for c in horizon_cols]

    # Pick a few representative files from top priorities
    sample_files = roi_df.head(5)
    for _, row in sample_files.iterrows():
        probs = [row[f"P_FAIL_{h}"] for h in horizons]
        label = f"{row['FILE'][:25]} (ROI={row['ROI_PERCENT']:.0f}%)"
        ax.plot(horizons, probs, marker="o", linewidth=2, label=label)

    ax.set_xlabel("Time Horizon (days)", fontsize=12)
    ax.set_ylabel("P(Failure)", fontsize=12)
    ax.set_title("Failure Probability Over Time (Top 5 Priority Files)", fontsize=14, fontweight="bold")
    ax.legend(fontsize=9, loc="lower right")
    ax.set_ylim(0, 1)
    ax.grid(alpha=0.3)
    ax.set_xticks(horizons)
    ax.set_xticklabels([f"{h}d\n({h//30}mo)" for h in horizons])

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "failure_prob_horizons.png"), dpi=150)
    plt.close()
    print("  Saved: failure_prob_horizons.png")

    # ── 4. Risk Tier Pie Chart ───────────────────────────────────────────
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))

    # Count by tier
    tier_counts = roi_df["RISK_TIER"].value_counts()
    tier_order = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    tier_counts = tier_counts.reindex(tier_order).fillna(0)
    pie_colors = [tier_colors[t] for t in tier_order]

    ax1.pie(tier_counts, labels=tier_order, colors=pie_colors, autopct="%1.1f%%",
            startangle=90, textprops={"fontsize": 11})
    ax1.set_title("File Count by Risk Tier", fontsize=13, fontweight="bold")

    # Expected loss by tier
    tier_loss = roi_df.groupby("RISK_TIER")["EXPECTED_LOSS"].sum()
    tier_loss = tier_loss.reindex(tier_order).fillna(0)

    ax2.pie(tier_loss, labels=tier_order, colors=pie_colors, autopct="%1.1f%%",
            startangle=90, textprops={"fontsize": 11})
    ax2.set_title("Expected Loss ($) by Risk Tier", fontsize=13, fontweight="bold")

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, "risk_tier_distribution.png"), dpi=150)
    plt.close()
    print("  Saved: risk_tier_distribution.png")


def main():
    # Load and train
    train_df, test_df, features = load_data()
    cph, scaler = train_cox_model(train_df, features)

    # Compute survival probabilities at multiple horizons
    prob_df = compute_survival_probabilities(cph, scaler, test_df, features, HORIZONS)

    # Compute financial ROI
    roi_df = compute_financial_roi(test_df.reset_index(drop=True), prob_df.reset_index(drop=True), HORIZONS)

    # Generate plots
    print("\nGenerating ROI visualizations...")
    generate_roi_plots(roi_df)

    # Save full ROI results
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Save detailed ROI table
    save_cols = ["PROJECT_ID", "FILE", "RISK_TIER",
                 "P_FAIL_90", "P_FAIL_180", "P_FAIL_365", "P_FAIL_730",
                 "COST_OF_BUG", "COST_TO_REFACTOR", "EXPECTED_LOSS",
                 "NET_SAVINGS", "ROI_PERCENT",
                 "total_debt_minutes", "bug_count", "code_smell_count",
                 "commit_count", "num_contributors"]
    roi_df[save_cols].to_csv(os.path.join(OUTPUT_DIR, "roi_financial_report.csv"), index=False)
    print(f"\n[OK] ROI financial report saved to: {OUTPUT_DIR}/roi_financial_report.csv")

    # Executive summary CSV (top 50 only)
    roi_df[save_cols].head(50).to_csv(
        os.path.join(OUTPUT_DIR, "roi_top50_priorities.csv"), index=False
    )
    print(f"[OK] Top 50 priorities saved to:    {OUTPUT_DIR}/roi_top50_priorities.csv")

    return roi_df


if __name__ == "__main__":
    main()
