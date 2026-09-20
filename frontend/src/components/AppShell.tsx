'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { HeaderProfile } from "@/components/HeaderProfile";
import { HyperText } from "@/components/magic/HyperText";

const CHROMELESS = ["/signin", "/signup"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = CHROMELESS.some((r) => pathname === r || pathname.startsWith(r + "/"));

  if (bare) {
    return <>{children}</>;
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-20 bg-surface-container-lowest/80 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="h-20 w-full px-gutter flex items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-md min-w-[280px]">
            <div className="relative flex items-center justify-center p-space-xs rounded-full bg-surface-container-high/40 shadow-[0_0_15px_rgba(229,195,120,0.15)]">
              <img alt="ToolBase logo." className="h-8 w-auto object-contain" src="/toolbase-mark.svg" />
              <span className="absolute inset-0 rounded-full shadow-[inset_0_0_8px_rgba(229,195,120,0.4)] pointer-events-none"></span>
            </div>
            <div className="flex items-center gap-space-sm">
              <HyperText text="ToolBase" className="font-headline-sm text-headline-sm tracking-wider text-on-surface uppercase cursor-default" />
            </div>
          </div>
          <div className="hidden md:flex flex-1 max-w-xl items-center justify-center">
            <div className="group relative flex items-center w-full max-w-md h-10 px-space-md rounded-full bg-surface-container-low/60 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:bg-surface-container-high/60 transition-all duration-300">
              <span className="material-symbols-outlined text-on-surface-variant text-base mr-space-sm group-hover:text-primary transition-colors">search</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant flex-1 select-none">Search tools, prompts, models...</span>
              <kbd className="flex items-center gap-space-xs px-space-xs py-0.5 rounded bg-surface-container-highest/80 font-label-caps text-label-caps text-on-surface-variant group-hover:text-primary group-hover:shadow-[0_0_8px_rgba(255,224,157,0.3)] transition-all">⌘K</kbd>
            </div>
          </div>
          <div className="flex items-center gap-space-md justify-end min-w-[280px]">
            <Link href="/add" className="relative group overflow-hidden flex items-center gap-space-xs px-space-md py-space-sm rounded-full bg-gradient-to-r from-primary-container to-secondary text-on-primary font-label-lg text-label-lg shadow-[0_0_20px_rgba(229,195,120,0.25)] hover:shadow-[0_0_25px_rgba(229,195,120,0.45)] transition-all">
              <span className="material-symbols-outlined text-sm">add</span>
              <span>Add Tool</span>
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out"></span>
            </Link>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-surface-container-high/40 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-xl">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-secondary shadow-[0_0_6px_rgba(233,195,73,0.8)]"></span>
            </div>
            <HeaderProfile />
          </div>
        </div>
      </header>

      <Sidebar />

      <div className="pl-72">
        {children}
      </div>
    </>
  );
}
