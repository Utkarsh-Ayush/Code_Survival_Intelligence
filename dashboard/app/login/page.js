"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Mail, Lock, Eye, EyeOff, ArrowRight, Zap } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Demo auth — accept demo credentials or any filled form
    if (
      (email === "demo@csi.edu" && password === "demo123") ||
      (email.length > 0 && password.length > 0)
    ) {
      // Store user session in localStorage (simplified for demo)
      localStorage.setItem(
        "csi_user",
        JSON.stringify({
          name: email === "demo@csi.edu" ? "Demo User" : email.split("@")[0],
          email,
          role: "student",
          loggedInAt: new Date().toISOString(),
        })
      );
      setTimeout(() => router.push("/dashboard"), 800);
    } else {
      setError("Please enter valid credentials.");
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail("demo@csi.edu");
    setPassword("demo123");
  };

  return (
    <div className="min-h-screen flex relative">
      {/* Background */}
      <div className="fixed inset-0 hero-gradient pointer-events-none" />
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-30" />

      {/* ── Left Panel — Branding ──────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-between p-12">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--gradient-end)] flex items-center justify-center">
            <Shield size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold text-[var(--text-primary)]">
            Code<span className="gradient-text">Survival</span>
          </span>
        </Link>

        <div className="space-y-8">
          <h2 className="text-4xl font-bold text-[var(--text-primary)] leading-tight">
            Transform code metrics into
            <br />
            <span className="gradient-text">financial intelligence</span>
          </h2>
          <p className="text-[var(--text-secondary)] max-w-md leading-relaxed">
            Predict failure timelines with Cox PH survival models. Calculate
            dollar-value ROI for every refactoring decision. Powered by 154K+
            commits across 31 Apache projects.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-lg">
            {[
              { label: "C-Index", value: "0.80" },
              { label: "Net Savings", value: "$3.25M" },
              { label: "Files", value: "37,102" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold text-[var(--text-primary)]">
                  {stat.value}
                </div>
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-[var(--text-muted)]">
          © 2026 Code Survival Intelligence • Final Year Project
        </p>
      </div>

      {/* ── Right Panel — Login Form ───────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--gradient-end)] flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-[var(--text-primary)]">
              Code<span className="gradient-text">Survival</span>
            </span>
          </div>

          <div className="glass-card p-8 animate-fade-in-up" style={{ animationFillMode: "forwards" }}>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              Welcome back
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mb-8">
              Sign in to access the analytics dashboard.
            </p>

            {/* Demo Account Button */}
            <button
              onClick={fillDemo}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-[var(--accent)] text-sm font-medium text-[var(--accent-hover)] hover:bg-[var(--accent-glow)] transition-all mb-6"
            >
              <Zap size={16} />
              Use Demo Account (Quick Access)
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-[var(--card-border)]" />
              <span className="text-xs text-[var(--text-muted)]">or sign in with email</span>
              <div className="flex-1 h-px bg-[var(--card-border)]" />
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-[var(--danger-bg)] border border-[rgba(239,68,68,0.2)] text-sm text-red-400">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input-field pl-12"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="input-field pl-12 pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-[var(--text-secondary)] cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-[var(--card-border)] bg-[var(--card-bg)] accent-[var(--accent)]"
                  />
                  Remember me
                </label>
                <span className="text-[var(--accent-hover)] hover:underline cursor-pointer">
                  Forgot password?
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-[var(--text-muted)] mt-6">
              Don't have an account?{" "}
              <Link
                href="/signup"
                className="text-[var(--accent-hover)] hover:underline font-medium"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
