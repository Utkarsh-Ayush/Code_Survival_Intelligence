"use client";

import { useState, useEffect, useRef } from "react";
import {
  Shield, Github, Linkedin, Users, Code2, Brain,
  BarChart3, GitBranch, DollarSign, Target, Timer,
  Database, Cpu, Zap, Sparkles, ExternalLink, Heart,
} from "lucide-react";

/* ── Scroll Reveal Hook ─────────────────────────────────── */
function useScrollReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("revealed"); }),
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    el.querySelectorAll(".scroll-reveal, .scroll-reveal-left, .scroll-reveal-right, .scroll-reveal-scale")
      .forEach((e) => obs.observe(e));
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ── Developer Data ─────────────────────────────────────── */
const DEVELOPERS = [
  { name: "Chiranjeev Rout", role: "Lead Developer & ML Engineer", avatar: "CR", color: "#F59E0B", photo: "https://media.licdn.com/dms/image/v2/D5603AQHGaRKj6JdkWA/profile-displayphoto-crop_800_800/B56ZsISKB2JQAI-/0/1765370537742?e=1779321600&v=beta&t=Jv4ImJPfR-yVzXxhQtM-4oRlx1o5RxODSfFInrVo5_k", github: "http://github.com/Chiron-R", linkedin: "https://www.linkedin.com/in/chiranjeevrout/" },
  { name: "Rahul Mallik", role: "Backend & Data Pipeline", avatar: "RM", color: "#F59E0B", photo: "https://media.licdn.com/dms/image/v2/D4D03AQFX-aTuyeKZdQ/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1691940730382?e=2147483647&v=beta&t=Krm3C0Lc4Cc0mPaUYDsQ2JwdU6LTed3UYagQ60NvVe4", github: "https://github.com/rahul-mallik", linkedin: "https://www.linkedin.com/in/rahul-mallik-raool/" },
  { name: "Utkarsh Ayush", role: "Frontend & Visualization", avatar: "UA", color: "#10B981", photo: "https://media.licdn.com/dms/image/v2/D4E03AQF1oEIilJZc3A/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1720266225513?e=1779321600&v=beta&t=2TsN6k0GvGXxYCVIT-l-f3C8DTC--k_u0x2bAOxpY5k", github: "https://github.com/Utkarsh-Ayush", linkedin: "https://www.linkedin.com/in/utkarsh-ayush-a752702b9/" },
  { name: "Komolika Sathpathy", role: "Research & Documentation", avatar: "KS", color: "#F59E0B", glowColor: "#FFFFFF", photo: "https://media.licdn.com/dms/image/v2/D4D03AQGkkzYlsQM5_Q/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1683568447473?e=1779321600&v=beta&t=DXI3Nasj0CsP_sj5bN_uFLtNMuuwkf5v00nerT15Pyg", github: null, linkedin: "https://linkedin.com" },
];

const FEATURES = [
  { icon: BarChart3, title: "Survival Analysis", desc: "Cox Proportional Hazards model with C-index of 0.80 predicting file failure timelines.", color: "#6366F1" },
  { icon: DollarSign, title: "ROI Engine", desc: "Converts failure probabilities into dollar-value Expected Loss and refactoring ROI.", color: "#10B981" },
  { icon: Brain, title: "Model Comparison", desc: "Cox PH vs Random Forest vs Logistic Regression with ROC, Brier, and radar metrics.", color: "#F59E0B" },
  { icon: GitBranch, title: "AST Parsing", desc: "Tree-sitter extracts 20 structural features at historical fault-inducing commits.", color: "#8B5CF6" },
  { icon: Target, title: "Risk Tiering", desc: "Automatic CRITICAL/HIGH/MEDIUM/LOW classification based on failure probability.", color: "#EF4444" },
  { icon: Timer, title: "Multi-Horizon", desc: "Predictions at 90, 180, 365, and 730 day failure horizons per file.", color: "#EC4899" },
];

const TIMELINE = [
  { phase: "Phase 1", title: "Data Collection", desc: "Cloned 31 Apache Java projects from the Lenarduzzi et al. Technical Debt Dataset V2.", icon: Database },
  { phase: "Phase 2", title: "Feature Engineering", desc: "Extracted 16 DB-level metrics and 20 AST structural features using Tree-sitter.", icon: Code2 },
  { phase: "Phase 3", title: "Model Training", desc: "Trained Cox PH, Random Forest, and Logistic Regression with time-aware splitting.", icon: Brain },
  { phase: "Phase 4", title: "ROI Scoring", desc: "Built financial engine converting survival probabilities into refactoring priorities.", icon: DollarSign },
  { phase: "Phase 5", title: "Dashboard", desc: "Created interactive Next.js dashboard with 11 pages of analytics and visualizations.", icon: Zap },
];

const STATS = [
  { label: "Repositories", value: "31", sub: "Apache Java" },
  { label: "Commits", value: "154K+", sub: "Analyzed" },
  { label: "Files", value: "37,102", sub: "Scored" },
  { label: "Features", value: "36", sub: "DB + AST" },
  { label: "Models", value: "3", sub: "Compared" },
  { label: "C-Index", value: "0.80", sub: "Test Score" },
];

export default function AboutPage() {
  const containerRef = useScrollReveal();
  const [activeDevIdx, setActiveDevIdx] = useState(null);

  return (
    <div ref={containerRef} className="space-y-16 max-w-[1100px] mx-auto pb-12">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="text-center pt-4 scroll-reveal">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[var(--accent)] to-[var(--gradient-end)] flex items-center justify-center mx-auto mb-6 animate-float shadow-xl shadow-indigo-500/20">
          <Shield size={36} className="text-white" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-3">
          About Code<span className="gradient-text">Survival</span> Intelligence
        </h1>
        <p className="text-base text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
          A predictive analytics platform that combines survival analysis, machine learning, and AST parsing to predict when code will fail — and convert risk into dollar-value refactoring recommendations.
        </p>
      </div>

      {/* ── Stats Bar ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {STATS.map((stat, i) => (
          <div key={stat.label} className="scroll-reveal-scale kpi-card text-center" style={{ transitionDelay: `${i * 80}ms` }}>
            <div className="text-2xl font-bold text-[var(--accent)] mb-0.5">{stat.value}</div>
            <div className="text-xs font-semibold text-[var(--text-primary)]">{stat.label}</div>
            <div className="text-[10px] text-[var(--text-muted)]">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* ── What It Does ────────────────────────────────────── */}
      <div>
        <div className="text-center mb-10 scroll-reveal">
          <span className="text-xs uppercase tracking-widest text-[var(--accent)] font-semibold">Capabilities</span>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mt-2">What It Does</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES.map((feat, i) => (
            <div key={feat.title} className="scroll-reveal-scale glass-card glass-card-lift p-5 group" style={{ transitionDelay: `${i * 80}ms` }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
                style={{ background: `${feat.color}15`, border: `1px solid ${feat.color}30` }}>
                <feat.icon size={20} style={{ color: feat.color }} />
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1.5">{feat.title}</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Project Timeline ────────────────────────────────── */}
      <div>
        <div className="text-center mb-10 scroll-reveal">
          <span className="text-xs uppercase tracking-widest text-[var(--gradient-mid)] font-semibold">Journey</span>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mt-2">Project Timeline</h2>
        </div>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-[2px] bg-gradient-to-b from-[var(--accent)] via-[var(--gradient-mid)] to-[var(--gradient-end)]" />

          <div className="space-y-8">
            {TIMELINE.map((item, i) => {
              const isLeft = i % 2 === 0;
              return (
                <div key={item.phase} className={`scroll-reveal relative flex items-start gap-6 ${isLeft ? "md:flex-row" : "md:flex-row-reverse"}`}
                  style={{ transitionDelay: `${i * 120}ms` }}>
                  {/* Dot */}
                  <div className="absolute left-6 md:left-1/2 -translate-x-1/2 w-12 h-12 rounded-xl bg-[var(--card-bg)] border-2 border-[var(--accent)] flex items-center justify-center z-10 shadow-lg shadow-indigo-500/20">
                    <item.icon size={20} className="text-[var(--accent)]" />
                  </div>

                  {/* Content */}
                  <div className={`ml-20 md:ml-0 md:w-[calc(50%-40px)] glass-card p-5 ${isLeft ? "md:mr-auto md:text-right" : "md:ml-auto"}`}>
                    <span className="text-xs text-[var(--accent)] font-semibold">{item.phase}</span>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mt-1">{item.title}</h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-1.5">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Meet the Team ───────────────────────────────────── */}
      <div>
        <div className="text-center mb-10 scroll-reveal">
          <span className="text-xs uppercase tracking-widest text-[var(--success)] font-semibold">Team</span>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mt-2 flex items-center justify-center gap-2">
            <Users size={24} className="text-[var(--text-muted)]" /> Meet the Developers
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          {DEVELOPERS.map((dev, i) => (
            <div
              key={dev.name}
              className="scroll-reveal-scale glass-card p-6 text-center group"
              style={{ transitionDelay: `${i * 100}ms` }}
              onMouseEnter={() => setActiveDevIdx(i)}
              onMouseLeave={() => setActiveDevIdx(null)}
            >
              {/* Avatar */}
              <div className="relative mx-auto mb-5 w-20 h-20">
                <div
                  className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center text-2xl font-bold text-white transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3 shadow-xl"
                  style={{ background: `linear-gradient(135deg, ${dev.color}, ${dev.color}aa)`, boxShadow: activeDevIdx === i ? `0 12px 40px ${dev.glowColor ?? dev.color}40` : `0 8px 24px ${dev.glowColor ?? dev.color}20` }}
                >
                  {dev.photo ? (
                    <img src={dev.photo} alt={dev.name} className="h-full w-full object-cover" />
                  ) : (
                    dev.avatar
                  )}
                </div>
                {/* Online dot */}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[var(--background)] flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-[var(--success)] animate-pulse" />
                </div>
              </div>

              {/* Info */}
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">{dev.name}</h3>
              <p className="text-xs text-[var(--text-muted)] mb-4">{dev.role}</p>

              {/* Social Links */}
              <div className="flex items-center justify-center gap-3">
                {dev.github && (
                  <a href={dev.github} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 bg-[rgba(255,255,255,0.05)] border border-[var(--card-border)] hover:border-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.1)] hover:scale-110">
                    <Github size={16} className="text-[var(--text-secondary)]" />
                  </a>
                )}
                <a href={dev.linkedin} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 bg-[rgba(255,255,255,0.05)] border border-[var(--card-border)] hover:border-[#0A66C2] hover:bg-[rgba(10,102,194,0.1)] hover:scale-110">
                  <Linkedin size={16} className="text-[var(--text-secondary)]" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tech & Acknowledgements ─────────────────────────── */}
      <div className="scroll-reveal glass-card p-8">
        <div className="flex items-start gap-4">
          <Heart size={20} className="text-[var(--danger)] shrink-0 mt-1" />
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Acknowledgements</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Built as a Final Year Project. The underlying dataset is the <strong className="text-[var(--text-primary)]">Technical Debt Dataset V2</strong> by Lenarduzzi et al., containing SonarQube analysis results from 31 Apache Java projects. The survival analysis methodology is inspired by reliability engineering principles adapted for software maintenance. Special thanks to the open-source communities behind lifelines, scikit-learn, Tree-sitter, Next.js, and the Apache Software Foundation.
            </p>
          </div>
        </div>
      </div>

      {/* ── Source Code CTA ─────────────────────────────────── */}
      <div className="scroll-reveal-scale text-center">
        <a href="https://github.com/Chiron-R/code-survival-intelligence" target="_blank" rel="noopener noreferrer"
          className="btn-primary inline-flex items-center gap-2 text-base py-3.5 px-8 glow-accent">
          <Github size={20} /> View on GitHub <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}
