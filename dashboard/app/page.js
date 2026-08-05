"use client";
import { useState, useRef, useEffect } from "react";
import { motion, useScroll, useTransform, AnimatePresence, useInView, LayoutGroup, useMotionValue, useMotionTemplate } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Activity, FileCode2, TrendingUp, DollarSign, AlertTriangle, Maximize2, ArrowDown, X,
  Search, GitBranch, Loader, CheckCircle2, BarChart3, Shield
} from "lucide-react";
import {
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Area, AreaChart,
} from "recharts";
import {
  roiPriorities, riskTiers, kmCurveData, coxCoefficients, demoRepos
} from "./lib/data";

/* ── Helpers ── */
function TierBadge({ tier }) {
  const s = {
    CRITICAL: "bg-red-500/10 text-red-400 border-red-500/20",
    HIGH: "bg-red-500/5 text-red-300 border-red-400/20",
    MEDIUM: "bg-amber-500/5 text-amber-400 border-amber-500/20",
    LOW: "bg-green-500/5 text-green-400 border-green-500/20",
  };
  return <Badge variant="outline" className={`font-mono text-[9px] uppercase tracking-wider ${s[tier]}`}>{tier}</Badge>;
}

const COLORS = { white: "#ffffff", green: "#22c55e", red: "#ef4444", amber: "#eab308" };
const TIER_COLORS = { CRITICAL: "#ef4444", HIGH: "#f87171", MEDIUM: "#eab308", LOW: "#22c55e" };

function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111] border border-[#262626] rounded-xl px-4 py-3 shadow-2xl text-xs z-50">
      {label && <div className="font-sans font-medium text-[#a3a3a3] mb-2 uppercase tracking-widest text-[9px]">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-3 text-white">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
          <span className="font-mono">{formatter ? formatter(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

// Triggers children to mount only when scrolled into view
function InViewTrigger({ children }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  return <div ref={ref} className="w-full h-full">{isInView && children}</div>;
}

// Typewriter Component
function Typewriter({ text, speed = 15, delay = 0 }) {
  const [displayedText, setDisplayedText] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    let t;
    if (delay) t = setTimeout(() => setStarted(true), delay);
    else setStarted(true);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const intervalId = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(intervalId);
    }, speed);
    return () => clearInterval(intervalId);
  }, [text, speed, started]);

  return <span>{displayedText}</span>;
}

// Looping Typewriter for Hero
function LoopingTypewriter({ words, typeSpeed = 100, deleteSpeed = 50, pauseDelay = 2000 }) {
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);

  useEffect(() => {
    let timer;
    const currentWord = words[loopNum % words.length];

    if (isDeleting) {
      timer = setTimeout(() => {
        setText(currentWord.substring(0, text.length - 1));
        if (text.length === 0) {
          setIsDeleting(false);
          setLoopNum(loopNum + 1);
        }
      }, deleteSpeed);
    } else {
      timer = setTimeout(() => {
        setText(currentWord.substring(0, text.length + 1));
        if (text.length === currentWord.length) {
          setTimeout(() => setIsDeleting(true), pauseDelay);
        }
      }, typeSpeed);
    }

    return () => clearTimeout(timer);
  }, [text, isDeleting, loopNum, words, typeSpeed, deleteSpeed, pauseDelay]);

  return <span>{text}</span>;
}

// 099.supply Animated Tile Component
const MotionCard = motion.create(Card);
function Tile({ children, className = "", span = "col-span-1", onClick, onMouseMove }) {
  return (
    <MotionCard
      layout
      transition={{ layout: { type: "spring", stiffness: 35, damping: 15 } }}
      onClick={onClick}
      onMouseMove={onMouseMove}
      className={`group bg-card border-border hover:bg-[#050505] hover:border-[#404040] transition-colors duration-500 overflow-hidden flex flex-col ${span} ${className} ${onClick ? "cursor-pointer" : ""}`}
    >
      {children}
    </MotionCard>
  );
}

function ExpandedTileContent({ content, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex flex-col h-full w-full bg-black relative"
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-6 right-6 text-[#737373] hover:text-white transition-colors z-50"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="px-8 md:px-12 pt-12 pb-6 border-b border-[#262626]">
        <h4 className="font-sans text-[10px] uppercase tracking-widest text-[#737373] font-semibold mb-2">
          {content.subtitle}
        </h4>
        <h2 className="font-sans text-3xl md:text-5xl tracking-tighter text-white font-semibold">
          {content.title}
        </h2>
      </div>

      <div className="p-8 md:p-12 flex-1 overflow-y-auto">
        <p className="font-mono text-[#a3a3a3] text-lg leading-relaxed max-w-3xl">
          <Typewriter text={content.text} speed={10} delay={300} />
          <motion.span
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ repeat: Infinity, duration: 0.8 }}
            className="inline-block ml-1 w-2.5 h-5 bg-green-500 translate-y-1"
          />
        </p>

        {/* Tile-specific Footer */}
        {content.footer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-12 pt-8 border-t border-[#262626] flex flex-wrap gap-8">
            {content.footer.map((item, i) => (
              <div key={i}>
                <div className="font-sans text-[9px] uppercase tracking-widest text-[#737373] mb-1">{item.label}</div>
                <div className={`font-mono text-xs ${i === 0 ? 'text-green-400' : 'text-[#a3a3a3]'}`}>{item.value}</div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// Interactive Spotlight GitHub Tile
function GithubTile() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <Tile 
      span="col-span-1 md:col-span-3 lg:col-span-6" 
      className="h-[200px] flex items-center justify-center relative overflow-hidden group cursor-pointer bg-black" 
      onClick={() => window.open('https://github.com/Chiron-R/code-survival-intelligence', '_blank')}
      onMouseMove={handleMouseMove}
    >
      <div className="absolute inset-0 z-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
      <motion.div
        className="pointer-events-none absolute -inset-px z-0 opacity-0 transition duration-500 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              400px circle at ${mouseX}px ${mouseY}px,
              rgba(255,255,255,0.08),
              transparent 80%
            )
          `,
        }}
      />
      
      <div className="relative z-10 flex flex-col items-center pointer-events-none">
        <span className="font-sans text-[10px] uppercase tracking-widest text-[#737373] font-semibold mb-4 flex items-center gap-2">
          <FileCode2 className="w-4 h-4 text-white" /> [ SOURCE CODE ]
        </span>
        <h2 className="font-mono text-2xl md:text-4xl text-white tracking-tighter group-hover:scale-105 transition-transform duration-500">
          View Project on GitHub
        </h2>

      </div>
    </Tile>
  );
}

/* ── SCAN STEPS for demo ── */
const SCAN_STEPS = [
  { label: "Cloning repository & building file tree", icon: GitBranch, duration: 1200 },
  { label: "Parsing Abstract Syntax Trees (21 features)", icon: Search, duration: 1500 },
  { label: "Extracting code metrics from SonarQube", icon: BarChart3, duration: 1300 },
  { label: "Fitting Cox Proportional Hazards model", icon: Activity, duration: 1800 },
  { label: "Computing ROI scores & risk tiers", icon: Shield, duration: 1000 },
];

const TIER_BADGE_STYLES = {
  CRITICAL: "text-red-400 bg-red-500/10 border-red-500/20",
  HIGH: "text-red-300 bg-red-500/5 border-red-400/20",
  MEDIUM: "text-amber-400 bg-amber-500/5 border-amber-500/20",
  LOW: "text-green-400 bg-green-500/5 border-green-500/20",
};

function LiveDemoSection() {
  const [phase, setPhase] = useState("select"); // "select" | "scanning" | "results"
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [scanStep, setScanStep] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const startScan = (repo) => {
    setSelectedRepo(repo);
    setPhase("scanning");
    setScanStep(0);
    setScanProgress(0);
  };

  const resetDemo = () => {
    setPhase("select");
    setSelectedRepo(null);
    setScanStep(0);
    setScanProgress(0);
  };

  // Scanning animation controller
  useEffect(() => {
    if (phase !== "scanning") return;
    if (scanStep >= SCAN_STEPS.length) {
      const t = setTimeout(() => setPhase("results"), 600);
      return () => clearTimeout(t);
    }

    setScanProgress(0);
    const step = SCAN_STEPS[scanStep];
    const tickInterval = 30;
    const ticks = step.duration / tickInterval;
    let tick = 0;

    const interval = setInterval(() => {
      tick++;
      setScanProgress(Math.min(100, (tick / ticks) * 100));
      if (tick >= ticks) {
        clearInterval(interval);
        setTimeout(() => setScanStep(s => s + 1), 200);
      }
    }, tickInterval);

    return () => clearInterval(interval);
  }, [phase, scanStep]);

  return (
    <div ref={ref} className="col-span-1 md:col-span-3 lg:col-span-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ type: "spring", stiffness: 40, damping: 20 }}
      >
        {/* Section Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="font-sans text-[10px] uppercase tracking-widest text-[#737373] font-semibold mb-2">[ INTERACTIVE DEMO ]</h3>
            <h2 className="font-sans text-2xl md:text-3xl tracking-tighter text-white font-semibold">Run a Live Analysis</h2>
          </div>
          {phase !== "select" && (
            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              onClick={resetDemo}
              className="font-mono text-[10px] uppercase tracking-widest text-[#737373] hover:text-white transition-colors border border-[#262626] hover:border-[#404040] rounded-xl px-4 py-2"
            >
              ← Reset Demo
            </motion.button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {/* ── PHASE 1: Repo Selection ── */}
          {phase === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {demoRepos.map((repo) => (
                <motion.div
                  key={repo.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => startScan(repo)}
                  className="group cursor-pointer bg-black border border-[#262626] hover:border-[#404040] rounded-2xl p-6 transition-colors duration-300 relative overflow-hidden"
                >
                  <div className="absolute right-[-20%] bottom-[-20%] text-[120px] font-mono font-bold text-white/[0.02] pointer-events-none select-none leading-none">
                    /&gt;
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-[#111] border border-[#262626] flex items-center justify-center">
                      <GitBranch className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="font-mono text-sm text-white group-hover:text-green-400 transition-colors">{repo.name}</div>
                      <div className="font-sans text-[9px] uppercase tracking-widest text-[#737373]">{repo.org}</div>
                    </div>
                  </div>

                  <p className="font-sans text-xs text-[#737373] mb-6 leading-relaxed">{repo.description}</p>

                  <div className="grid grid-cols-3 gap-4 border-t border-[#262626] pt-4">
                    <div>
                      <div className="font-sans text-[9px] uppercase tracking-widest text-[#737373] mb-1">Files</div>
                      <div className="font-mono text-sm text-white">{repo.files.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="font-sans text-[9px] uppercase tracking-widest text-[#737373] mb-1">Commits</div>
                      <div className="font-mono text-sm text-white">{repo.commits}</div>
                    </div>
                    <div>
                      <div className="font-sans text-[9px] uppercase tracking-widest text-[#737373] mb-1">Devs</div>
                      <div className="font-mono text-sm text-white">{repo.contributors}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-[10px] font-sans uppercase tracking-widest text-[#737373] group-hover:text-green-400 transition-colors">
                    <Search className="w-3 h-3" /> Click to analyze
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* ── PHASE 2: Scanning Animation ── */}
          {phase === "scanning" && selectedRepo && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="bg-black border border-[#262626] rounded-2xl p-8 md:p-12"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-lg bg-[#111] border border-[#262626] flex items-center justify-center">
                  <GitBranch className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="font-mono text-lg text-white">{selectedRepo.name}</div>
                  <div className="font-sans text-[9px] uppercase tracking-widest text-[#737373]">Analyzing {selectedRepo.files.toLocaleString()} files across {selectedRepo.commits} commits</div>
                </div>
              </div>

              <div className="space-y-4">
                {SCAN_STEPS.map((step, i) => {
                  const StepIcon = step.icon;
                  const isActive = i === scanStep;
                  const isComplete = i < scanStep;
                  const isPending = i > scanStep;

                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-500 ${
                        isActive ? "border-green-500/30 bg-green-500/5" :
                        isComplete ? "border-[#262626] bg-transparent" :
                        "border-[#1a1a1a] bg-transparent opacity-40"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
                        {isComplete ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : isActive ? (
                          <Loader className="w-5 h-5 text-green-400 animate-spin" />
                        ) : (
                          <StepIcon className="w-5 h-5 text-[#737373]" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className={`font-mono text-xs ${
                          isComplete ? "text-[#737373]" :
                          isActive ? "text-white" :
                          "text-[#737373]"
                        }`}>
                          {step.label}
                        </div>

                        {isActive && (
                          <div className="mt-2 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${scanProgress}%` }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="font-mono text-[10px] text-[#737373] flex-shrink-0">
                        {isComplete ? "DONE" : isActive ? `${scanProgress.toFixed(0)}%` : ""}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── PHASE 3: Results ── */}
          {phase === "results" && selectedRepo && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="space-y-4"
            >
              {/* Summary Strip */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: "Files at Risk", value: selectedRepo.summary.filesAtRisk, color: "text-white" },
                  { label: "Critical Files", value: selectedRepo.summary.criticalFiles, color: "text-red-400" },
                  { label: "Avg. Fail Prob", value: `${(selectedRepo.summary.avgFailProb * 100).toFixed(0)}%`, color: "text-amber-400" },
                  { label: "Expected Loss", value: `$${selectedRepo.summary.totalExpectedLoss.toLocaleString()}`, color: "text-red-400" },
                  { label: "Net Savings", value: `$${selectedRepo.summary.netSavings.toLocaleString()}`, color: "text-green-400" },
                ].map((kpi, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-black border border-[#262626] rounded-2xl p-4"
                  >
                    <div className="font-sans text-[9px] uppercase tracking-widest text-[#737373] mb-2">{kpi.label}</div>
                    <div className={`font-mono text-2xl tracking-tighter ${kpi.color}`}>{kpi.value}</div>
                  </motion.div>
                ))}
              </div>

              {/* At-Risk Files + Survival Curve */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* At-Risk Files Table */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="lg:col-span-2 bg-black border border-[#262626] rounded-2xl overflow-hidden"
                >
                  <div className="p-5 border-b border-[#262626] flex justify-between items-center">
                    <span className="font-sans text-[10px] uppercase tracking-widest text-[#737373] font-semibold">[ HIGH-RISK FILES DETECTED ]</span>
                    <span className="font-mono text-[9px] text-[#737373]">[{selectedRepo.name}]</span>
                  </div>
                  <div className="divide-y divide-[#1a1a1a]">
                    {selectedRepo.atRiskFiles.map((file, i) => (
                      <motion.div
                        key={file.file}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + i * 0.1 }}
                        className="p-4 hover:bg-[#0a0a0a] transition-colors"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Badge variant="outline" className={`font-mono text-[9px] uppercase tracking-wider flex-shrink-0 ${TIER_BADGE_STYLES[file.tier]}`}>
                              {file.tier}
                            </Badge>
                            <span className="font-mono text-xs text-white truncate">{file.file}</span>
                          </div>
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <span className="font-mono text-[10px] text-red-400">${file.expectedLoss.toLocaleString()}</span>
                            <span className="font-mono text-[10px] text-green-400">{file.roi}% ROI</span>
                          </div>
                        </div>

                        {/* Failure probability bar */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${file.pFail * 100}%` }}
                              transition={{ duration: 1, delay: 0.8 + i * 0.1, ease: "easeOut" }}
                              className={`h-full rounded-full ${
                                file.pFail >= 0.5 ? "bg-red-500" :
                                file.pFail >= 0.3 ? "bg-amber-500" :
                                "bg-green-500"
                              }`}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-[#a3a3a3] w-12 text-right">
                            {(file.pFail * 100).toFixed(1)}%
                          </span>
                        </div>

                        <div className="flex gap-6 mt-2">
                          <span className="font-mono text-[9px] text-[#737373]">Bugs: {file.bugs}</span>
                          <span className="font-mono text-[9px] text-[#737373]">Smells: {file.smells}</span>
                          <span className="font-mono text-[9px] text-[#737373]">Churn: {file.churn}</span>
                          <span className="font-mono text-[9px] text-[#737373]">Fix: ${file.costFix}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Survival Curve */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="bg-black border border-[#262626] rounded-2xl overflow-hidden flex flex-col"
                >
                  <div className="p-5 border-b border-[#262626]">
                    <span className="font-sans text-[10px] uppercase tracking-widest text-[#737373] font-semibold">[ REPO SURVIVAL CURVE ]</span>
                  </div>
                  <div className="flex-1 p-4 min-h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={selectedRepo.survivalCurve} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="2 2" stroke="#262626" vertical={false} />
                        <XAxis dataKey="days" tick={{ fill: "#737373", fontSize: 10, fontFamily: "monospace" }} tickFormatter={v => `${v}d`} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#737373", fontSize: 10, fontFamily: "monospace" }} domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`} axisLine={false} tickLine={false} />
                        <RechartsTooltip content={<ChartTooltip formatter={v => `${(v * 100).toFixed(1)}%`} />} />
                        <defs>
                          <linearGradient id="survivalGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="survival" stroke="#ef4444" fill="url(#survivalGrad)" strokeWidth={2} animationDuration={2000} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="p-4 border-t border-[#262626] space-y-2">
                    <div className="flex justify-between">
                      <span className="font-mono text-[9px] text-[#737373]">90-DAY SURVIVAL</span>
                      <span className="font-mono text-xs text-white">{(selectedRepo.survivalCurve[1].survival * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono text-[9px] text-[#737373]">1-YEAR SURVIVAL</span>
                      <span className="font-mono text-xs text-red-400">{(selectedRepo.survivalCurve[3].survival * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono text-[9px] text-[#737373]">2-YEAR SURVIVAL</span>
                      <span className="font-mono text-xs text-red-400">{(selectedRepo.survivalCurve[5].survival * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default function Dashboard() {
  const [selectedFile, setSelectedFile] = useState(roiPriorities[0]);
  const [activeTileId, setActiveTileId] = useState(null);

  // Scroll animations for the Hero Section
  const containerRef = useRef(null);
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);

  const expandedContent = {
    "financial": {
      title: "[ FINANCIAL EXPOSURE ]",
      subtitle: "ROI CALCULATION MATRIX",
      text: "The financial exposure calculation fuses static analysis with historical churn data. We calculate expected portfolio loss by predicting the temporal failure probability of each file over 365 days multiplied by its critical impact factor. Recoverable capital represents the immediate net savings if the top 10% of high-risk nodes are refactored.",
      footer: [
        { label: "EXPECTED LOSS", value: "P(fail₃₆₅) × Cost_of_Bug" },
        { label: "COST OF BUG", value: "(debt_min/60 × $75) + $2000 × severity" },
        { label: "REFACTOR COST", value: "(debt_min/60 × 0.3) × $75 × 1.5" },
        { label: "ROI %", value: "(Loss − Refactor) / Refactor × 100" },
      ],
    },
    "scope": {
      title: "[ ACTIVE SCOPE ]",
      subtitle: "REPOSITORY INGESTION",
      text: "Currently tracking 31 distributed repositories. The ingestion pipeline dynamically parses 37K abstract syntax trees per day, computing cyclomatic complexity, max nesting depth, and temporal churn vectors to feed the survival engine.",
      footer: [
        { label: "DATASET", value: "Lenarduzzi TD V2" },
        { label: "OBSERVATIONS", value: "113,922 files" },
        { label: "EVENT RATE", value: "34.7% fault" },
        { label: "PROJECTS", value: "31 Apache repos" },
      ],
    },
    "engine": {
      title: "[ PREDICTIVE ENGINE ]",
      subtitle: "COX-PH SURVIVAL MODEL",
      text: "The core engine leverages a Cox Proportional Hazards regression model trained on 154,000 historical commits. By observing when files have previously required emergency hotfixes (death event), the model isolates the exact structural anomalies (covariates) that act as risk multipliers.",
      footer: [
        { label: "HAZARD FUNCTION", value: "h(t|X) = h₀(t) · exp(βX)" },
        { label: "SURVIVAL", value: "S(t) = exp(−∫h(u)du)" },
        { label: "C-INDEX", value: "0.80 (concordance)" },
        { label: "BRIER SCORE", value: "0.083 (calibration)" },
      ],
    },
    "horizons": {
      title: "[ HORIZONS ]",
      subtitle: "TIME-TO-FAILURE TRAJECTORIES",
      text: "The Kaplan-Meier estimator provides a non-parametric statistic used to estimate the survival function from lifetime data. Files stratified into the high-risk cohort exhibit a drastically accelerated probability of hard failure within the next 90 days. Immediate intervention is statistically required.",
      footer: [
        { label: "ESTIMATOR", value: "Ŝ(t) = ∏(1 − dᵢ/nᵢ)" },
        { label: "HORIZONS", value: "90d / 180d / 365d / 730d" },
        { label: "CENSORING", value: "65.3% right-censored" },
      ],
    },
    "strat": {
      title: "[ STRATIFICATION ]",
      subtitle: "COHORT DISTRIBUTION",
      text: "Files are partitioned into distinct risk tiers based on their cumulative hazard scores. CRITICAL files represent the top 1% of highest risk nodes that combine severe structural decay with extreme temporal churn frequency.",
      footer: [
        { label: "CRITICAL", value: "P(fail) ≥ 70%, ROI > 200%" },
        { label: "HIGH", value: "P(fail) ≥ 40%, ROI > 50%" },
        { label: "MEDIUM", value: "P(fail) ≥ 20%, ROI > 0%" },
        { label: "LOW", value: "Monitor only" },
      ],
    }
  };

  const toggleTile = (id) => setActiveTileId(activeTileId === id ? null : id);

  const getFinancialSpan = () => {
    if (activeTileId === "financial") return "col-span-1 md:col-span-3 lg:col-span-4 h-[500px]";
    if (["scope", "engine"].includes(activeTileId)) return "col-span-1 md:col-span-1 lg:col-span-1 h-[500px]";
    return "col-span-1 md:col-span-3 lg:col-span-3 h-[180px]";
  };

  const getScopeSpan = () => {
    if (activeTileId === "scope") return "col-span-1 md:col-span-3 lg:col-span-4 h-[500px]";
    if (["financial", "engine"].includes(activeTileId)) return "col-span-1 md:col-span-1 lg:col-span-1 h-[500px]";
    return "col-span-1 md:col-span-1 lg:col-span-1 h-[180px]";
  };

  const getEngineSpan = () => {
    if (activeTileId === "engine") return "col-span-1 md:col-span-3 lg:col-span-4 h-[500px]";
    if (["financial", "scope"].includes(activeTileId)) return "col-span-1 md:col-span-1 lg:col-span-1 h-[500px]";
    return "col-span-1 md:col-span-2 lg:col-span-2 h-[180px]";
  };

  const getHorizonsSpan = () => {
    if (activeTileId === "horizons") return "col-span-1 md:col-span-3 lg:col-span-5 h-[500px]";
    if (activeTileId === "strat") return "col-span-1 md:col-span-1 lg:col-span-1 h-[500px]";
    return "col-span-1 md:col-span-2 lg:col-span-4 h-[400px]";
  };

  const getStratSpan = () => {
    if (activeTileId === "strat") return "col-span-1 md:col-span-3 lg:col-span-5 h-[500px]";
    if (activeTileId === "horizons") return "col-span-1 md:col-span-1 lg:col-span-1 h-[500px]";
    return "col-span-1 md:col-span-1 lg:col-span-2 h-[400px]";
  };

  return (
    <div className="bg-background text-foreground selection:bg-white selection:text-black font-sans min-h-screen" ref={containerRef}>

      {/* NOISE OVERLAY */}
      <div
        className="fixed inset-0 z-[9999] pointer-events-none opacity-[0.04]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      ></div>

      {/* HERO SECTION */}
      <motion.div
        style={{ opacity: heroOpacity, willChange: "opacity" }}
        className="sticky top-0 h-screen w-full flex flex-col justify-center px-6 md:px-12 lg:px-24 bg-background overflow-hidden"
      >
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#404040 1.5px, transparent 1.5px)', backgroundSize: '48px 48px' }}></div>

        <div className="max-w-5xl relative z-10">
          <motion.h1
            style={{ willChange: "opacity, transform" }}
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 50, damping: 20, delay: 0 }}
            className="text-6xl md:text-7xl lg:text-[100px] font-semibold tracking-tighter leading-[0.95] text-white mb-8"
          >
            Predicting code decay<br />before it <LoopingTypewriter words={["happens", "fails", "breaks", "crashes"]} pauseDelay={3000} /><span className="animate-pulse text-green-500">_</span>
          </motion.h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 mt-12">
            <motion.div style={{ willChange: "opacity, transform" }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 40, damping: 20, delay: 0.2 }}>
              <h3 className="text-[10px] uppercase tracking-widest text-[#737373] font-bold mb-4">The Problem</h3>
              <p className="text-[#a3a3a3] font-mono text-sm leading-relaxed">
                Traditional technical debt metrics—like cyclomatic complexity and code smells—are static. They tell you code is bad, but they fail to capture the temporal risk of exactly when that bad code will cause a production failure.
              </p>
            </motion.div>
            <motion.div style={{ willChange: "opacity, transform" }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 40, damping: 20, delay: 0.4 }}>
              <h3 className="text-[10px] uppercase tracking-widest text-[#737373] font-bold mb-4">Our Engine</h3>
              <p className="text-[#a3a3a3] font-mono text-sm leading-relaxed">
                We fuse deep Abstract Syntax Tree (AST) parsing with Cox Proportional Hazards modeling. By analyzing the survival history of 154K commits, we map the exact financial exposure and expected failure date of every file in your repository.
              </p>
            </motion.div>
          </div>

          <motion.div
            style={{ willChange: "opacity, transform" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.8 }}
            className="mt-20 flex items-center gap-4 text-[10px] font-sans uppercase tracking-widest text-white animate-pulse"
          >
            <div className="w-8 h-8 rounded-full bg-[#111] border border-[#262626] flex items-center justify-center">
              <ArrowDown className="w-4 h-4 text-white" />
            </div>
            [ SCROLL TO EXPLORE RESULTS ]
          </motion.div>
        </div>

        {/* Marquee Ticker — Real Project Stats */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ duration: 2, delay: 1.5 }}
          className="absolute bottom-12 left-0 w-full overflow-hidden border-y border-[#1a1a1a] py-2 z-0 select-none pointer-events-none"
        >
          <div className="animate-marquee font-mono text-[10px] text-[#737373] tracking-widest uppercase">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex gap-16 pr-16">
                <span>31 APACHE PROJECTS</span>
                <span>154K+ COMMITS ANALYZED</span>
                <span>113,922 FILE OBSERVATIONS</span>
                <span>COX PH C-INDEX: 0.80</span>
                <span>AUC-ROC: 0.660</span>
                <span>21 AST FEATURES EXTRACTED</span>
                <span>$3.25M NET SAVINGS IDENTIFIED</span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* DASHBOARD OVERLAY */}
      <div className="relative z-10 bg-background min-h-screen pb-24">

        {/* NAV */}
        <header className="px-6 py-8 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-50 border-b border-[#111]">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.3)]"></div>
            <span className="font-sans font-semibold tracking-tight text-lg">Code Survival System</span>
          </div>
          <div className="flex items-center gap-6 font-mono text-xs text-[#a3a3a3]">
            <span className="hidden md:inline text-[#737373]">TD Dataset V2 · Cox PH</span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span> End-Sem 2026
            </span>
          </div>
        </header>

        {/* STRICT GRID */}
        <LayoutGroup>
          <main className="px-6 pt-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 auto-rows-max relative">

            {/* Tile A: Massive Financial Exposure */}
            <Tile
              onClick={() => toggleTile("financial")}
              span={getFinancialSpan()}
            >
              <AnimatePresence mode="wait">
                {activeTileId === "financial" ? (
                  <ExpandedTileContent key="expanded" content={expandedContent["financial"]} onClose={() => setActiveTileId(null)} />
                ) : (
                  <motion.div key="minimal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col justify-between p-6 relative overflow-hidden">
                    <div className="flex flex-wrap justify-between items-start gap-4 relative z-10">
                      <span className="font-sans text-[10px] uppercase tracking-widest text-[#737373] font-semibold flex items-center gap-2 whitespace-nowrap">
                        <AlertTriangle className="w-3 h-3 text-red-500" /> [ FINANCIAL EXPOSURE ]
                      </span>
                      <Badge variant="outline" className="font-mono text-[9px] text-green-400 border-green-500/20 bg-green-500/5 whitespace-nowrap">47.4% ROI+</Badge>
                    </div>

                    <div className="relative z-10 flex flex-wrap items-end justify-between gap-6 w-full mt-4">
                      <div>
                        <div className="font-mono text-[10px] text-[#737373] mb-1">PROJECTED LOSS</div>
                        <div className="font-mono text-5xl md:text-6xl tracking-tighter text-white">$5.92<span className="text-red-500">M</span></div>
                      </div>
                      <div className="text-left md:text-right">
                        <div className="font-mono text-[10px] text-[#737373] mb-1">RECOVERABLE</div>
                        <div className="font-mono text-2xl md:text-3xl tracking-tighter text-green-400">$3.25M</div>
                      </div>
                    </div>

                    <div className="absolute right-[-10%] top-[-20%] text-[150px] font-mono font-bold text-white/[0.02] pointer-events-none select-none leading-none">
                      $
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Tile>

            {/* Tile B: Scope */}
            <Tile
              onClick={() => toggleTile("scope")}
              span={getScopeSpan()}
            >
              <AnimatePresence mode="wait">
                {activeTileId === "scope" ? (
                  <ExpandedTileContent key="expanded" content={expandedContent["scope"]} onClose={() => setActiveTileId(null)} />
                ) : (
                  <motion.div key="minimal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col justify-between p-5 relative">
                    <span className="font-sans text-[10px] uppercase tracking-widest text-[#737373] font-semibold">[ ACTIVE SCOPE ]</span>

                    <div className="flex flex-col items-center justify-center flex-1">
                      <div className="font-mono text-4xl tracking-tighter text-white">37<span className="text-[#a3a3a3]">K</span></div>
                      <div className="font-mono text-[10px] text-[#737373] mt-2 text-center leading-relaxed">
                        FILES ACROSS<br />31 PROJECTS
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Tile>

            {/* Tile C: Model Specs */}
            <Tile
              onClick={() => toggleTile("engine")}
              span={getEngineSpan()}
            >
              <AnimatePresence mode="wait">
                {activeTileId === "engine" ? (
                  <ExpandedTileContent key="expanded" content={expandedContent["engine"]} onClose={() => setActiveTileId(null)} />
                ) : (
                  <motion.div key="minimal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col overflow-hidden">
                    <div className="p-5 pb-0 flex justify-between items-start">
                      <span className="font-sans text-[10px] uppercase tracking-widest text-[#737373] font-semibold flex items-center gap-2">
                        <Activity className="w-3 h-3 text-white" /> [ PREDICTIVE ENGINE ]
                      </span>
                      <span className="font-mono text-[9px] text-[#737373]">[COX-PH]</span>
                    </div>

                    <div className="flex px-5 pt-4 pb-2 gap-8 relative z-10">
                      <div>
                        <div className="font-mono text-[10px] text-[#737373] mb-1">C-INDEX</div>
                        <div className="font-mono text-3xl tracking-tighter text-white">0.80</div>
                      </div>
                      <div>
                        <div className="font-mono text-[10px] text-[#737373] mb-1">AUC-ROC</div>
                        <div className="font-mono text-3xl tracking-tighter text-[#a3a3a3]">0.660</div>
                      </div>
                    </div>

                    <div className="flex-1 w-full mt-auto opacity-50 relative -bottom-2 pointer-events-none">
                      <InViewTrigger>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={[
                            { v: 0.5 }, { v: 0.52 }, { v: 0.51 }, { v: 0.58 }, { v: 0.55 }, { v: 0.62 }, { v: 0.60 }, { v: 0.66 }
                          ]} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                            <Area type="monotone" dataKey="v" stroke="#ffffff" fill="url(#colorWhite)" strokeWidth={1} animationDuration={1500} />
                            <defs>
                              <linearGradient id="colorWhite" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.white} stopOpacity={0.05} /><stop offset="95%" stopColor={COLORS.white} stopOpacity={0} /></linearGradient>
                            </defs>
                          </AreaChart>
                        </ResponsiveContainer>
                      </InViewTrigger>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Tile>

            {/* ROW 2: Horizons */}
            <Tile
              onClick={() => toggleTile("horizons")}
              span={getHorizonsSpan()}
            >
              <AnimatePresence mode="wait">
                {activeTileId === "horizons" ? (
                  <ExpandedTileContent key="expanded" content={expandedContent["horizons"]} onClose={() => setActiveTileId(null)} />
                ) : (
                  <motion.div key="minimal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
                    <div className="p-5 border-b border-border flex justify-between items-center">
                      <span className="font-sans text-[10px] uppercase tracking-widest text-[#737373] font-semibold">[ HORIZONS ]</span>
                      <span className="font-mono text-[9px] text-[#737373]">[KAPLAN-MEIER]</span>
                    </div>
                    <div className="flex-1 p-4 pointer-events-none">
                      <InViewTrigger>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={kmCurveData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="2 2" stroke="#262626" vertical={false} />
                            <XAxis dataKey="days" tick={{ fill: "#737373", fontSize: 10, fontFamily: "monospace" }} tickFormatter={v => `${v}d`} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: "#737373", fontSize: 10, fontFamily: "monospace" }} domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`} axisLine={false} tickLine={false} />
                            <RechartsTooltip content={<ChartTooltip formatter={v => `${(v * 100).toFixed(1)}%`} />} />
                            <Area type="monotone" dataKey="lowRisk" stroke={COLORS.green} fill="url(#colorGreen)" strokeWidth={2} animationDuration={2000} />
                            <Area type="monotone" dataKey="overall" stroke={COLORS.white} fill="url(#colorWhite)" strokeWidth={2} animationDuration={2000} />
                            <Area type="monotone" dataKey="highRisk" stroke={COLORS.red} fill="url(#colorRed)" strokeWidth={2} animationDuration={2000} />
                            <defs>
                              <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.green} stopOpacity={0.1} /><stop offset="95%" stopColor={COLORS.green} stopOpacity={0} /></linearGradient>
                              <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.red} stopOpacity={0.1} /><stop offset="95%" stopColor={COLORS.red} stopOpacity={0} /></linearGradient>
                            </defs>
                          </AreaChart>
                        </ResponsiveContainer>
                      </InViewTrigger>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Tile>

            {/* ROW 2: Stratification */}
            <Tile
              onClick={() => toggleTile("strat")}
              span={getStratSpan()}
            >
              <AnimatePresence mode="wait">
                {activeTileId === "strat" ? (
                  <ExpandedTileContent key="expanded" content={expandedContent["strat"]} onClose={() => setActiveTileId(null)} />
                ) : (
                  <motion.div key="minimal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
                    <div className="p-5 border-b border-border flex justify-between items-center">
                      <span className="font-sans text-[10px] uppercase tracking-widest text-[#737373] font-semibold">[ STRATIFICATION ]</span>
                      <span className="font-mono text-[9px] text-[#737373]">[RISK TIERS]</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center p-5 pointer-events-none">
                      <div className="h-[180px] w-full">
                        <InViewTrigger>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={riskTiers} dataKey="count" nameKey="tier" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none" animationDuration={1500} animationEasing="ease-out">
                                {riskTiers.map(e => <Cell key={e.tier} fill={TIER_COLORS[e.tier]} />)}
                              </Pie>
                              <RechartsTooltip content={({ active, payload }) => {
                                if (!active || !payload?.[0]) return null;
                                const d = payload[0].payload;
                                return <div className="bg-[#000] border border-[#262626] rounded-lg px-3 py-2 text-xs">
                                  <div className="font-sans font-bold uppercase text-[9px] tracking-widest mb-1" style={{ color: TIER_COLORS[d.tier] }}>{d.tier}</div>
                                  <div className="font-mono text-white">{d.count.toLocaleString()} <span className="text-[#737373]">FILES</span></div>
                                </div>;
                              }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </InViewTrigger>
                      </div>
                      <div className="w-full space-y-3 mt-4">
                        {riskTiers.map(t => (
                          <div key={t.tier} className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <span className="w-2 h-2 rounded-full" style={{ background: TIER_COLORS[t.tier] }} />
                              <span className="font-sans text-xs font-medium text-[#a3a3a3] uppercase tracking-widest">{t.tier}</span>
                            </div>
                            <div className="font-mono text-sm text-white">{t.count.toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Tile>

            {/* ROW 3: Hazard Text Tile (2 col) + Table (4 col) */}
            <Tile span="col-span-1 md:col-span-1 lg:col-span-2" className="h-[500px]">
              <div className="p-5 border-b border-border flex justify-between items-center">
                <span className="font-sans text-[10px] uppercase tracking-widest text-[#737373] font-semibold">[ HAZARD INTELLIGENCE ]</span>
                <span className="font-mono text-[9px] text-[#737373]">[COX PH COVARIATES]</span>
              </div>
              <div className="flex-1 p-6 overflow-y-auto space-y-8">
                <div>
                  <p className="font-sans text-sm text-[#a3a3a3] leading-relaxed mb-6">
                    Cox Proportional Hazards regression identifies structural metrics that act as risk multipliers. <span className="text-white">HR &gt; 1</span> significantly accelerates the probability of hard failure.
                  </p>
                  <div className="space-y-3">
                    {coxCoefficients.slice(0, 4).map(c => (
                      <div key={c.feature} className="flex justify-between items-center bg-transparent p-3 rounded-2xl border border-border">
                        <span className="font-mono text-xs text-white truncate max-w-[150px]">{c.feature}</span>
                        <span className="font-mono text-xs text-red-400">HR {c.coef.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-[#262626] pt-6">
                  <h5 className="font-sans text-[10px] uppercase tracking-widest text-[#737373] font-semibold mb-4">AST Anomalies</h5>
                  <div className="font-mono text-xs text-white space-y-2">
                    <div className="flex justify-between"><span>max_nesting_depth</span><span className="text-[#a3a3a3]">p=0.010</span></div>
                    <div className="flex justify-between"><span>import_count</span><span className="text-[#a3a3a3]">p=0.001</span></div>
                    <div className="flex justify-between"><span>has_inheritance</span><span className="text-[#a3a3a3]">p=0.045</span></div>
                  </div>
                </div>
              </div>
            </Tile>

            <Tile span="col-span-1 md:col-span-2 lg:col-span-4" className="h-[500px]">
              <div className="p-5 border-b border-border flex justify-between items-center">
                <span className="font-sans text-[10px] uppercase tracking-widest text-[#737373] font-semibold">[ REFACTORING QUEUE ]</span>
                <span className="font-mono text-[9px] text-[#737373]">[{roiPriorities.length} ITEMS]</span>
              </div>
              <div className="flex-1 flex overflow-hidden">
                <div className="flex-[2] overflow-auto border-r border-[#262626]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-[#111111] z-10">
                      <TableRow className="border-[#262626] hover:bg-transparent">
                        <TableHead className="pl-6 font-sans text-[9px] font-semibold uppercase tracking-widest text-[#737373] w-12">#</TableHead>
                        <TableHead className="font-sans text-[9px] font-semibold uppercase tracking-widest text-[#737373]">Source File</TableHead>
                        <TableHead className="font-sans text-[9px] font-semibold uppercase tracking-widest text-[#737373]">Loss</TableHead>
                        <TableHead className="font-sans text-[9px] font-semibold uppercase tracking-widest text-[#737373]">ROI</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roiPriorities.map(row => (
                        <TableRow key={row.rank} onClick={() => setSelectedFile(row)}
                          className={`cursor-pointer group border-[#262626] transition-colors ${selectedFile?.rank === row.rank ? "bg-[#1a1a1a]" : "hover:bg-[#1a1a1a]"}`}>
                          <TableCell className="pl-6 font-mono text-[10px] text-[#737373]">{row.rank}</TableCell>
                          <TableCell className={`font-mono text-[11px] truncate max-w-[200px] transition-colors ${selectedFile?.rank === row.rank ? "text-white" : "text-[#a3a3a3] group-hover:text-white"}`}>{row.file}</TableCell>
                          <TableCell className="font-mono text-[11px] text-red-400">${row.expectedLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                          <TableCell className="font-mono text-[11px] text-green-400">{row.roiPercent.toFixed(0)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Inspector */}
                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                    <TierBadge tier={selectedFile.tier} />
                    <a href={`https://github.com/search?q=repo:apache/${selectedFile.project.replace("org.apache:", "")}+filename:${selectedFile.file}&type=code`} target="_blank" rel="noopener noreferrer" className="font-sans text-[10px] uppercase tracking-widest text-white hover:text-[#a3a3a3] transition-colors flex items-center gap-2">View on GitHub <Maximize2 className="w-3 h-3" /></a>
                  </div>
                  <div className="font-mono text-xs text-[#a3a3a3] break-all leading-loose mb-8">
                    {selectedFile.project.replace("org.apache:", "")}/<br />
                    <span className="text-white">{selectedFile.file}</span>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <div className="font-sans text-[9px] uppercase tracking-widest text-[#737373] mb-1">Probability of Failure (1 Year)</div>
                      <div className="font-mono text-3xl text-red-400">{(selectedFile.pFail365 * 100).toFixed(1)}%</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="font-sans text-[9px] uppercase tracking-widest text-[#737373] mb-1">Expected Loss</div>
                        <div className="font-mono text-lg text-white">${selectedFile.expectedLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                      </div>
                      <div>
                        <div className="font-sans text-[9px] uppercase tracking-widest text-[#737373] mb-1">Fix Cost</div>
                        <div className="font-mono text-lg text-[#a3a3a3]">${selectedFile.costRefactor.toFixed(0)}</div>
                      </div>
                    </div>
                    <div className="pt-6 border-t border-[#262626] grid grid-cols-3 gap-2 text-center">
                      <div><div className="font-sans text-[9px] uppercase tracking-widest text-[#737373]">Bugs</div><div className="font-mono text-sm text-white mt-1">{selectedFile.bugs}</div></div>
                      <div><div className="font-sans text-[9px] uppercase tracking-widest text-[#737373]">Smells</div><div className="font-mono text-sm text-white mt-1">{selectedFile.smells}</div></div>
                      <div><div className="font-sans text-[9px] uppercase tracking-widest text-[#737373]">Commits</div><div className="font-mono text-sm text-white mt-1">{selectedFile.commits}</div></div>
                    </div>
                  </div>
                </div>
              </div>
            </Tile>

            {/* ROW 4: Live Demo */}
            <LiveDemoSection />

            {/* ROW 5: GitHub Link */}
            <GithubTile />

          </main>
        </LayoutGroup>
      </div>

    </div>
  );
}
