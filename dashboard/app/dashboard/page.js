"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import {
  FileWarning, DollarSign, TrendingUp, Target,
  AlertTriangle, Download, ArrowUpRight, ScanSearch,
  ArrowRight, Activity, BarChart3, GitBranch, Sparkles,
} from "lucide-react";
import { kpiData, riskTiers, roiPriorities, failureProbCurves } from "../lib/data";

/* ── Animated Counter ───────────────────────────────────── */
function Counter({ end, prefix = "", suffix = "", decimals = 0, duration = 1500 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    const t = setTimeout(() => requestAnimationFrame(step), 200);
    return () => clearTimeout(t);
  }, [end, duration]);

  const formatted = val.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return <span>{prefix}{formatted}{suffix}</span>;
}

/* ── Tier Badge ─────────────────────────────────────────── */
function TierBadge({ tier }) {
  const cls = {
    CRITICAL: "badge-critical", HIGH: "badge-high",
    MEDIUM: "badge-medium", LOW: "badge-low",
  }[tier] || "badge-low";
  return <span className={`badge ${cls}`}>{tier}</span>;
}

/* ── Empty State (New User) ─────────────────────────────── */
function NewUserOnboarding({ userName }) {
  return (
    <div className="space-y-8 max-w-[1000px] mx-auto">
      {/* Welcome Header */}
      <div className="text-center pt-8">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[var(--accent)] to-[var(--gradient-end)] flex items-center justify-center mx-auto mb-6 animate-float shadow-xl shadow-indigo-500/20">
          <Sparkles size={36} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-3">
          Welcome, {userName}! 👋
        </h1>
        <p className="text-base text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed">
          Your dashboard is empty because no repository has been analyzed yet.
          Start by providing a GitHub repo URL to run the full survival analysis pipeline.
        </p>
      </div>

      {/* CTA Card */}
      <div className="glass-card p-8 text-center animate-pulse-glow">
        <ScanSearch size={32} className="text-[var(--accent)] mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
          Analyze Your First Repository
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
          Provide a GitHub repo URL and the pipeline will extract 36 code metrics,
          run the Cox PH model, and generate file-level risk scores with dollar-value ROI.
        </p>
        <Link
          href="/dashboard/analyze"
          className="btn-primary inline-flex items-center gap-2 text-base py-3.5 px-8"
        >
          Go to Analyze Repo
          <ArrowRight size={18} />
        </Link>
      </div>

      {/* How it Works Steps */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] text-center mb-6 uppercase tracking-wider">
          How It Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: ScanSearch, title: "1. Submit Repo URL", desc: "Provide a GitHub repository URL. The system clones it and extracts code metrics + AST features." },
            { icon: Activity, title: "2. Predict Failures", desc: "Cox PH survival model predicts when each file will fail at 90/180/365/730 day horizons." },
            { icon: DollarSign, title: "3. Get ROI Scores", desc: "Failure probabilities are converted into dollar-value refactoring priorities with expected savings." },
          ].map((step) => (
            <div key={step.title} className="glass-card p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-[var(--accent-glow)] flex items-center justify-center mx-auto mb-4">
                <step.icon size={24} className="text-[var(--accent)]" />
              </div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">{step.title}</h4>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Available Pages Preview */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] text-center mb-6 uppercase tracking-wider">
          What You&apos;ll Unlock After Analysis
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Activity, label: "Survival Curves", color: "#6366F1" },
            { icon: DollarSign, label: "ROI Financial", color: "#10B981" },
            { icon: BarChart3, label: "Model Comparison", color: "#F59E0B" },
            { icon: GitBranch, label: "AST Features", color: "#8B5CF6" },
          ].map((item) => (
            <div key={item.label} className="glass-card p-4 text-center opacity-60">
              <item.icon size={20} style={{ color: item.color }} className="mx-auto mb-2" />
              <p className="text-xs text-[var(--text-muted)]">{item.label}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">Analyze a repo first</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Dashboard Overview Page
   ══════════════════════════════════════════════════════════ */
export default function DashboardOverview() {
  const [user, setUser] = useState(null);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("csi_user");
    if (stored) setUser(JSON.parse(stored));
    // Check if user has analyzed any repo
    const analyzed = localStorage.getItem("csi_analysis_done");
    setHasData(!!analyzed);
  }, []);

  const LINE_COLORS = ["#6366F1", "#EC4899", "#10B981", "#F59E0B", "#3B82F6"];

  // New user — show onboarding
  if (!hasData) {
    return <NewUserOnboarding userName={user?.name || "User"} />;
  }

  // Returning user with data — show full dashboard
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Welcome Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Welcome back, {user?.name || "User"} 👋
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Here&apos;s what&apos;s happening with your codebase analysis.
          </p>
        </div>
        <button className="btn-secondary hidden sm:inline-flex items-center gap-2 text-sm py-2.5 px-5">
          <Download size={16} />
          Export Report
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: "Total Files Analyzed", value: <Counter end={kpiData.totalFiles} />, icon: Target, color: "var(--accent)", sub: "Across 31 Apache projects" },
          { label: "Files at Risk", value: <Counter end={kpiData.filesAtRisk} />, icon: FileWarning, color: "var(--danger)", sub: `${kpiData.positiveRoiPercent}% with positive ROI` },
          { label: "Total Expected Loss", value: <Counter end={kpiData.totalExpectedLoss} prefix="$" />, icon: AlertTriangle, color: "var(--warning)", sub: "1-year failure horizon" },
          { label: "Net Savings Potential", value: <Counter end={kpiData.netSavings} prefix="$" />, icon: TrendingUp, color: "var(--success)", sub: "After refactoring investment" },
        ].map((kpi, i) => (
          <div
            key={kpi.label}
            className="kpi-card opacity-0 animate-fade-in-up"
            style={{ animationDelay: `${i * 100}ms`, animationFillMode: "forwards" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">{kpi.label}</span>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in srgb, ${kpi.color} 12%, transparent)` }}>
                <kpi.icon size={18} style={{ color: kpi.color }} />
              </div>
            </div>
            <div className="text-3xl font-bold text-[var(--text-primary)] mb-1">{kpi.value}</div>
            <p className="text-xs text-[var(--text-muted)]">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Risk Tier Donut */}
        <div className="lg:col-span-2 glass-card p-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Risk Tier Distribution</h2>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskTiers} dataKey="count" nameKey="tier" cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={3} stroke="none">
                  {riskTiers.map((entry) => (<Cell key={entry.tier} fill={entry.color} />))}
                </Pie>
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 shadow-2xl">
                      <p className="text-sm font-semibold mb-1" style={{ color: d.color }}>{d.tier}</p>
                      <p className="text-xs text-[var(--text-secondary)]">Files: {d.count.toLocaleString()}</p>
                      <p className="text-xs text-[var(--text-secondary)]">Loss: ${d.expectedLoss.toLocaleString()}</p>
                    </div>
                  );
                }} />
                <Legend verticalAlign="bottom" height={36} formatter={(value) => (<span className="text-xs text-[var(--text-secondary)]">{value}</span>)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Failure Probability Over Time */}
        <div className="lg:col-span-3 glass-card p-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Failure Probability Over Time (Top 5 Files)</h2>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={[
                  { horizon: "90d", ...Object.fromEntries(failureProbCurves.map((f, i) => [`file${i}`, f.data[0].probability])) },
                  { horizon: "180d", ...Object.fromEntries(failureProbCurves.map((f, i) => [`file${i}`, f.data[1].probability])) },
                  { horizon: "1yr", ...Object.fromEntries(failureProbCurves.map((f, i) => [`file${i}`, f.data[2].probability])) },
                  { horizon: "2yr", ...Object.fromEntries(failureProbCurves.map((f, i) => [`file${i}`, f.data[3].probability])) },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis dataKey="horizon" tick={{ fill: "var(--text-muted)", fontSize: 12 }} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 12 }} domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 shadow-2xl">
                      <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">{label}</p>
                      {payload.map((p, i) => (
                        <p key={i} className="text-xs text-[var(--text-secondary)]">
                          <span style={{ color: p.color }}>●</span> {failureProbCurves[i]?.file}: {(p.value * 100).toFixed(1)}%
                        </p>
                      ))}
                    </div>
                  );
                }} />
                {failureProbCurves.map((_, i) => (
                  <Line key={i} type="monotone" dataKey={`file${i}`} stroke={LINE_COLORS[i]} strokeWidth={2} dot={{ fill: LINE_COLORS[i], r: 4 }} name={failureProbCurves[i].file} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Priority Files Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--card-border)] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Top 10 Refactoring Priorities</h2>
          <a href="/dashboard/roi" className="text-xs text-[var(--accent-hover)] hover:underline flex items-center gap-1">View All <ArrowUpRight size={12} /></a>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th><th>Project</th><th>File</th><th>P(Fail 1yr)</th><th>Expected Loss</th><th>Refactor Cost</th><th>ROI %</th><th>Tier</th>
              </tr>
            </thead>
            <tbody>
              {roiPriorities.slice(0, 10).map((row) => (
                <tr key={row.rank}>
                  <td className="font-mono text-[var(--text-muted)]">{row.rank}</td>
                  <td className="text-[var(--text-primary)] font-medium text-xs">{row.project.replace("org.apache:", "")}</td>
                  <td className="font-mono text-xs">{row.file}</td>
                  <td className="font-mono"><span className={row.pFail365 > 0.5 ? "text-red-400" : row.pFail365 > 0.3 ? "text-yellow-400" : "text-green-400"}>{(row.pFail365 * 100).toFixed(1)}%</span></td>
                  <td className="font-mono">${row.expectedLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className="font-mono">${row.costRefactor.toFixed(0)}</td>
                  <td className="font-mono text-[var(--success)]">{row.roiPercent.toFixed(0)}%</td>
                  <td><TierBadge tier={row.tier} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
