import { ShaderBackground } from "@/components/ShaderBackground";
import { ToolCatalog } from "@/components/ToolCatalog";

export default async function AllTools() {
  let tools = [];
  try {
    const res = await fetch("http://127.0.0.1:8000/api/tools/", { cache: "no-store" });
    if (res.ok) {
      tools = await res.json();
    }
  } catch (error) {
    console.error("Error fetching tools:", error);
  }

  return (
    <main className="relative w-full pt-20 px-gutter min-h-screen bg-transparent">
      <div className="flex flex-col w-full relative pb-space-xl">
        <ShaderBackground />

        {/* Ambient Light Aureoles */}
        <div className="absolute top-12 left-1/4 w-[500px] h-[320px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
        <div className="absolute top-96 right-10 w-[420px] h-[420px] bg-secondary/5 rounded-full blur-[140px] pointer-events-none -z-10"></div>

        {/* Page Header & Global Controls */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg mb-space-xl">
          <div className="flex flex-col gap-space-sm max-w-3xl">
            <div className="inline-flex items-center gap-space-xs px-space-md py-1 rounded-full w-fit bg-surface-container-high/60 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(233,195,73,0.9)] animate-pulse"></span>
              <span className="font-label-caps text-label-caps tracking-widest text-primary uppercase">Registry & Archive</span>
            </div>
            <h1 className="font-display-lg text-display-lg tracking-tight text-on-surface">Curated Directory</h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl leading-relaxed">
              {tools.length > 0 ? `${tools.length} high-order AI instruments orchestrated by domain, cognitive bandwidth, and curated deployment notes.` : '127 high-order AI instruments orchestrated by domain, cognitive bandwidth, and curated deployment notes.'}
            </p>
          </div>

          {/* Telemetry Status (view + search controls live in ToolCatalog) */}
          <div className="flex items-center gap-space-md flex-wrap lg:flex-nowrap">
            <div className="flex items-center gap-space-sm px-space-md py-space-sm rounded-full bg-surface-container-high/40 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
              </span>
              <span className="font-label-caps text-label-caps tracking-wider text-on-surface-variant uppercase font-semibold">{tools.length} Active Deployments</span>
            </div>
          </div>
        </header>

        <ToolCatalog tools={tools} />
      </div>
    </main>
  );
}
