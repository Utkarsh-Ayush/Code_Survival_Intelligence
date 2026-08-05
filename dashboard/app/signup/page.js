"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Mail, Lock, User, Eye, EyeOff, ArrowRight, X, ScrollText } from "lucide-react";

/* ── T&C Content ─────────────────────────────────────────── */
const TC_CONTENT = [
  { title: "1. Acceptance of Terms", text: "By creating an account and using the Code Survival Intelligence platform (\"the Service\"), you acknowledge that you have read, understood, and agree to be bound by these Terms & Conditions. If you do not agree, you may not use the Service." },
  { title: "2. Description of Service", text: "Code Survival Intelligence is a predictive analytics platform that combines survival analysis, machine learning (Cox Proportional Hazards, Random Forest, Logistic Regression), and Abstract Syntax Tree (AST) parsing to predict software file failure timelines and provide ROI-driven refactoring recommendations. The Service analyzes publicly available code repositories to generate risk scores, survival probabilities, and financial impact assessments." },
  { title: "3. User Accounts", text: "You must provide accurate and complete registration information. You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized access to your account. One account per individual is permitted. Sharing account credentials with unauthorized parties is strictly prohibited." },
  { title: "4. Acceptable Use", text: "You agree to use the Service only for lawful purposes and in accordance with these Terms. You shall not: (a) use the Service to analyze repositories you do not have authorization to access; (b) attempt to reverse-engineer, decompile, or disassemble the underlying machine learning models; (c) use automated scripts to overload the analysis pipeline; (d) redistribute analysis results commercially without prior written consent; (e) submit malicious code designed to exploit the parsing engine." },
  { title: "5. Data & Privacy", text: "Repository Analysis: When you submit a repository URL for analysis, the system clones the repository temporarily, extracts code metrics (churn, ownership, complexity, SonarQube debt) and AST structural features, then deletes the cloned source. No source code is permanently stored. Analysis Results: Risk scores, survival probabilities, and ROI calculations are stored in association with your account for dashboard access. Personal Data: Your name, email, and usage logs are stored securely and not shared with third parties." },
  { title: "6. Intellectual Property", text: "The Cox PH survival models, feature extraction pipeline, ROI scoring engine, AST parsing algorithms, and all associated visualizations remain the intellectual property of the Code Survival Intelligence project. You retain all rights to your analyzed repositories and the resulting analysis reports." },
  { title: "7. Disclaimer of Warranties", text: "THE SERVICE IS PROVIDED \"AS IS\" WITHOUT WARRANTIES OF ANY KIND. Prediction models are statistical in nature — a file predicted to have a 70% failure probability at 365 days may or may not actually fail. Financial ROI projections (expected loss, refactoring cost, net savings) are estimates based on configurable parameters and should not be treated as financial advice. Model accuracy metrics (C-Index: 0.80, AUC-ROC: 0.660) represent performance on the training dataset (Lenarduzzi et al. Technical Debt V2) and may vary on unseen repositories." },
  { title: "8. Limitation of Liability", text: "In no event shall Code Survival Intelligence, its developers, or affiliated institutions be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service, including but not limited to: software failures that were not predicted by the model, financial losses incurred from refactoring decisions based on ROI recommendations, or data loss resulting from service interruptions." },
  { title: "9. Academic Use", text: "This platform was developed as a final year academic project. The underlying research, dataset (Technical Debt Dataset V2 by Lenarduzzi et al.), and methodology are documented for academic transparency. Users citing this work in academic publications should reference the project appropriately." },
  { title: "10. Modifications", text: "We reserve the right to modify these Terms at any time. Continued use of the Service after modifications constitutes acceptance of the updated Terms. Users will be notified of material changes via email or dashboard notification." },
  { title: "11. Termination", text: "We may suspend or terminate your access to the Service at our discretion, without prior notice, for conduct that we determine violates these Terms or is harmful to other users or the Service. Upon termination, your right to use the Service ceases immediately." },
  { title: "12. Contact", text: "For questions about these Terms, please contact the Code Survival Intelligence team through the project's GitHub repository or the designated email listed in your account settings." },
];

/* ── Email validation helper ─────────────────────────────── */
function validateEmail(email) {
  // Must have @ followed by domain with at least one dot and valid TLD
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
}

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [showTC, setShowTC] = useState(false);
  const [agreedTC, setAgreedTC] = useState(false);
  const [reachedBottom, setReachedBottom] = useState(false);
  const tcScrollRef = useRef(null);

  const strength =
    password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabels = ["", "Weak", "Medium", "Strong"];
  const strengthColors = ["", "#EF4444", "#F59E0B", "#10B981"];

  // Email real-time validation
  const handleEmailChange = (val) => {
    setEmail(val);
    if (val.length > 0 && !validateEmail(val)) {
      setEmailError("Enter a valid email (e.g. you@gmail.com)");
    } else {
      setEmailError("");
    }
  };

  // T&C scroll detection
  const handleTCScroll = () => {
    const el = tcScrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    if (atBottom && !reachedBottom) {
      setReachedBottom(true);
      setAgreedTC(true);
    }
  };

  const openTC = (e) => {
    e.preventDefault();
    setShowTC(true);
    setReachedBottom(false);
  };

  const closeTC = () => {
    setShowTC(false);
  };

  const handleSignup = (e) => {
    e.preventDefault();
    setError("");
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    if (!agreedTC) {
      setError("Please read and agree to the Terms & Conditions.");
      return;
    }
    setLoading(true);
    localStorage.setItem(
      "csi_user",
      JSON.stringify({ name, email, role: "student", loggedInAt: new Date().toISOString() })
    );
    // Clear tour flag so new user gets the guided tour
    localStorage.removeItem("csi_tour_done");
    localStorage.removeItem("csi_analysis_done");
    setTimeout(() => router.push("/dashboard"), 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 relative">
      <div className="fixed inset-0 hero-gradient pointer-events-none" />
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-30" />

      {/* Layout wrapper — shifts left when T&C opens */}
      <div
        className="flex items-start justify-center gap-6 w-full max-w-4xl relative z-10 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        style={{ transform: showTC ? "translateX(-80px)" : "translateX(0)" }}
      >
        {/* ── Signup Card ──────────────────────────────────── */}
        <div
          className="w-full transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{ maxWidth: showTC ? 380 : 448 }}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--gradient-end)] flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-[var(--text-primary)]">
              Code<span className="gradient-text">Survival</span>
            </span>
          </Link>

          <div className="glass-card p-7 animate-fade-in-up" style={{ animationFillMode: "forwards" }}>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Create an account</h1>
            <p className="text-sm text-[var(--text-secondary)] mb-7">Get access to the full analytics dashboard.</p>

            <form onSubmit={handleSignup} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-[var(--danger-bg)] border border-[rgba(239,68,68,0.2)] text-sm text-red-400">{error}</div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Full Name</label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" className="input-field pl-12" required />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Email</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text" value={email} onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="you@gmail.com" className={`input-field pl-12 ${emailError ? "!border-red-500" : ""}`} required
                  />
                </div>
                {emailError && <p className="text-xs text-red-400 mt-1.5">{emailError}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type={showPassword ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="Create a password"
                    className="input-field pl-12 pr-12" required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-[var(--card-border)] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(strength / 3) * 100}%`, background: strengthColors[strength] }} />
                    </div>
                    <span className="text-xs font-medium" style={{ color: strengthColors[strength] }}>{strengthLabels[strength]}</span>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm your password" className="input-field pl-12" required />
                </div>
              </div>

              {/* T&C Agreement */}
              <label className="flex items-start gap-2 text-sm text-[var(--text-secondary)] pt-1">
                <input
                  type="checkbox" checked={agreedTC} onChange={(e) => setAgreedTC(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-[var(--card-border)] accent-[var(--accent)]"
                />
                <span>
                  I agree to the{" "}
                  <button type="button" onClick={openTC} className="text-[var(--accent-hover)] underline hover:text-[var(--accent)] font-medium">
                    Terms & Conditions
                  </button>
                </span>
              </label>

              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Create Account <ArrowRight size={18} /></>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-[var(--text-muted)] mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-[var(--accent-hover)] hover:underline font-medium">Sign in</Link>
            </p>
          </div>
        </div>

        {/* ── T&C Panel (slides in from right) ─────────────── */}
        <div
          className="transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden shrink-0"
          style={{
            width: showTC ? 420 : 0,
            opacity: showTC ? 1 : 0,
            transform: showTC ? "translateX(0) scale(1)" : "translateX(40px) scale(0.95)",
          }}
        >
          <div className="glass-card w-[420px] h-[650px] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--card-border)] shrink-0">
              <div className="flex items-center gap-2">
                <ScrollText size={18} className="text-[var(--accent)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Terms & Conditions</h3>
              </div>
              <button onClick={closeTC} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div ref={tcScrollRef} onScroll={handleTCScroll} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <p className="text-xs text-[var(--text-muted)]">Last updated: May 2, 2026</p>
              {TC_CONTENT.map((section) => (
                <div key={section.title}>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">{section.title}</h4>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{section.text}</p>
                </div>
              ))}
              <div className="pt-4 pb-2 text-center">
                <p className="text-xs text-[var(--success)] font-medium">
                  {reachedBottom ? "✓ You've read the full Terms & Conditions" : "↓ Scroll to the bottom to agree"}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[var(--card-border)] shrink-0">
              <button
                onClick={() => { setAgreedTC(true); closeTC(); }}
                disabled={!reachedBottom}
                className="btn-primary w-full text-sm py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {reachedBottom ? "I Agree — Close" : "Read to the bottom first"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
