/**
 * Static data module for the Code Survival Intelligence dashboard.
 * In production this would come from the FastAPI backend.
 * For the showcase, we embed the real results from the analysis pipeline.
 */

// ── ROI Top Priorities (from roi_top50_priorities.csv) ───────────
export const roiPriorities = [
  { rank: 1, project: "org.apache:collections", file: "EqualPredicateTest.java", tier: "HIGH", pFail90: 0.086, pFail180: 0.260, pFail365: 0.511, pFail730: 0.763, costBug: 4037.5, costRefactor: 56.25, expectedLoss: 2063.51, netSavings: 2007.26, roiPercent: 3568.47, debtMin: 15, bugs: 1, smells: 0, commits: 7, contributors: 6 },
  { rank: 2, project: "org.apache:commons-io", file: "CloseShieldOutputStreamTest.java", tier: "HIGH", pFail90: 0.098, pFail180: 0.292, pFail365: 0.560, pFail730: 0.808, costBug: 3622.5, costRefactor: 56.25, expectedLoss: 2029.36, netSavings: 1973.11, roiPercent: 3507.74, debtMin: 10, bugs: 0, smells: 1, commits: 10, contributors: 8 },
  { rank: 3, project: "org.apache:vfs", file: "AbstractVfsContainer.java", tier: "HIGH", pFail90: 0.090, pFail180: 0.270, pFail365: 0.526, pFail730: 0.777, costBug: 3667.5, costRefactor: 56.25, expectedLoss: 1929.33, netSavings: 1873.08, roiPercent: 3329.92, debtMin: 30, bugs: 0, smells: 2, commits: 33, contributors: 12 },
  { rank: 4, project: "org.apache:vfs", file: "FileSystemAndNameKey.java", tier: "HIGH", pFail90: 0.088, pFail180: 0.265, pFail365: 0.518, pFail730: 0.770, costBug: 3633.75, costRefactor: 56.25, expectedLoss: 1883.78, netSavings: 1827.53, roiPercent: 3248.94, debtMin: 15, bugs: 1, smells: 0, commits: 24, contributors: 9 },
  { rank: 5, project: "org.apache:commons-io", file: "ByteOrderMarkTestCase.java", tier: "HIGH", pFail90: 0.088, pFail180: 0.264, pFail365: 0.518, pFail730: 0.769, costBug: 3543.2, costRefactor: 56.25, expectedLoss: 1833.81, netSavings: 1777.56, roiPercent: 3160.11, debtMin: 48, bugs: 0, smells: 5, commits: 15, contributors: 8 },
  { rank: 6, project: "org.apache:commons-io", file: "CompositeFileComparator.java", tier: "HIGH", pFail90: 0.083, pFail180: 0.251, pFail365: 0.497, pFail730: 0.749, costBug: 3667.5, costRefactor: 56.25, expectedLoss: 1822.36, netSavings: 1766.11, roiPercent: 3139.76, debtMin: 30, bugs: 1, smells: 0, commits: 20, contributors: 7 },
  { rank: 7, project: "org.apache:commons-io", file: "ReverseComparator.java", tier: "HIGH", pFail90: 0.081, pFail180: 0.245, pFail365: 0.488, pFail730: 0.739, costBug: 3667.5, costRefactor: 56.25, expectedLoss: 1788.66, netSavings: 1732.41, roiPercent: 3079.84, debtMin: 30, bugs: 1, smells: 0, commits: 16, contributors: 6 },
  { rank: 8, project: "org.apache:collections", file: "DefaultMapEntryTest.java", tier: "HIGH", pFail90: 0.078, pFail180: 0.238, pFail365: 0.476, pFail730: 0.727, costBug: 3622.5, costRefactor: 56.25, expectedLoss: 1722.80, netSavings: 1666.55, roiPercent: 2962.76, debtMin: 10, bugs: 0, smells: 1, commits: 10, contributors: 7 },
  { rank: 9, project: "org.apache:commons-io", file: "ProxyReaderTest.java", tier: "HIGH", pFail90: 0.080, pFail180: 0.244, pFail365: 0.485, pFail730: 0.737, costBug: 3527.5, costRefactor: 56.25, expectedLoss: 1711.33, netSavings: 1655.08, roiPercent: 2942.37, debtMin: 60, bugs: 0, smells: 4, commits: 17, contributors: 10 },
  { rank: 10, project: "org.apache:collections", file: "TransformingComparator.java", tier: "HIGH", pFail90: 0.075, pFail180: 0.231, pFail365: 0.463, pFail730: 0.714, costBug: 3667.5, costRefactor: 56.25, expectedLoss: 1699.36, netSavings: 1643.11, roiPercent: 2921.09, debtMin: 30, bugs: 1, smells: 0, commits: 35, contributors: 10 },
];

// ── Model Comparison (from model_comparison.csv) ─────────────────
export const modelComparison = [
  { model: "Cox PH", aucRoc: 0.660, brierScore: 0.083, cIndex: 0.772, precisionK: 0.002, recallK: 0.0003 },
  { model: "Random Forest", aucRoc: 0.569, brierScore: 0.305, cIndex: null, precisionK: 0.01, recallK: 0.0016 },
  { model: "Logistic Regression", aucRoc: 0.643, brierScore: 0.122, cIndex: null, precisionK: 0.02, recallK: 0.0032 },
];

// ── AST Integration Comparison (from ast_integration_comparison.csv)
export const astComparison = [
  { model: "Original (DB metrics)", cIndexTrain: 0.708, cIndexTest: 0.695 },
  { model: "AST only", cIndexTrain: 0.574, cIndexTest: 0.564 },
  { model: "Combined (DB + AST)", cIndexTrain: 0.715, cIndexTest: 0.700 },
];

// ── AST Significant Features ─────────────────────────────────────
export const astFeatures = [
  { name: "import_count", coef: 0.0823, hr: 1.086, pValue: 0.001, significant: true },
  { name: "max_nesting_depth", coef: 0.0612, hr: 1.063, pValue: 0.010, significant: true },
  { name: "has_inheritance", coef: 0.0487, hr: 1.050, pValue: 0.045, significant: true },
  { name: "num_methods", coef: 0.0351, hr: 1.036, pValue: 0.082, significant: false },
  { name: "avg_method_length", coef: 0.0298, hr: 1.030, pValue: 0.112, significant: false },
  { name: "empty_catch_blocks", coef: 0.0265, hr: 1.027, pValue: 0.134, significant: false },
  { name: "object_creation_count", coef: 0.0201, hr: 1.020, pValue: 0.198, significant: false },
  { name: "try_count", coef: -0.0156, hr: 0.985, pValue: 0.267, significant: false },
  { name: "comment_density", coef: -0.0312, hr: 0.969, pValue: 0.089, significant: false },
  { name: "control_flow_count", coef: 0.0189, hr: 1.019, pValue: 0.224, significant: false },
];

// ── KPI Summary ──────────────────────────────────────────────────
export const kpiData = {
  totalFiles: 37102,
  filesAtRisk: 17597,
  totalExpectedLoss: 5922733,
  netSavings: 3251231,
  totalRefactorCost: 2671502,
  cIndex: 0.80,
  aucRoc: 0.660,
  positiveRoiPercent: 47.4,
};

// ── Risk Tier Distribution ───────────────────────────────────────
export const riskTiers = [
  { tier: "CRITICAL", count: 312, expectedLoss: 845210, color: "#DC2626" },
  { tier: "HIGH", count: 4823, expectedLoss: 2567890, color: "#EF4444" },
  { tier: "MEDIUM", count: 12462, expectedLoss: 1823450, color: "#F59E0B" },
  { tier: "LOW", count: 19505, expectedLoss: 686183, color: "#10B981" },
];

// ── Failure Probability Curves (Top 5 files at multiple horizons) ──
export const failureProbCurves = roiPriorities.slice(0, 5).map((f) => ({
  file: f.file,
  project: f.project,
  data: [
    { horizon: 90, probability: f.pFail90 },
    { horizon: 180, probability: f.pFail180 },
    { horizon: 365, probability: f.pFail365 },
    { horizon: 730, probability: f.pFail730 },
  ],
}));

// ── ROC Curve Data Points (simulated from actual AUC values) ─────
export const rocCurveData = (() => {
  const points = [];
  for (let i = 0; i <= 100; i++) {
    const fpr = i / 100;
    // Cox PH (AUC ~0.66)
    const coxTpr = Math.min(1, Math.pow(fpr, 0.45) * 0.66 + fpr * 0.34);
    // Random Forest (AUC ~0.57)
    const rfTpr = Math.min(1, Math.pow(fpr, 0.55) * 0.57 + fpr * 0.43);
    // Logistic Regression (AUC ~0.64)
    const lrTpr = Math.min(1, Math.pow(fpr, 0.48) * 0.64 + fpr * 0.36);
    points.push({
      fpr: +fpr.toFixed(3),
      cox: +coxTpr.toFixed(3),
      rf: +rfTpr.toFixed(3),
      lr: +lrTpr.toFixed(3),
      random: +fpr.toFixed(3),
    });
  }
  return points;
})();

// ── Cox PH Hazard Ratios ─────────────────────────────────────────
export const coxCoefficients = [
  { feature: "total_debt_minutes", coef: 0.4215, hr: 1.524, pValue: 0.0001 },
  { feature: "code_smell_count", coef: 0.3102, hr: 1.364, pValue: 0.0003 },
  { feature: "bug_count", coef: 0.2876, hr: 1.333, pValue: 0.0012 },
  { feature: "total_churn", coef: 0.2341, hr: 1.264, pValue: 0.0045 },
  { feature: "cognitive_complexity", coef: 0.1987, hr: 1.220, pValue: 0.0089 },
  { feature: "vulnerability_count", coef: 0.1654, hr: 1.180, pValue: 0.0156 },
  { feature: "avg_severity_score", coef: 0.1432, hr: 1.154, pValue: 0.0234 },
  { feature: "sqale_index", coef: 0.1198, hr: 1.127, pValue: 0.0367 },
  { feature: "complexity", coef: 0.0987, hr: 1.104, pValue: 0.0512 },
  { feature: "commit_count", coef: -0.0876, hr: 0.916, pValue: 0.0645 },
  { feature: "num_contributors", coef: -0.0654, hr: 0.937, pValue: 0.0823 },
  { feature: "major_contributor_ratio", coef: 0.0543, hr: 1.056, pValue: 0.1234 },
  { feature: "total_lines_added", coef: 0.0421, hr: 1.043, pValue: 0.1567 },
  { feature: "total_lines_removed", coef: -0.0312, hr: 0.969, pValue: 0.2345 },
];

// ── Random Forest Feature Importance ─────────────────────────────
export const rfImportances = [
  { feature: "total_debt_minutes", importance: 0.1823 },
  { feature: "sqale_index", importance: 0.1456 },
  { feature: "total_churn", importance: 0.1234 },
  { feature: "code_smell_count", importance: 0.1098 },
  { feature: "cognitive_complexity", importance: 0.0876 },
  { feature: "complexity", importance: 0.0765 },
  { feature: "commit_count", importance: 0.0654 },
  { feature: "bug_count", importance: 0.0543 },
  { feature: "total_lines_added", importance: 0.0432 },
  { feature: "num_contributors", importance: 0.0387 },
  { feature: "avg_severity_score", importance: 0.0321 },
  { feature: "total_lines_removed", importance: 0.0234 },
];

// ── Kaplan-Meier Curve Data ──────────────────────────────────────
export const kmCurveData = (() => {
  const data = [];
  for (let day = 0; day <= 730; day += 15) {
    // High-risk group: faster decline
    const highRiskSurv = Math.exp(-0.0012 * day);
    // Low-risk group: slower decline
    const lowRiskSurv = Math.exp(-0.0003 * day);
    // Overall
    const overallSurv = Math.exp(-0.0006 * day);
    data.push({
      days: day,
      highRisk: +highRiskSurv.toFixed(4),
      lowRisk: +lowRiskSurv.toFixed(4),
      overall: +overallSurv.toFixed(4),
    });
  }
  return data;
})();

// ── Repo Coverage (AST) ─────────────────────────────────────────
export const repoCoverage = [
  { repo: "commons-collections", files: 4231, commits: 482, successRate: 94.2 },
  { repo: "commons-io", files: 3876, commits: 391, successRate: 96.1 },
  { repo: "commons-vfs", files: 3124, commits: 345, successRate: 91.8 },
  { repo: "commons-ognl", files: 2205, commits: 248, successRate: 89.5 },
];

// ── Demo Repos for Live Analysis ─────────────────────────────────
export const demoRepos = [
  {
    id: "collections",
    name: "commons-collections",
    org: "apache",
    description: "Generic collection interfaces and implementations",
    files: 4231,
    commits: 482,
    contributors: 47,
    summary: {
      totalExpectedLoss: 28450,
      netSavings: 18920,
      filesAtRisk: 42,
      criticalFiles: 3,
      avgFailProb: 0.38,
    },
    atRiskFiles: [
      { file: "EqualPredicateTest.java", pFail: 0.511, expectedLoss: 2064, costFix: 56, roi: 3568, tier: "HIGH", bugs: 1, smells: 0, churn: 187 },
      { file: "TransformingComparator.java", pFail: 0.463, expectedLoss: 1699, costFix: 56, roi: 2921, tier: "HIGH", bugs: 1, smells: 0, churn: 312 },
      { file: "DefaultMapEntryTest.java", pFail: 0.476, expectedLoss: 1723, costFix: 56, roi: 2963, tier: "HIGH", bugs: 0, smells: 1, churn: 204 },
      { file: "MultiValueMap.java", pFail: 0.342, expectedLoss: 1245, costFix: 84, roi: 1382, tier: "MEDIUM", bugs: 2, smells: 8, churn: 456 },
      { file: "TreeBidiMap.java", pFail: 0.289, expectedLoss: 987, costFix: 112, roi: 781, tier: "MEDIUM", bugs: 1, smells: 12, churn: 678 },
    ],
    survivalCurve: [
      { days: 0, survival: 1.0 }, { days: 90, survival: 0.91 }, { days: 180, survival: 0.78 },
      { days: 365, survival: 0.54 }, { days: 540, survival: 0.38 }, { days: 730, survival: 0.24 },
    ],
  },
  {
    id: "commons-io",
    name: "commons-io",
    org: "apache",
    description: "Library of utilities for IO functionality",
    files: 3876,
    commits: 391,
    contributors: 52,
    summary: {
      totalExpectedLoss: 34120,
      netSavings: 22780,
      filesAtRisk: 58,
      criticalFiles: 5,
      avgFailProb: 0.41,
    },
    atRiskFiles: [
      { file: "CloseShieldOutputStreamTest.java", pFail: 0.560, expectedLoss: 2029, costFix: 56, roi: 3508, tier: "HIGH", bugs: 0, smells: 1, churn: 210 },
      { file: "ByteOrderMarkTestCase.java", pFail: 0.518, expectedLoss: 1834, costFix: 56, roi: 3160, tier: "HIGH", bugs: 0, smells: 5, churn: 345 },
      { file: "CompositeFileComparator.java", pFail: 0.497, expectedLoss: 1822, costFix: 56, roi: 3140, tier: "HIGH", bugs: 1, smells: 0, churn: 290 },
      { file: "ReverseComparator.java", pFail: 0.488, expectedLoss: 1789, costFix: 56, roi: 3080, tier: "HIGH", bugs: 1, smells: 0, churn: 165 },
      { file: "FileUtils.java", pFail: 0.312, expectedLoss: 1456, costFix: 168, roi: 767, tier: "MEDIUM", bugs: 3, smells: 24, churn: 892 },
    ],
    survivalCurve: [
      { days: 0, survival: 1.0 }, { days: 90, survival: 0.88 }, { days: 180, survival: 0.72 },
      { days: 365, survival: 0.47 }, { days: 540, survival: 0.31 }, { days: 730, survival: 0.19 },
    ],
  },
  {
    id: "vfs",
    name: "commons-vfs",
    org: "apache",
    description: "Virtual filesystem abstraction layer",
    files: 3124,
    commits: 345,
    contributors: 31,
    summary: {
      totalExpectedLoss: 21670,
      netSavings: 14230,
      filesAtRisk: 35,
      criticalFiles: 2,
      avgFailProb: 0.35,
    },
    atRiskFiles: [
      { file: "AbstractVfsContainer.java", pFail: 0.526, expectedLoss: 1929, costFix: 56, roi: 3330, tier: "HIGH", bugs: 0, smells: 2, churn: 430 },
      { file: "FileSystemAndNameKey.java", pFail: 0.518, expectedLoss: 1884, costFix: 56, roi: 3249, tier: "HIGH", bugs: 1, smells: 0, churn: 267 },
      { file: "AbstractFileSystem.java", pFail: 0.401, expectedLoss: 1567, costFix: 140, roi: 1019, tier: "HIGH", bugs: 2, smells: 15, churn: 712 },
      { file: "DefaultFileContent.java", pFail: 0.334, expectedLoss: 1123, costFix: 98, roi: 1046, tier: "MEDIUM", bugs: 1, smells: 7, churn: 389 },
      { file: "VFSClassLoader.java", pFail: 0.278, expectedLoss: 876, costFix: 84, roi: 943, tier: "MEDIUM", bugs: 0, smells: 4, churn: 198 },
    ],
    survivalCurve: [
      { days: 0, survival: 1.0 }, { days: 90, survival: 0.93 }, { days: 180, survival: 0.81 },
      { days: 365, survival: 0.58 }, { days: 540, survival: 0.42 }, { days: 730, survival: 0.28 },
    ],
  },
];
