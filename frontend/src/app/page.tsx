import { ShaderBackground } from "@/components/ShaderBackground";
import { QuickIntake } from "@/components/QuickIntake";
import { DashboardDirectory } from "@/components/DashboardDirectory";
import { BlurFade } from "@/components/magic/BlurFade";
import { AuroraText } from "@/components/magic/AuroraText";
import { NumberTicker } from "@/components/magic/NumberTicker";
import { Marquee } from "@/components/magic/Marquee";
import { Particles } from "@/components/magic/Particles";
import { ScrollProgress } from "@/components/magic/ScrollProgress";
import { API_BASE } from "@/lib/providers";
import { toolHeaders } from "@/lib/server-auth";

export default async function Dashboard() {
  let tools = [];
  try {
    const res = await fetch(`${API_BASE}/api/tools/`, { cache: "no-store", headers: await toolHeaders() });
    if (res.ok) {
      tools = await res.json();
    }
  } catch (error) {
    console.error("Error fetching tools:", error);
  }
  
  return (
    <main className="relative w-full pt-28 px-gutter min-h-screen bg-transparent">
      <ShaderBackground />
      <Particles density={36} />
      <ScrollProgress />

      <div className="flex flex-col w-full relative pt-space-lg">
        {/* Ambient Light Orbs with subtle orbital drift */}
        <div className="absolute -top-12 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-[130px] pointer-events-none -z-10 animate-pulse"></div>
        <div className="absolute top-1/3 right-10 w-80 h-80 rounded-full bg-secondary-container/15 blur-[140px] pointer-events-none -z-10"></div>
        <div className="absolute bottom-10 left-10 w-[420px] h-[420px] rounded-full bg-tertiary-container/10 blur-[150px] pointer-events-none -z-10"></div>
        
        {/* Header & Executive Title Space */}
        <BlurFade>
        <header className="flex flex-col gap-space-xs max-w-3xl pb-space-xl">
          <div className="flex flex-col gap-space-xs max-w-3xl">
            <h1 className="font-display-lg text-display-lg font-light tracking-tight text-on-surface text-balance">
              Executive <AuroraText className="font-normal">Intelligence</AuroraText> Suite
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant tracking-normal max-w-2xl">
              Curated portfolio of frontier cognitive engines, high-leverage workflows, and synthetic model suites orchestrating sovereign enterprise operations.
            </p>
          </div>
        </header>
        </BlurFade>

        {/* Central Quick-Intake Glassphone Command Bar */}
        <QuickIntake />

        {/* KPI Metric Tiles (4-Column Layout) */}
        <BlurFade delay={120}>
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md mb-space-xl">
          {/* Tile 1 */}
          <div className="relative group p-space-lg rounded-2xl bg-surface-container-low/60 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] hover:-translate-y-1 transition-all duration-300 overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/25 transition-all"></div>
            <div className="flex items-center justify-between mb-space-md">
              <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Curated Engines</span>
              <div className="w-9 h-9 rounded-xl bg-surface-container-high/80 flex items-center justify-center text-secondary shadow-[0_0_12px_rgba(233,195,73,0.2)]">
                <span className="material-symbols-outlined text-lg">auto_awesome</span>
              </div>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-display-md text-display-md text-on-surface font-light tracking-tight"><NumberTicker value={tools.length} /></span>
              <span className="font-label-caps text-label-caps text-secondary font-semibold">ACTIVE</span>
            </div>
            <div className="mt-space-sm flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm">
              <span className="text-secondary font-medium">Total tools</span>
              <span>indexed in your workspace</span>
            </div>
          </div>

          {/* Tile 2 */}
          <div className="relative group p-space-lg rounded-2xl bg-surface-container-low/60 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] hover:-translate-y-1 transition-all duration-300 overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-secondary/10 rounded-full blur-2xl group-hover:bg-secondary/25 transition-all"></div>
            <div className="flex items-center justify-between mb-space-md">
              <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Indexed Disciplines</span>
              <div className="w-9 h-9 rounded-xl bg-surface-container-high/80 flex items-center justify-center text-primary shadow-[0_0_12px_rgba(255,224,157,0.2)]">
                <span className="material-symbols-outlined text-lg">account_tree</span>
              </div>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-display-md text-display-md text-on-surface font-light tracking-tight"><NumberTicker value={new Set(tools.map((t: any) => t.category || 'Uncategorized')).size} /></span>
              <span className="font-label-caps text-label-caps text-primary font-semibold">CATEGORIES</span>
            </div>
            <div className="mt-space-sm flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm">
              <span className="text-primary font-medium">100%</span>
              <span>coverage across enterprise domains</span>
            </div>
          </div>

          {/* Tile 3 */}
          <div className="relative group p-space-lg rounded-2xl bg-surface-container-low/60 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] hover:-translate-y-1 transition-all duration-300 overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-primary-container/15 rounded-full blur-2xl group-hover:bg-primary-container/30 transition-all"></div>
            <div className="flex items-center justify-between mb-space-md">
              <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Starred Workhorses</span>
              <div className="w-9 h-9 rounded-xl bg-surface-container-high/80 flex items-center justify-center text-secondary shadow-[0_0_12px_rgba(233,195,73,0.3)]">
                <span className="material-symbols-outlined text-lg">hotel_class</span>
              </div>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-display-md text-display-md text-on-surface font-light tracking-tight"><NumberTicker value={tools.filter((t: any) => t.favorite).length} /></span>
              <span className="font-label-caps text-label-caps text-secondary font-semibold">FAVORITES</span>
            </div>
            <div className="mt-space-sm flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm">
              <span className="text-secondary font-medium">High SLA</span>
              <span>zero-fallback cognitive nodes</span>
            </div>
          </div>

          {/* Tile 4 */}
          <div className="relative group p-space-lg rounded-2xl bg-surface-container-low/60 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] hover:-translate-y-1 transition-all duration-300 overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-tertiary-container/10 rounded-full blur-2xl group-hover:bg-tertiary-container/25 transition-all"></div>
            <div className="flex items-center justify-between mb-space-md">
              <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Active Workspaces</span>
              <div className="w-9 h-9 rounded-xl bg-surface-container-high/80 flex items-center justify-center text-tertiary shadow-[0_0_12px_rgba(216,228,246,0.2)]">
                <span className="material-symbols-outlined text-lg">hub</span>
              </div>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-display-md text-display-md text-on-surface font-light tracking-tight">1</span>
              <span className="font-label-caps text-label-caps text-tertiary font-semibold">LOCAL ENV</span>
            </div>
            <div className="mt-space-sm flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm">
              <span className="text-tertiary font-medium">100%</span>
              <span>real-time telemetry uptime</span>
            </div>
          </div>
        </section>
        </BlurFade>

        {/* Instrument ticker */}
        <BlurFade delay={180}>
          <Marquee
            items={tools.map((t: any) => t.name).filter(Boolean)}
            className="mb-space-xl py-space-sm rounded-xl bg-surface-container-low/40 font-label-caps text-label-caps text-on-surface-variant tracking-widest uppercase"
          />
        </BlurFade>

        {/* Working directory controls: view toggle + audit log + filters (client) */}
        <BlurFade delay={240}>
        <DashboardDirectory tools={tools} />
        </BlurFade>
      </div>
    </main>
  );
}


