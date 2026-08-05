"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  Activity,
  DollarSign,
  GitBranch,
  BarChart3,
  FolderSearch,
  ScanSearch,
  User,
  Settings,
  Info,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Sparkles,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/analyze", label: "Analyze Repo", icon: ScanSearch },
  { href: "/dashboard/survival", label: "Survival Analysis", icon: Activity },
  { href: "/dashboard/roi", label: "ROI Financial", icon: DollarSign },
  { href: "/dashboard/models", label: "Model Comparison", icon: BarChart3 },
  { href: "/dashboard/ast", label: "AST Features", icon: GitBranch },
  { href: "/dashboard/files", label: "File Explorer", icon: FolderSearch },
];

const bottomItems = [
  { href: "/dashboard/about", label: "About Us", icon: Info },
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

/* ── Guided Tour Steps ────────────────────────────────── */
const tourSteps = [
  {
    title: "Welcome to CodeSurvival Intelligence! 🎉",
    description: "This dashboard predicts when your code will fail using survival analysis, machine learning, and AST parsing — then converts risk into dollar-value refactoring priorities.",
    target: null,
  },
  {
    title: "Step 1: Analyze a Repository",
    description: "Start by providing a GitHub repository URL. The pipeline will clone it, extract 36 code metrics, run the Cox PH model, and generate file-level risk scores.",
    target: "/dashboard/analyze",
    icon: ScanSearch,
  },
  {
    title: "Step 2: View Your Overview",
    description: "After analysis, the Overview page shows KPIs: total files at risk, expected financial loss, net savings potential, and risk tier distribution.",
    target: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Step 3: Survival Curves",
    description: "Explore Kaplan-Meier survival curves and Cox PH hazard ratios to understand which code features most influence failure probability over time.",
    target: "/dashboard/survival",
    icon: Activity,
  },
  {
    title: "Step 4: ROI Analysis",
    description: "The ROI engine converts failure probabilities into dollar values. Adjust financial parameters (hourly rate, downtime cost) and see which files give the highest return on refactoring investment.",
    target: "/dashboard/roi",
    icon: DollarSign,
  },
  {
    title: "Step 5: Compare Models",
    description: "Compare Cox PH, Random Forest, and Logistic Regression side-by-side with ROC curves, Brier scores, radar charts, and feature importance rankings.",
    target: "/dashboard/models",
    icon: BarChart3,
  },
  {
    title: "Step 6: Explore Results",
    description: "Use the File Explorer to search, filter by risk tier, and drill into any file's failure probabilities, financial breakdown, and refactoring recommendations.",
    target: "/dashboard/files",
    icon: FolderSearch,
  },
  {
    title: "You're All Set! 🚀",
    description: "Start by analyzing a repository to generate your first risk report. Click 'Get Started' to head to the Analyze page now!",
    target: "/dashboard/analyze",
  },
];

/* ── Tour Component ───────────────────────────────────── */
function GuidedTour({ onComplete }) {
  const [step, setStep] = useState(0);
  const current = tourSteps[step];
  const isFirst = step === 0;
  const isLast = step === tourSteps.length - 1;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-lg mx-4 glass-card p-8 animate-fade-in-up"
        style={{ animationFillMode: "forwards" }}
      >
        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {tourSteps.map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === step ? 24 : 8,
                background: i === step ? "var(--accent)" : i < step ? "var(--success)" : "var(--card-border)",
              }}
            />
          ))}
        </div>

        {/* Icon */}
        {current.icon && (
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--gradient-mid)] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-500/20">
            <current.icon size={28} className="text-white" />
          </div>
        )}
        {!current.icon && (
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--gradient-end)] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-500/20">
            <Sparkles size={28} className="text-white" />
          </div>
        )}

        {/* Content */}
        <h2 className="text-xl font-bold text-[var(--text-primary)] text-center mb-3">
          {current.title}
        </h2>
        <p className="text-sm text-[var(--text-secondary)] text-center leading-relaxed mb-8">
          {current.description}
        </p>

        {/* Step Counter */}
        <div className="text-center text-xs text-[var(--text-muted)] mb-4">
          {step + 1} of {tourSteps.length}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between gap-3">
          {!isFirst ? (
            <button
              onClick={() => setStep(step - 1)}
              className="btn-secondary flex items-center gap-2 text-sm py-2.5 px-5"
            >
              <ChevronLeft size={16} />
              Previous
            </button>
          ) : (
            <button
              onClick={onComplete}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Skip Tour
            </button>
          )}

          {isLast ? (
            <button
              onClick={onComplete}
              className="btn-primary flex items-center gap-2 text-sm py-2.5 px-6"
            >
              Get Started
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={() => setStep(step + 1)}
              className="btn-primary flex items-center gap-2 text-sm py-2.5 px-6"
            >
              Next
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Dashboard Layout
   ══════════════════════════════════════════════════════════ */
export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const user = { name: "Researcher", email: "researcher@csi.dev" };
  const handleLogout = () => {};

  const isActive = (href) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen flex bg-[var(--background)]">


      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-[var(--sidebar-bg)] border-r border-[var(--card-border)] flex flex-col z-50 transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-[var(--card-border)]">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--gradient-end)] flex items-center justify-center">
              <Shield size={18} className="text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-[var(--text-primary)] block leading-tight">
                CodeSurvival
              </span>
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                Intelligence
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest px-3 mb-3">
            Analytics
          </div>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`sidebar-link ${isActive(item.href) ? "active" : ""}`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}

          <div className="h-px bg-[var(--card-border)] my-4" />
          <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest px-3 mb-3">
            Account
          </div>
          {bottomItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`sidebar-link ${isActive(item.href) ? "active" : ""}`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User Section */}
        <div className="px-3 py-4 border-t border-[var(--card-border)]">
          <div className="flex items-center gap-3 px-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--gradient-mid)] flex items-center justify-center text-white text-sm font-bold">
              {user.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                {user.name}
              </div>
              <div className="text-xs text-[var(--text-muted)] truncate">
                {user.email}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 flex items-center gap-4 px-6 border-b border-[var(--card-border)] bg-[var(--background)]/80 backdrop-blur-xl">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <Menu size={22} />
          </button>
          <div className="flex-1" />
          {/* Replay Tour */}
          <button
            onClick={() => {
              localStorage.removeItem("csi_tour_done");
              setShowTour(true);
            }}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors flex items-center gap-1"
            title="Replay guided tour"
          >
            <Sparkles size={14} />
            <span className="hidden sm:block">Tour</span>
          </button>
          {/* User dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--gradient-mid)] flex items-center justify-center text-white text-xs font-bold">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <span className="hidden sm:block">{user.name}</span>
              <ChevronDown size={14} />
            </button>
            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 top-12 w-48 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-2xl z-50 py-2">
                  <Link
                    href="/dashboard/profile"
                    className="block px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-glow)]"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    className="block px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-glow)]"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Settings
                  </Link>
                  <div className="h-px bg-[var(--card-border)] my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[var(--danger-bg)]"
                  >
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
