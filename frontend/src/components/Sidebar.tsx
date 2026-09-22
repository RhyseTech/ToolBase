"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AiSparkIcon } from "@/components/AiSparkIcon";
import { SETTINGS_EVENT } from "@/lib/settings";
import { API_BASE, authHeaders } from "@/lib/providers";

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0 B";
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function useStorageStats() {
  const [stats, setStats] = useState<{ used: number; quota: number; pct: number } | null>(null);

  const refresh = useCallback(async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
        const { usage = 0, quota = 0 } = await navigator.storage.estimate();
        if (quota > 0) {
          setStats({ used: usage, quota, pct: Math.min(100, (usage / quota) * 100) });
          return;
        }
      }
      // Fallback: measure localStorage directly against a ~5MB budget
      let bytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        bytes += (localStorage.getItem(k) || "").length * 2;
      }
      const budget = 5 * 1024 * 1024;
      setStats({ used: bytes, quota: budget, pct: Math.min(100, (bytes / budget) * 100) });
    } catch {
      setStats(null);
    }
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(SETTINGS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(SETTINGS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  return { stats, refresh };
}

export function Sidebar() {
  const pathname = usePathname();
  const { stats } = useStorageStats();
  const pct = stats ? Math.round(stats.pct) : 0;
  const full = pct >= 90;
  
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    fetch(`${API_BASE}/api/auth/me`, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => setIsAdmin(!!data?.is_admin))
      .catch(() => setIsAdmin(false));
  }, [pathname]); // Re-check when route changes, just in case login state changed

  const navItems = [
    { href: "/", icon: "dashboard", label: "Dashboard" },
    { href: "/tools", icon: "apps", label: "All Tools" },
    { href: "/favorites", icon: "star", label: "Favorites" },
    { href: "/collections", icon: "category", label: "Collections / Categories" },
    { href: "/vault", icon: "folder_special", label: "Prompt Vault" },
    { href: "/ask", icon: "ai-spark", label: "Ask AI" },
  ];
  
  if (isAdmin) {
    navItems.push({ href: "/admin", icon: "admin_panel_settings", label: "Admin Portal" });
  }

  return (
    <aside className="fixed left-0 top-20 bottom-0 w-72 z-40 bg-surface-container-lowest/70 backdrop-blur-2xl shadow-[4px_0_24px_rgba(0,0,0,0.4)] flex flex-col justify-between p-space-md transition-all duration-300">
      <nav className="flex flex-col gap-space-xs">
        <div className="px-space-md py-space-xs font-label-caps text-label-caps text-outline uppercase tracking-widest">Navigation</div>
        
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href}
              href={item.href} 
              className={`group flex items-center gap-space-md px-space-md py-space-sm rounded-xl transition-all ${
                isActive 
                  ? "bg-primary-container text-on-primary-container font-medium shadow-[0_0_15px_rgba(229,195,120,0.2)]" 
                  : "text-on-surface-variant hover:bg-surface-container-high/50 hover:text-on-surface"
              }`}
            >
              {item.icon === "ai-spark" ? (
                <AiSparkIcon size={20} tone={isActive ? "dark" : "gold"} />
              ) : (
                <span className={`material-symbols-outlined text-lg transition-colors ${
                  isActive ? "text-on-primary-container" : "group-hover:text-primary"
                }`}>
                  {item.icon}
                </span>
              )}
              <span className="font-label-lg text-label-lg">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="flex flex-col gap-space-sm">
        <div className="p-space-md rounded-xl bg-surface-container-low/60 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]" title={stats ? `Browser storage used by this site: ${formatBytes(stats.used)} of ${formatBytes(stats.quota)} (uploads, notes, settings)` : "Measuring browser storage…"}>
          <div className="flex items-center justify-between mb-space-xs">
            <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Quick Storage</span>
            <span className={`font-label-caps text-label-caps ${full ? 'text-error' : 'text-primary'}`}>{stats ? `${pct}%` : '…'}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${full ? 'bg-gradient-to-r from-error-container to-error shadow-[0_0_8px_rgba(255,180,171,0.5)]' : 'bg-gradient-to-r from-primary-container to-secondary shadow-[0_0_8px_rgba(229,195,120,0.5)]'}`}
              style={{ width: `${pct}%` }}
            ></div>
          </div>
          <div className="mt-space-xs flex justify-between items-center">
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {stats ? `${formatBytes(stats.used)} / ${formatBytes(stats.quota)}` : 'Measuring…'}
            </span>
          </div>
        </div>
        <Link href="/settings" className={`group flex items-center gap-space-md px-space-md py-space-sm rounded-xl transition-all ${
          pathname === "/settings"
            ? "bg-primary-container text-on-primary-container font-medium shadow-[0_0_15px_rgba(229,195,120,0.2)]"
            : "text-on-surface-variant hover:bg-surface-container-high/50 hover:text-on-surface"
        }`}>
          <span className={`material-symbols-outlined text-lg ${pathname === "/settings" ? "text-on-primary-container" : "group-hover:text-primary"}`}>settings</span>
          <span className="font-label-lg text-label-lg">Settings</span>
        </Link>
      </div>
    </aside>
  );
}
