"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, Cell, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { modelComparison, rocCurveData, rfImportances } from "../../lib/data";

const COLORS = { "Cox PH": "#6366F1", "Random Forest": "#10B981", "Logistic Regression": "#F59E0B" };

export default function ModelsPage() {
  // Radar chart data (normalized to 0-1 range)
  const radarData = [
    { metric: "AUC-ROC", cox: 0.66, rf: 0.569, lr: 0.643 },
    { metric: "1 - Brier", cox: 1 - 0.083, rf: 1 - 0.305, lr: 1 - 0.122 },
    { metric: "Precision@K", cox: 0.2, rf: 1.0, lr: 2.0 },
    { metric: "Recall@K", cox: 0.1, rf: 0.5, lr: 1.0 },
  ].map((d) => {
    // Normalize each to max in category
    const max = Math.max(d.cox, d.rf, d.lr) || 1;
    return { ...d, cox: d.cox / max, rf: d.rf / max, lr: d.lr / max };
  });

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <BarChart3 size={24} className="text-[var(--warning)]" />
          Model Comparison
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Side-by-side benchmark of Cox PH, Random Forest, and Logistic Regression.
        </p>
      </div>

      {/* Model Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {modelComparison.map((m) => (
          <div key={m.model} className="kpi-card" style={{ borderLeft: `3px solid ${COLORS[m.model]}` }}>
            <div className="text-sm font-semibold text-[var(--text-primary)] mb-3">{m.model}</div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-muted)]">AUC-ROC</span>
                <span className="font-mono">{m.aucRoc.toFixed(3)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-muted)]">Brier Score</span>
                <span className="font-mono">{m.brierScore.toFixed(3)}</span>
              </div>
              {m.cIndex && (
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-muted)]">C-Index</span>
                  <span className="font-mono text-[var(--accent)]">{m.cIndex.toFixed(3)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ROC Curves */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">ROC Curves</h2>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rocCurveData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis dataKey="fpr" tick={{ fill: "var(--text-muted)", fontSize: 11 }} label={{ value: "False Positive Rate", position: "insideBottom", offset: -5, fill: "var(--text-muted)", fontSize: 11 }} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} label={{ value: "True Positive Rate", angle: -90, position: "insideLeft", fill: "var(--text-muted)", fontSize: 11 }} />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 shadow-2xl">
                      <p className="text-sm text-[var(--text-primary)]">FPR: {label}</p>
                      {payload.filter(p => p.dataKey !== "random").map((p, i) => (
                        <p key={i} className="text-xs"><span style={{ color: p.color }}>●</span> {p.name}: {p.value.toFixed(3)}</p>
                      ))}
                    </div>
                  );
                }} />
                <Legend verticalAlign="top" height={36} formatter={(v) => <span className="text-xs text-[var(--text-secondary)]">{v}</span>} />
                <Line type="monotone" dataKey="cox" name="Cox PH (0.660)" stroke="#6366F1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="lr" name="Log. Reg. (0.643)" stroke="#F59E0B" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="rf" name="Rand. Forest (0.569)" stroke="#10B981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="random" name="Random" stroke="#64748B" strokeWidth={1} dot={false} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Multi-Metric Radar</h2>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="70%">
                <PolarGrid stroke="var(--card-border)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
                <PolarRadiusAxis tick={false} axisLine={false} />
                <Tooltip />
                <Radar name="Cox PH" dataKey="cox" stroke="#6366F1" fill="#6366F1" fillOpacity={0.15} strokeWidth={2} />
                <Radar name="Random Forest" dataKey="rf" stroke="#10B981" fill="#10B981" fillOpacity={0.1} strokeWidth={2} />
                <Radar name="Logistic Regression" dataKey="lr" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.1} strokeWidth={2} />
                <Legend verticalAlign="bottom" formatter={(v) => <span className="text-xs text-[var(--text-secondary)]">{v}</span>} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* RF Feature Importance */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Random Forest — Feature Importance</h2>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rfImportances} layout="vertical" margin={{ left: 140 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
              <XAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
              <YAxis type="category" dataKey="feature" tick={{ fill: "var(--text-secondary)", fontSize: 10 }} width={140} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                return (
                  <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 shadow-2xl">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{payload[0].payload.feature}</p>
                    <p className="text-xs text-[var(--text-secondary)]">Importance: {payload[0].value.toFixed(4)}</p>
                  </div>
                );
              }} />
              <Bar dataKey="importance" fill="#10B981" radius={[0, 4, 4, 0]} fillOpacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Metrics Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--card-border)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Detailed Metrics Comparison</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>AUC-ROC</th>
                <th>Brier Score</th>
                <th>C-Index</th>
                <th>Precision@500</th>
                <th>Recall@500</th>
                <th>Verdict</th>
              </tr>
            </thead>
            <tbody>
              {modelComparison.map((m) => {
                const best = m.model === "Cox PH";
                return (
                  <tr key={m.model} className={best ? "bg-[rgba(99,102,241,0.05)]" : ""}>
                    <td className="font-semibold text-[var(--text-primary)]" style={{ color: COLORS[m.model] }}>{m.model}</td>
                    <td className="font-mono">{m.aucRoc.toFixed(3)}</td>
                    <td className="font-mono">{m.brierScore.toFixed(3)}</td>
                    <td className="font-mono">{m.cIndex ? m.cIndex.toFixed(3) : "—"}</td>
                    <td className="font-mono">{m.precisionK.toFixed(3)}</td>
                    <td className="font-mono">{m.recallK.toFixed(4)}</td>
                    <td>{best ? <span className="badge badge-low">★ Best</span> : <span className="badge badge-medium">Baseline</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
