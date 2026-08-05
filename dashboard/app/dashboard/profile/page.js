"use client";

import { useState, useEffect } from "react";
import { User, Mail, Shield, Clock, Save, Camera } from "lucide-react";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("csi_user");
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      setName(u.name || "");
      setEmail(u.email || "");
    }
  }, []);

  const handleSave = () => {
    const updated = { ...user, name, email };
    localStorage.setItem("csi_user", JSON.stringify(updated));
    setUser(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <User size={24} className="text-[var(--accent)]" />
          Profile
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Manage your account information.</p>
      </div>

      {/* Avatar Section */}
      <div className="glass-card p-8 flex items-center gap-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--gradient-end)] flex items-center justify-center text-white text-2xl font-bold">
            {name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <button className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center justify-center hover:border-[var(--accent)] transition-colors">
            <Camera size={14} className="text-[var(--text-muted)]" />
          </button>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{name}</h2>
          <p className="text-sm text-[var(--text-muted)]">{email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="badge badge-low">{user.role || "Student"}</span>
            <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
              <Clock size={12} />
              Joined {new Date(user.loggedInAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <div className="glass-card p-6 space-y-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Edit Profile</h3>

        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1.5">Full Name</label>
          <div className="relative">
            <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field pl-11 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1.5">Email</label>
          <div className="relative">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field pl-11 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleSave} className="btn-primary inline-flex items-center gap-2 text-sm py-2.5 px-6">
            <Save size={16} />
            Save Changes
          </button>
          {saved && (
            <span className="text-sm text-[var(--success)] animate-fade-in">
              ✓ Profile updated
            </span>
          )}
        </div>
      </div>

      {/* Analysis History */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Analysis History</h3>
        <div className="space-y-3">
          {[
            { date: "2026-05-02", action: "Full pipeline analysis completed", files: 37102, status: "completed" },
            { date: "2026-05-01", action: "AST feature extraction (4 repos)", files: 13436, status: "completed" },
            { date: "2026-04-28", action: "ROI scoring engine execution", files: 37102, status: "completed" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-[var(--card-border)] last:border-0">
              <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
              <div className="flex-1">
                <p className="text-sm text-[var(--text-primary)]">{item.action}</p>
                <p className="text-xs text-[var(--text-muted)]">{item.date} • {item.files.toLocaleString()} files</p>
              </div>
              <span className="badge badge-low">{item.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
