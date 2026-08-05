"use client";

import { useState, Fragment } from "react";
import { FolderSearch, Search, ChevronDown, ChevronUp, X, AlertTriangle, DollarSign, Activity } from "lucide-react";
import { roiPriorities } from "../../lib/data";

function TierBadge({ tier }) {
  const cls = { CRITICAL: "badge-critical", HIGH: "badge-high", MEDIUM: "badge-medium", LOW: "badge-low" }[tier] || "badge-low";
  return <span className={`badge ${cls}`}>{tier}</span>;
}

export default function FilesPage() {
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState("roiPercent");
  const [sortDir, setSortDir] = useState("desc");
  const [expandedRow, setExpandedRow] = useState(null);
  const [tierFilter, setTierFilter] = useState("ALL");

  let data = roiPriorities;
  if (tierFilter !== "ALL") data = data.filter((r) => r.tier === tierFilter);
  if (search) {
    const q = search.toLowerCase();
    data = data.filter((r) => r.file.toLowerCase().includes(q) || r.project.toLowerCase().includes(q));
  }
  data = [...data].sort((a, b) => (sortDir === "desc" ? -1 : 1) * (a[sortCol] - b[sortCol]));

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  const SortIcon = ({ col }) =>
    sortCol === col ? (sortDir === "desc" ? <ChevronDown size={12} /> : <ChevronUp size={12} />) : null;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <FolderSearch size={24} className="text-[var(--info)]" />
          File Explorer
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Search and drill into any file&apos;s risk profile.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[250px] max-w-md">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by filename or project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-11 text-sm"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X size={14} />
            </button>
          )}
        </div>
        {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((tier) => (
          <button
            key={tier}
            onClick={() => setTierFilter(tier)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all border ${
              tierFilter === tier
                ? "border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent-hover)]"
                : "border-[var(--card-border)] text-[var(--text-muted)] hover:border-[var(--accent)]"
            }`}
          >
            {tier}
          </button>
        ))}
        <span className="text-xs text-[var(--text-muted)]">{data.length} files</span>
      </div>

      {/* File Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Project</th>
                <th>File</th>
                <th className="hover:text-[var(--accent)]" onClick={() => handleSort("pFail365")}>
                  P(Fail 1yr) <SortIcon col="pFail365" />
                </th>
                <th className="hover:text-[var(--accent)]" onClick={() => handleSort("roiPercent")}>
                  ROI % <SortIcon col="roiPercent" />
                </th>
                <th className="hover:text-[var(--accent)]" onClick={() => handleSort("expectedLoss")}>
                  Exp. Loss <SortIcon col="expectedLoss" />
                </th>
                <th>Tier</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <Fragment key={`file-${row.file}-${i}`}>
                  <tr
                    className={`${expandedRow === i ? "bg-[rgba(99,102,241,0.08)]" : ""}`}
                    onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                  >
                    <td className="font-mono text-[var(--text-muted)]">{i + 1}</td>
                    <td className="text-xs">{row.project.replace("org.apache:", "")}</td>
                    <td className="font-mono text-xs text-[var(--text-primary)]">{row.file}</td>
                    <td className="font-mono">
                      <span className={row.pFail365 > 0.5 ? "text-red-400" : row.pFail365 > 0.3 ? "text-yellow-400" : "text-green-400"}>
                        {(row.pFail365 * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="font-mono text-[var(--success)]">{row.roiPercent.toFixed(0)}%</td>
                    <td className="font-mono">${row.expectedLoss.toFixed(0)}</td>
                    <td><TierBadge tier={row.tier} /></td>
                    <td>
                      {expandedRow === i ? <ChevronUp size={14} className="text-[var(--text-muted)]" /> : <ChevronDown size={14} className="text-[var(--text-muted)]" />}
                    </td>
                  </tr>
                  {expandedRow === i && (
                    <tr>
                      <td colSpan={8} className="!p-0">
                        <div className="bg-[rgba(99,102,241,0.04)] border-t border-b border-[var(--card-border)] p-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Failure Probabilities */}
                            <div>
                              <h4 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Activity size={14} className="text-[var(--accent)]" />
                                Failure Probabilities
                              </h4>
                              <div className="space-y-2">
                                {[
                                  { label: "90 days", val: row.pFail90 },
                                  { label: "180 days", val: row.pFail180 },
                                  { label: "1 year", val: row.pFail365 },
                                  { label: "2 years", val: row.pFail730 },
                                ].map((p) => (
                                  <div key={p.label} className="flex items-center gap-2">
                                    <span className="text-xs text-[var(--text-muted)] w-16">{p.label}</span>
                                    <div className="flex-1 h-2 rounded-full bg-[var(--card-border)] overflow-hidden">
                                      <div
                                        className="h-full rounded-full"
                                        style={{
                                          width: `${p.val * 100}%`,
                                          background: p.val > 0.5 ? "#EF4444" : p.val > 0.3 ? "#F59E0B" : "#10B981",
                                        }}
                                      />
                                    </div>
                                    <span className="text-xs font-mono w-12 text-right">{(p.val * 100).toFixed(1)}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* ROI Breakdown */}
                            <div>
                              <h4 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-3 flex items-center gap-2">
                                <DollarSign size={14} className="text-[var(--success)]" />
                                Financial Breakdown
                              </h4>
                              <div className="space-y-2 text-xs">
                                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Cost of Bug:</span><span className="font-mono">${row.costBug.toFixed(0)}</span></div>
                                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Refactor Cost:</span><span className="font-mono">${row.costRefactor.toFixed(0)}</span></div>
                                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Expected Loss:</span><span className="font-mono text-red-400">${row.expectedLoss.toFixed(0)}</span></div>
                                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Net Savings:</span><span className="font-mono text-[var(--success)]">${row.netSavings.toFixed(0)}</span></div>
                                <div className="flex justify-between border-t border-[var(--card-border)] pt-2"><span className="text-[var(--text-primary)] font-semibold">ROI:</span><span className="font-mono text-[var(--success)] font-bold">{row.roiPercent.toFixed(0)}%</span></div>
                              </div>
                            </div>

                            {/* File Metadata */}
                            <div>
                              <h4 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-3 flex items-center gap-2">
                                <AlertTriangle size={14} className="text-[var(--warning)]" />
                                File Metrics
                              </h4>
                              <div className="space-y-2 text-xs">
                                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Tech Debt:</span><span className="font-mono">{row.debtMin} min</span></div>
                                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Bugs:</span><span className="font-mono">{row.bugs}</span></div>
                                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Code Smells:</span><span className="font-mono">{row.smells}</span></div>
                                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Commits:</span><span className="font-mono">{row.commits}</span></div>
                                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Contributors:</span><span className="font-mono">{row.contributors}</span></div>
                              </div>
                              <div className="mt-4 p-3 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)]">
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                  <strong className="text-[var(--text-primary)]">Recommendation:</strong>{" "}
                                  {row.pFail365 > 0.5
                                    ? "This file has >50% chance of failing within 1 year. Refactoring cost is minimal at $" + row.costRefactor.toFixed(0) + ". Immediate refactoring is strongly recommended."
                                    : row.pFail365 > 0.3
                                      ? "Moderate risk. Schedule refactoring within the next sprint cycle."
                                      : "Low risk. Monitor but no immediate action needed."}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
