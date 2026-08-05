"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";
import { Activity, Info } from "lucide-react";
import { kmCurveData, coxCoefficients } from "../../lib/data";

export default function SurvivalPage() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <Activity size={24} className="text-[var(--accent)]" />
          Survival Analysis
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Cox Proportional Hazards model predicting <em>when</em> code will fail.
        </p>
      </div>

      {/* C-Index Badge */}
      <div className="flex gap-4 flex-wrap">
        {[
          { label: "C-Index (Test)", value: "0.80", color: "var(--accent)" },
          { label: "AUC-ROC", value: "0.660", color: "var(--info)" },
          { label: "Brier Score", value: "0.083", color: "var(--success)" },
          { label: "Penalizer", value: "0.01", color: "var(--text-muted)" },
        ].map((m) => (
          <div key={m.label} className="kpi-card flex-1 min-w-[160px]">
            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">{m.label}</div>
            <div className="text-2xl font-bold" style={{ color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Kaplan-Meier Curve */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Kaplan-Meier Survival Curves</h2>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            Probability of survival (no failure) over time.
          </p>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={kmCurveData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis dataKey="days" tick={{ fill: "var(--text-muted)", fontSize: 11 }} label={{ value: "Days", position: "insideBottom", offset: -5, fill: "var(--text-muted)", fontSize: 11 }} />
                <YAxis domain={[0, 1]} tick={{ fill: "var(--text-muted)", fontSize: 11 }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} label={{ value: "S(t)", angle: -90, position: "insideLeft", fill: "var(--text-muted)", fontSize: 11 }} />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 shadow-2xl">
                      <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">Day {label}</p>
                      {payload.map((p, i) => (
                        <p key={i} className="text-xs text-[var(--text-secondary)]">
                          <span style={{ color: p.color }}>●</span> {p.name}: {(p.value * 100).toFixed(1)}%
                        </p>
                      ))}
                    </div>
                  );
                }} />
                <Legend verticalAlign="top" height={36} formatter={(v) => <span className="text-xs text-[var(--text-secondary)]">{v}</span>} />
                <Line type="monotone" dataKey="highRisk" name="High Risk" stroke="#EF4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="overall" name="Overall" stroke="#6366F1" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="lowRisk" name="Low Risk" stroke="#10B981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hazard Ratio Chart */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Cox PH Hazard Coefficients</h2>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            Positive coef → increases hazard (bad). Negative → protective.
          </p>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={coxCoefficients} layout="vertical" margin={{ left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                <YAxis type="category" dataKey="feature" tick={{ fill: "var(--text-secondary)", fontSize: 10 }} width={120} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 shadow-2xl">
                      <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">{d.feature}</p>
                      <p className="text-xs text-[var(--text-secondary)]">Coefficient: {d.coef.toFixed(4)}</p>
                      <p className="text-xs text-[var(--text-secondary)]">Hazard Ratio: {d.hr.toFixed(3)}</p>
                      <p className="text-xs text-[var(--text-secondary)]">p-value: {d.pValue.toFixed(4)}</p>
                    </div>
                  );
                }} />
                <Bar dataKey="coef" radius={[0, 4, 4, 0]}>
                  {coxCoefficients.map((entry, i) => (
                    <Cell key={i} fill={entry.coef > 0 ? "#EF4444" : "#3B82F6"} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Hazard Ratio Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--card-border)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Full Hazard Ratio Table
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Coefficient</th>
                <th>Hazard Ratio</th>
                <th>p-value</th>
                <th>Significance</th>
                <th>Effect</th>
              </tr>
            </thead>
            <tbody>
              {coxCoefficients.map((row) => (
                <tr key={row.feature}>
                  <td className="font-mono text-xs text-[var(--text-primary)]">{row.feature}</td>
                  <td className="font-mono" style={{ color: row.coef > 0 ? "#EF4444" : "#3B82F6" }}>
                    {row.coef > 0 ? "+" : ""}{row.coef.toFixed(4)}
                  </td>
                  <td className="font-mono">{row.hr.toFixed(3)}</td>
                  <td className="font-mono">
                    {row.pValue < 0.001 ? "<0.001" : row.pValue.toFixed(4)}
                  </td>
                  <td>
                    {row.pValue < 0.01 ? (
                      <span className="badge badge-critical">***</span>
                    ) : row.pValue < 0.05 ? (
                      <span className="badge badge-high">**</span>
                    ) : row.pValue < 0.1 ? (
                      <span className="badge badge-medium">*</span>
                    ) : (
                      <span className="badge badge-low">ns</span>
                    )}
                  </td>
                  <td className="text-xs">
                    {row.coef > 0 ? (
                      <span className="text-red-400">↑ Increases risk</span>
                    ) : (
                      <span className="text-blue-400">↓ Protective</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="glass-card p-6 flex gap-4">
        <Info size={20} className="text-[var(--accent)] shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">About Survival Analysis</h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Unlike binary classifiers, the Cox PH model captures <strong>time-to-event</strong> dynamics. A file with 50% failure probability at 365 days but only 8% at 90 days gets very different treatment than one failing uniformly. The C-index of 0.80 means the model correctly ranks 80% of file pairs by their actual failure order.
          </p>
        </div>
      </div>
    </div>
  );
}
