"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from "recharts";
import { GitBranch, CheckCircle2, XCircle, Code2 } from "lucide-react";
import { astComparison, astFeatures, repoCoverage } from "../../lib/data";

export default function ASTPage() {
  const cIndexBarData = astComparison.map((m) => ({
    model: m.model.replace("Original (DB metrics)", "DB Only").replace("Combined (DB + AST)", "DB + AST"),
    train: m.cIndexTrain,
    test: m.cIndexTest,
  }));

  const improvement = (
    (astComparison[2].cIndexTest - astComparison[0].cIndexTest) * 100
  ).toFixed(1);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <GitBranch size={24} className="text-[var(--gradient-mid)]" />
          AST Feature Analysis
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Tree-sitter structural features extracted at historical fault-inducing commits.
        </p>
      </div>

      {/* Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        {[
          { label: "Repos Parsed", value: "4", color: "var(--accent)" },
          { label: "Unique Commits", value: "1,466", color: "var(--info)" },
          { label: "File Snapshots", value: "13,436", color: "var(--success)" },
          { label: "Test C-Index Δ", value: `+${improvement}%`, color: "var(--warning)" },
        ].map((m) => (
          <div key={m.label} className="kpi-card">
            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">{m.label}</div>
            <div className="text-2xl font-bold" style={{ color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* C-Index Comparison */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">C-Index: DB vs AST vs Combined</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cIndexBarData} margin={{ bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis dataKey="model" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
                <YAxis domain={[0.5, 0.75]} tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 shadow-2xl">
                      <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">{label}</p>
                      {payload.map((p, i) => (
                        <p key={i} className="text-xs"><span style={{ color: p.color }}>●</span> {p.name}: {p.value.toFixed(4)}</p>
                      ))}
                    </div>
                  );
                }} />
                <Legend verticalAlign="top" height={36} formatter={(v) => <span className="text-xs text-[var(--text-secondary)]">{v}</span>} />
                <Bar dataKey="train" name="Train" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={30} />
                <Bar dataKey="test" name="Test" fill="#EC4899" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AST Feature Coefficients */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Top AST Feature Coefficients</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={astFeatures} layout="vertical" margin={{ left: 130 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: "var(--text-secondary)", fontSize: 10 }} width={130} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 shadow-2xl">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{d.name}</p>
                      <p className="text-xs">Coef: {d.coef.toFixed(4)} | HR: {d.hr.toFixed(3)} | p: {d.pValue.toFixed(3)}</p>
                      <p className="text-xs">{d.significant ? "✓ Significant (p<0.05)" : "Not significant"}</p>
                    </div>
                  );
                }} />
                <Bar dataKey="coef" radius={[0, 4, 4, 0]}>
                  {astFeatures.map((entry, i) => (
                    <Cell key={i} fill={entry.coef > 0 ? "#EF4444" : "#3B82F6"} fillOpacity={entry.significant ? 0.9 : 0.4} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Significant Features Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--card-border)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">AST Feature Details (20 Features)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Coefficient</th>
                <th>Hazard Ratio</th>
                <th>p-value</th>
                <th>Significant</th>
              </tr>
            </thead>
            <tbody>
              {astFeatures.map((f) => (
                <tr key={f.name} className={f.significant ? "bg-[rgba(99,102,241,0.05)]" : ""}>
                  <td className="font-mono text-xs text-[var(--text-primary)]">{f.name}</td>
                  <td className="font-mono" style={{ color: f.coef > 0 ? "#EF4444" : "#3B82F6" }}>
                    {f.coef > 0 ? "+" : ""}{f.coef.toFixed(4)}
                  </td>
                  <td className="font-mono">{f.hr.toFixed(3)}</td>
                  <td className="font-mono">{f.pValue < 0.001 ? "<0.001" : f.pValue.toFixed(3)}</td>
                  <td>
                    {f.significant ? (
                      <span className="flex items-center gap-1 text-[var(--success)] text-xs">
                        <CheckCircle2 size={14} /> Yes
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[var(--text-muted)] text-xs">
                        <XCircle size={14} /> No
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Repo Coverage Cards */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Repository Coverage</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {repoCoverage.map((r) => (
            <div key={r.repo} className="glass-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Code2 size={16} className="text-[var(--accent)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">{r.repo}</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Files</span>
                  <span className="font-mono">{r.files.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Commits</span>
                  <span className="font-mono">{r.commits.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Success Rate</span>
                  <span className="font-mono text-[var(--success)]">{r.successRate}%</span>
                </div>
                {/* Progress Bar */}
                <div className="h-1.5 rounded-full bg-[var(--card-border)] overflow-hidden mt-1">
                  <div
                    className="h-full rounded-full bg-[var(--success)]"
                    style={{ width: `${r.successRate}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline Explanation */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Extraction Pipeline</h2>
        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
          {[
            "Git Repository",
            "→ git show @ fault commit",
            "→ Tree-sitter Java Parse",
            "→ 20 Structural Features",
            "→ Merge with DB Features",
            "→ Cox PH Combined Model",
          ].map((step, i) => (
            <span
              key={i}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                i === 5
                  ? "bg-[var(--accent-glow)] text-[var(--accent-hover)] border border-[var(--accent)]"
                  : "bg-[var(--card-bg)] border border-[var(--card-border)]"
              }`}
            >
              {step}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
