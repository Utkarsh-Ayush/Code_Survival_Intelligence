"use client";

import { useState } from "react";
import { Settings, Sliders, Database, Download, Bell, Save } from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    hourlyRate: 75,
    downtimeCost: 500,
    outageHours: 4,
    overhead: 1.5,
    penalizer: 0.01,
    horizon: 365,
    splitRatio: 70,
    exportFormat: "csv",
    darkMode: true,
    animations: true,
    emailAlerts: false,
  });
  const [saved, setSaved] = useState(false);

  const update = (key, val) => setSettings({ ...settings, [key]: val });

  const handleSave = () => {
    localStorage.setItem("csi_settings", JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <Settings size={24} className="text-[var(--text-muted)]" />
          Settings
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Configure analysis parameters and preferences.</p>
      </div>

      {/* Financial Parameters */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-4">
          <Sliders size={16} className="text-[var(--accent)]" />
          Financial Parameters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: "hourlyRate", label: "Developer Rate ($/hr)", type: "number" },
            { key: "downtimeCost", label: "Downtime Cost ($/hr)", type: "number" },
            { key: "outageHours", label: "Avg Outage Duration (hrs)", type: "number" },
            { key: "overhead", label: "Overhead Multiplier", type: "number" },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5">{f.label}</label>
              <input
                type={f.type}
                value={settings[f.key]}
                onChange={(e) => update(f.key, +e.target.value)}
                className="input-field text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Model Configuration */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-4">
          <Database size={16} className="text-[var(--info)]" />
          Model Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Penalizer (L2)</label>
            <input
              type="number"
              step="0.001"
              value={settings.penalizer}
              onChange={(e) => update("penalizer", +e.target.value)}
              className="input-field text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Failure Horizon (days)</label>
            <select
              value={settings.horizon}
              onChange={(e) => update("horizon", +e.target.value)}
              className="input-field text-sm"
            >
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
              <option value={365}>365 days (1 year)</option>
              <option value={730}>730 days (2 years)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Train/Test Split (%)</label>
            <input
              type="number"
              value={settings.splitRatio}
              onChange={(e) => update("splitRatio", +e.target.value)}
              className="input-field text-sm"
            />
          </div>
        </div>
      </div>

      {/* Export Settings */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-4">
          <Download size={16} className="text-[var(--success)]" />
          Export Settings
        </h3>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1.5">Default Export Format</label>
          <div className="flex gap-3">
            {["csv", "pdf", "json"].map((fmt) => (
              <button
                key={fmt}
                onClick={() => update("exportFormat", fmt)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase transition-all border ${
                  settings.exportFormat === fmt
                    ? "border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent-hover)]"
                    : "border-[var(--card-border)] text-[var(--text-muted)] hover:border-[var(--accent)]"
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-4">
          <Bell size={16} className="text-[var(--warning)]" />
          Preferences
        </h3>
        <div className="space-y-4">
          {[
            { key: "darkMode", label: "Dark Mode", desc: "Use dark theme throughout the dashboard" },
            { key: "animations", label: "Animations", desc: "Enable chart and card animations" },
            { key: "emailAlerts", label: "Email Alerts", desc: "Get notified about high-risk files" },
          ].map((pref) => (
            <div key={pref.key} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm text-[var(--text-primary)]">{pref.label}</p>
                <p className="text-xs text-[var(--text-muted)]">{pref.desc}</p>
              </div>
              <button
                onClick={() => update(pref.key, !settings[pref.key])}
                className={`w-11 h-6 rounded-full transition-all duration-200 relative ${
                  settings[pref.key] ? "bg-[var(--accent)]" : "bg-[var(--card-border)]"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all duration-200 ${
                    settings[pref.key] ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} className="btn-primary inline-flex items-center gap-2 text-sm py-2.5 px-6">
          <Save size={16} />
          Save Settings
        </button>
        {saved && (
          <span className="text-sm text-[var(--success)] animate-fade-in">
            ✓ Settings saved
          </span>
        )}
      </div>
    </div>
  );
}
