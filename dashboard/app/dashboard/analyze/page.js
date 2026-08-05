"use client";

import { useState, useEffect, useRef } from "react";
import {
  ScanSearch, GitBranch, Link2, Play, Loader2, CheckCircle2,
  AlertTriangle, XCircle, FileCode, ChevronDown, ChevronUp,
  Bug, Code2, Shield, Zap,
} from "lucide-react";

/* ── Simulated analysis results per repo ──────────────── */
const DEMO_RESULTS = {
  default: {
    summary: { totalFiles: 247, riskyFiles: 38, criticalFiles: 5, avgFailProb: 0.32, estimatedLoss: 187450, netSavings: 124320 },
    files: [
      {
        path: "src/main/java/org/apache/commons/io/FileUtils.java",
        risk: "CRITICAL", pFail: 0.78, roiPercent: 4210, expectedLoss: 8920,
        issues: [
          { line: 142, severity: "critical", type: "Resource Leak", message: "InputStream not closed in catch block — will leak file handles under IOException", code: `    public static String readFileToString(File file) throws IOException {\n        InputStream in = openInputStream(file);\n        try {\n            return IOUtils.toString(in);\n        } catch (IOException e) {\n            // BUG: 'in' is never closed if IOException is thrown here\n            throw new RuntimeException("Failed to read file", e);\n        }\n    }` },
          { line: 287, severity: "high", type: "Null Dereference", message: "Potential NPE — listFiles() returns null for non-directory or I/O error", code: `    public static void cleanDirectory(File directory) throws IOException {\n        File[] files = directory.listFiles();\n        // WARNING: listFiles() can return null if 'directory' is not\n        // actually a directory or if an I/O error occurs\n        for (File file : files) {\n            forceDelete(file);\n        }\n    }` },
        ],
      },
      {
        path: "src/main/java/org/apache/commons/io/IOUtils.java",
        risk: "HIGH", pFail: 0.61, roiPercent: 2870, expectedLoss: 6340,
        issues: [
          { line: 95, severity: "high", type: "Unbounded Read", message: "toByteArray() reads entire stream into memory — OOM risk on large files", code: `    public static byte[] toByteArray(InputStream input) throws IOException {\n        ByteArrayOutputStream output = new ByteArrayOutputStream();\n        // RISK: No size limit — a 4GB stream will cause OutOfMemoryError\n        copy(input, output);\n        return output.toByteArray();\n    }` },
          { line: 203, severity: "medium", type: "Deprecated API", message: "Using StringBufferInputStream which is deprecated and has encoding issues", code: `    public static InputStream toInputStream(String input) {\n        // SMELL: StringBufferInputStream is @Deprecated since JDK 1.1\n        // It does not properly convert characters into bytes\n        return new StringBufferInputStream(input);\n    }` },
        ],
      },
      {
        path: "src/main/java/org/apache/commons/io/FilenameUtils.java",
        risk: "MEDIUM", pFail: 0.34, roiPercent: 1540, expectedLoss: 3210,
        issues: [
          { line: 318, severity: "medium", type: "Path Traversal", message: "normalize() does not sanitize '..' sequences — path traversal vulnerability", code: `    public static String normalize(String filename) {\n        if (filename == null) {\n            return null;\n        }\n        // WARNING: Does not validate against path traversal attacks\n        // An input like "../../etc/passwd" passes through unchecked\n        String normalized = filename.replace('\\\\', '/');\n        return normalized;\n    }` },
        ],
      },
      {
        path: "src/test/java/org/apache/commons/io/FileUtilsTest.java",
        risk: "HIGH", pFail: 0.55, roiPercent: 2340, expectedLoss: 4560,
        issues: [
          { line: 67, severity: "high", type: "Flaky Test", message: "Test depends on OS-specific temp directory behavior — fails intermittently on CI", code: `    @Test\n    public void testCopyFileToDirectory() throws Exception {\n        File src = new File(System.getProperty("java.io.tmpdir"), "test.txt");\n        // ISSUE: java.io.tmpdir varies by OS and CI environment\n        // This test is known to fail on Windows GitHub Actions runners\n        src.createNewFile();\n        FileUtils.copyFileToDirectory(src, testDir);\n        assertTrue(new File(testDir, "test.txt").exists());\n    }` },
        ],
      },
      {
        path: "src/main/java/org/apache/commons/io/output/LockableFileWriter.java",
        risk: "LOW", pFail: 0.12, roiPercent: 620, expectedLoss: 890,
        issues: [
          { line: 45, severity: "low", type: "Code Smell", message: "Magic number 1024 used without constant — reduces readability", code: `    public LockableFileWriter(File file) throws IOException {\n        this.out = new BufferedWriter(\n            new FileWriter(file),\n            1024  // SMELL: Magic number — should be a named constant\n        );\n    }` },
        ],
      },
    ],
  },
};

/* ── Severity styling helpers ─────────────────────────── */
const sevStyle = {
  critical: { bg: "rgba(220,38,38,0.12)", border: "rgba(220,38,38,0.3)", text: "#FCA5A5", icon: XCircle, label: "CRITICAL" },
  high:     { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.25)", text: "#FCA5A5", icon: AlertTriangle, label: "HIGH" },
  medium:   { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)", text: "#FDE68A", icon: Bug, label: "MEDIUM" },
  low:      { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.25)", text: "#6EE7B7", icon: Code2, label: "LOW" },
};

function TierBadge({ tier }) {
  const cls = { CRITICAL: "badge-critical", HIGH: "badge-high", MEDIUM: "badge-medium", LOW: "badge-low" }[tier] || "badge-low";
  return <span className={`badge ${cls}`}>{tier}</span>;
}

/* ── Code Block with line highlighting ────────────────── */
function CodeBlock({ code, severity }) {
  const lines = code.split("\n");
  const sev = sevStyle[severity] || sevStyle.low;
  return (
    <div className="rounded-xl overflow-hidden border" style={{ borderColor: sev.border, background: "rgba(0,0,0,0.4)" }}>
      <div className="flex items-center gap-2 px-4 py-2" style={{ background: sev.bg }}>
        <sev.icon size={14} style={{ color: sev.text }} />
        <span className="text-xs font-semibold uppercase" style={{ color: sev.text }}>{sev.label}</span>
      </div>
      <pre className="p-4 overflow-x-auto text-sm leading-6 font-mono">
        {lines.map((line, i) => {
          const isHighlighted = /\/\/.*(?:BUG|WARNING|RISK|ISSUE|SMELL)/i.test(line);
          return (
            <div
              key={i}
              className="flex"
              style={isHighlighted ? { background: `${sev.bg}`, borderLeft: `3px solid ${sev.text}`, paddingLeft: 8, marginLeft: -11 } : {}}
            >
              <span className="select-none w-8 text-right mr-4 shrink-0" style={{ color: "var(--text-muted)" }}>{i + 1}</span>
              <span style={{ color: isHighlighted ? sev.text : "var(--text-secondary)" }}>{line}</span>
            </div>
          );
        })}
      </pre>
    </div>
  );
}

/* ── Progress Steps ───────────────────────────────────── */
function ProgressStep({ label, status, delay }) {
  return (
    <div className="flex items-center gap-3 opacity-0 animate-fade-in-up" style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}>
      {status === "done" ? <CheckCircle2 size={18} className="text-[var(--success)]" /> : status === "running" ? <Loader2 size={18} className="text-[var(--accent)] animate-spin" /> : <div className="w-[18px] h-[18px] rounded-full border-2 border-[var(--card-border)]" />}
      <span className={`text-sm ${status === "done" ? "text-[var(--text-primary)]" : status === "running" ? "text-[var(--accent-hover)]" : "text-[var(--text-muted)]"}`}>{label}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Analyze Repo Page
   ══════════════════════════════════════════════════════════ */
export default function AnalyzePage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [expandedFile, setExpandedFile] = useState(null);
  const steps = ["Cloning repository...", "Extracting code metrics...", "Running Tree-sitter AST parser...", "Computing survival probabilities...", "Calculating ROI scores...", "Generating risk report..."];

  const startAnalysis = (e) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    setAnalyzing(true);
    setResults(null);
    setProgress(0);
    setExpandedFile(null);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setProgress(step);
      if (step >= steps.length) {
        clearInterval(interval);
        setTimeout(() => {
          setAnalyzing(false);
          setResults(DEMO_RESULTS.default);
          localStorage.setItem("csi_analysis_done", "true");
        }, 600);
      }
    }, 800);
  };

  const loadExample = () => {
    setRepoUrl("https://github.com/apache/commons-io");
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <ScanSearch size={24} className="text-[var(--accent)]" />
          Analyze Repository
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Provide a GitHub repository URL to run the full survival analysis pipeline and get file-level risk reports with code-level issue highlighting.
        </p>
      </div>

      {/* Input Section */}
      <div className="glass-card p-6">
        <form onSubmit={startAnalysis} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Repository URL</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Link2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] z-10" />
                <input
                  type="text" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/owner/repository"
                  className="input-field pl-12 text-sm" required
                />
              </div>
              <button type="submit" disabled={analyzing || !repoUrl.trim()}
                className="btn-primary inline-flex items-center gap-2 text-sm py-3 px-6 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                {analyzing ? <><Loader2 size={16} className="animate-spin" />Analyzing...</> : <><Play size={16} />Run Analysis</>}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={loadExample} className="text-xs text-[var(--accent-hover)] hover:underline flex items-center gap-1">
              <Zap size={12} /> Load example: apache/commons-io
            </button>
            <span className="text-xs text-[var(--text-muted)]">•</span>
            <span className="text-xs text-[var(--text-muted)]">Supports Java repositories with Maven/Gradle structure</span>
          </div>
        </form>
      </div>

      {/* Progress Section */}
      {analyzing && (
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Analysis Progress</h2>
          <div className="h-2 rounded-full bg-[var(--card-border)] overflow-hidden mb-6">
            <div className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--gradient-mid)] transition-all duration-500" style={{ width: `${(progress / steps.length) * 100}%` }} />
          </div>
          <div className="space-y-3">
            {steps.map((s, i) => (
              <ProgressStep key={s} label={s} status={i < progress ? "done" : i === progress ? "running" : "pending"} delay={i * 100} />
            ))}
          </div>
        </div>
      )}

      {/* Results Section */}
      {results && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Total Files", val: results.summary.totalFiles, color: "var(--accent)" },
              { label: "Risky Files", val: results.summary.riskyFiles, color: "var(--warning)" },
              { label: "Critical", val: results.summary.criticalFiles, color: "var(--danger)" },
              { label: "Avg Fail Prob", val: `${(results.summary.avgFailProb * 100).toFixed(0)}%`, color: "var(--danger)" },
              { label: "Est. Loss", val: `$${results.summary.estimatedLoss.toLocaleString()}`, color: "var(--warning)" },
              { label: "Net Savings", val: `$${results.summary.netSavings.toLocaleString()}`, color: "var(--success)" },
            ].map((kpi) => (
              <div key={kpi.label} className="kpi-card">
                <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">{kpi.label}</div>
                <div className="text-xl font-bold" style={{ color: kpi.color }}>{kpi.val}</div>
              </div>
            ))}
          </div>

          {/* File Results */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Detected Issues ({results.files.reduce((s, f) => s + f.issues.length, 0)} issues across {results.files.length} files)
            </h2>

            {results.files.map((file, fi) => (
              <div key={file.path} className="glass-card overflow-hidden">
                {/* File Header */}
                <button
                  onClick={() => setExpandedFile(expandedFile === fi ? null : fi)}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-[rgba(99,102,241,0.05)] transition-colors text-left"
                >
                  <FileCode size={18} className="text-[var(--accent)] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-[var(--text-primary)] truncate">{file.path}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {file.issues.length} issue{file.issues.length > 1 ? "s" : ""} • P(Fail 1yr): {(file.pFail * 100).toFixed(0)}% • ROI: {file.roiPercent}%
                    </p>
                  </div>
                  <TierBadge tier={file.risk} />
                  <span className="text-sm font-mono text-red-400">${file.expectedLoss.toLocaleString()}</span>
                  {expandedFile === fi ? <ChevronUp size={16} className="text-[var(--text-muted)]" /> : <ChevronDown size={16} className="text-[var(--text-muted)]" />}
                </button>

                {/* Expanded Issues */}
                {expandedFile === fi && (
                  <div className="border-t border-[var(--card-border)] px-6 py-5 space-y-5">
                    {file.issues.map((issue, ii) => (
                      <div key={ii}>
                        <div className="flex items-start gap-3 mb-3">
                          <div className="shrink-0 mt-0.5">
                            {(() => { const Ic = sevStyle[issue.severity]?.icon || Bug; return <Ic size={16} style={{ color: sevStyle[issue.severity]?.text }} />; })()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-[var(--text-primary)]">{issue.type}</span>
                              <span className="text-xs font-mono text-[var(--text-muted)]">Line {issue.line}</span>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{issue.message}</p>
                          </div>
                        </div>
                        <CodeBlock code={issue.code} severity={issue.severity} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Info Note */}
          <div className="glass-card p-5 flex gap-4">
            <Shield size={18} className="text-[var(--accent)] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">How This Works</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                The pipeline clones the repository, extracts 16 database-level metrics (churn, ownership, SonarQube debt) and 20 AST structural features using Tree-sitter. These features are fed into the trained Cox Proportional Hazards model to compute per-file failure probabilities at 90/180/365/730 day horizons. The ROI engine then converts probabilities into dollar-value refactoring priorities. Issue detection uses AST pattern matching on known anti-patterns.
              </p>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!analyzing && !results && (
        <div className="glass-card p-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-[var(--accent-glow)] flex items-center justify-center mx-auto mb-6">
            <GitBranch size={36} className="text-[var(--accent)]" />
          </div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">No Repository Analyzed Yet</h2>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto mb-6">
            Enter a GitHub repository URL above to run the survival analysis pipeline. The system will extract code metrics, compute failure probabilities, and highlight problematic code sections.
          </p>
          <button onClick={loadExample} className="btn-secondary inline-flex items-center gap-2 text-sm">
            <Zap size={16} /> Try with commons-io
          </button>
        </div>
      )}
    </div>
  );
}
