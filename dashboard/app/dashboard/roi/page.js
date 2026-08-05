"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ScatterChart, Scatter, Cell, ZAxis,
  Legend, PieChart, Pie,
} from "recharts";
import { DollarSign, Sliders, RefreshCw } from "lucide-react";
import { roiPriorities, riskTiers, kpiData } from "../../lib/data";

function TierBadge({ tier }) {
  const cls = { CRITICAL: "badge-critical", HIGH: "badge-high", MEDIUM: "badge-medium", LOW: "badge-low" }[tier] || "badge-low";
  return <span className={`badge ${cls}`}>{tier}</span>;
}

const tierColors = { CRITICAL: "#DC2626", HIGH: "#EF4444", MEDIUM: "#F59E0B", LOW: "#10B981" };

export default function ROIPage() {
  const [params, setParams] = useState({
    hourlyRate: 75,
    downtimeCost: 500,
    outageHours: 4,
    overhead: 1.5,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [sortCol, setSortCol] = useState("roiPercent");
  const [sortDir, setSortDir] = useState("desc");

  // Recalculated data based on params (simplified)
  const multiplier = (params.hourlyRate / 75) * (params.downtimeCost / 500);

  const adjustedData = roiPriorities.map((r) => ({
    ...r,
    expectedLoss: r.expectedLoss * multiplier,
    netSavings: r.netSavings * multiplier,
    costRefactor: r.costRefactor * (params.overhead / 1.5),
    roiPercent: r.roiPercent * multiplier / (params.overhead / 1.5),
  }));

  const filtered = adjustedData.filter(
    (r) =>
      r.file.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.project.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    const mult = sortDir === "desc" ? -1 : 1;
    return mult * (a[sortCol] - b[sortCol]);
  });

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  const totalLoss = adjustedData.reduce((s, r) => s + r.expectedLoss, 0);
  const totalRefactor = adjustedData.reduce((s, r) => s + r.costRefactor, 0);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <DollarSign size={24} className="text-[var(--success)]" />
          ROI Financial Analysis
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Dollar-value refactoring recommendations powered by survival predictions.
        </p>
      </div>

      {/* Financial Parameters Panel */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sliders size={16} className="text-[var(--accent)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Financial Parameters</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { key: "hourlyRate", label: "Developer Rate ($/hr)", prefix: "$" },
            { key: "downtimeCost", label: "Downtime Cost ($/hr)", prefix: "$" },
            { key: "outageHours", label: "Avg Outage (hrs)", prefix: "" },
            { key: "overhead", label: "Overhead Multiplier", prefix: "" },
          ].map((p) => (
            <div key={p.key}>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5">{p.label}</label>
              <div className="relative">
                {p.prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">{p.prefix}</span>}
                <input
                  type="number"
                  value={params[p.key]}
                  onChange={(e) => setParams({ ...params, [p.key]: +e.target.value })}
                  className={`input-field text-sm ${p.prefix ? "pl-8" : ""}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        {[
          { label: "Total Expected Loss", value: `$${totalLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: "var(--danger)" },
          { label: "Total Refactor Cost", value: `$${totalRefactor.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: "var(--warning)" },
          { label: "Net Savings", value: `$${(totalLoss - totalRefactor).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: "var(--success)" },
          { label: "Avg ROI", value: `${(adjustedData.reduce((s, r) => s + r.roiPercent, 0) / adjustedData.length).toFixed(0)}%`, color: "var(--accent)" },
        ].map((m) => (
          <div key={m.label} className="kpi-card">
            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">{m.label}</div>
            <div className="text-2xl font-bold" style={{ color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ROI Priority Heatmap (Bar chart) */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Top 15 by ROI</h2>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={adjustedData.slice(0, 15)} layout="vertical" margin={{ left: 140 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K%`} />
                <YAxis type="category" dataKey="file" tick={{ fill: "var(--text-secondary)", fontSize: 9 }} width={140} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 shadow-2xl">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{d.file}</p>
                      <p className="text-xs text-[var(--text-muted)] mb-2">{d.project}</p>
                      <p className="text-xs">ROI: <span className="text-[var(--success)]">{d.roiPercent.toFixed(0)}%</span></p>
                      <p className="text-xs">P(fail): <span className="text-red-400">{(d.pFail365 * 100).toFixed(1)}%</span></p>
                      <p className="text-xs">Loss: ${d.expectedLoss.toFixed(0)}</p>
                    </div>
                  );
                }} />
                <Bar dataKey="roiPercent" radius={[0, 4, 4, 0]}>
                  {adjustedData.slice(0, 15).map((entry, i) => (
                    <Cell key={i} fill={tierColors[entry.tier] || "#6366F1"} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Loss vs Investment Scatter */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Expected Loss vs Refactoring Cost</h2>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis type="number" dataKey="costRefactor" name="Refactor Cost" tick={{ fill: "var(--text-muted)", fontSize: 10 }} label={{ value: "Refactor Cost ($)", position: "bottom", fill: "var(--text-muted)", fontSize: 11 }} />
                <YAxis type="number" dataKey="expectedLoss" name="Expected Loss" tick={{ fill: "var(--text-muted)", fontSize: 10 }} label={{ value: "Expected Loss ($)", angle: -90, position: "insideLeft", fill: "var(--text-muted)", fontSize: 11 }} />
                <ZAxis type="number" dataKey="pFail365" range={[40, 200]} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 shadow-2xl">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{d.file}</p>
                      <p className="text-xs text-[var(--text-secondary)]">Loss: ${d.expectedLoss.toFixed(0)} | Cost: ${d.costRefactor.toFixed(0)}</p>
                      <p className="text-xs text-[var(--success)]">ROI: {d.roiPercent.toFixed(0)}%</p>
                    </div>
                  );
                }} />
                <Scatter data={adjustedData}>
                  {adjustedData.map((entry, i) => (
                    <Cell key={i} fill={tierColors[entry.tier] || "#6366F1"} fillOpacity={0.7} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Full ROI Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--card-border)] flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Full ROI Table
          </h2>
          <input
            type="text"
            placeholder="Search file or project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field text-sm max-w-xs"
          />
        </div>
        <div className="overflow-x-auto max-h-[500px]">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Project</th>
                <th>File</th>
                <th className="hover:text-[var(--accent)]" onClick={() => handleSort("pFail365")}>
                  P(Fail 1yr) {sortCol === "pFail365" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                </th>
                <th className="hover:text-[var(--accent)]" onClick={() => handleSort("expectedLoss")}>
                  Exp. Loss {sortCol === "expectedLoss" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                </th>
                <th>Refactor</th>
                <th className="hover:text-[var(--accent)]" onClick={() => handleSort("netSavings")}>
                  Net Savings {sortCol === "netSavings" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                </th>
                <th className="hover:text-[var(--accent)]" onClick={() => handleSort("roiPercent")}>
                  ROI % {sortCol === "roiPercent" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                </th>
                <th>Tier</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <tr key={i}>
                  <td className="font-mono text-[var(--text-muted)]">{i + 1}</td>
                  <td className="text-xs">{row.project.replace("org.apache:", "")}</td>
                  <td className="font-mono text-xs text-[var(--text-primary)]">{row.file}</td>
                  <td className="font-mono">{(row.pFail365 * 100).toFixed(1)}%</td>
                  <td className="font-mono">${row.expectedLoss.toFixed(0)}</td>
                  <td className="font-mono">${row.costRefactor.toFixed(0)}</td>
                  <td className="font-mono text-[var(--success)]">${row.netSavings.toFixed(0)}</td>
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
