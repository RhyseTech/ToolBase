"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AiSparkIcon } from "@/components/AiSparkIcon";

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", icon: "dashboard", label: "Dashboard" },
    { href: "/tools", icon: "apps", label: "All Tools" },
    { href: "/favorites", icon: "star", label: "Favorites" },
    { href: "/collections", icon: "category", label: "Collections / Categories" },
    { href: "/vault", icon: "folder_special", label: "Prompt Vault" },
    { href: "/ask", icon: "ai-spark", label: "Ask AI" },
  ];

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
                <AiSparkIcon size={20} />
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
        <div className="p-space-md rounded-xl bg-surface-container-low/60 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between mb-space-xs">
            <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Quick Storage</span>
            <span className="font-label-caps text-label-caps text-primary">68%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
            <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-primary-container to-secondary shadow-[0_0_8px_rgba(229,195,120,0.5)]"></div>
          </div>
          <div className="mt-space-xs flex justify-between items-center">
            <span className="font-body-sm text-body-sm text-on-surface-variant">13.6 GB / 20 GB</span>
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
