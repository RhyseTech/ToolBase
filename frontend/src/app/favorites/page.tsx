import { ShaderBackground } from "@/components/ShaderBackground";
import { ToolCard } from "@/components/ToolCard";

export default async function Favorites() {
  let favoriteTools: any[] = [];
  try {
    const res = await fetch("http://127.0.0.1:8000/api/tools/", { cache: "no-store" });
    if (res.ok) {
      const allTools = await res.json();
      favoriteTools = allTools.filter((t: any) => t.favorite === true);
    }
  } catch (err) {
    console.error("Failed to fetch favorites:", err);
  }

  const getIconForCategory = (category: string) => {
    if (!category) return "auto_awesome";
    const cat = category.toLowerCase();
    if (cat.includes("coding") || cat.includes("developer")) return "terminal";
    if (cat.includes("search") || cat.includes("research")) return "radar";
    if (cat.includes("design") || cat.includes("visual")) return "palette";
    if (cat.includes("audio") || cat.includes("video")) return "play_circle";
    if (cat.includes("business") || cat.includes("productivity")) return "work";
    return "auto_awesome";
  };

  return (
    <main className="relative w-full pt-20 px-gutter min-h-screen bg-surface">
      <div className="flex flex-col w-full relative min-w-0 pb-space-xl">
        <ShaderBackground />
        
        <div className="relative z-10 flex flex-col w-full max-w-[1600px] mx-auto gap-space-xl">
          {/* Header & Quick Status Strip */}
          <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg pt-space-md">
            <div className="flex flex-col gap-space-xs max-w-3xl">
              <div className="flex items-center gap-space-xs">
                <span className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(233,195,73,0.8)] animate-pulse"></span>
                <span className="font-label-caps text-label-caps text-primary tracking-widest uppercase">
                  Favorites
                </span>
              </div>
              <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight">
                Starred <span className="text-primary-container drop-shadow-[0_0_20px_rgba(229,195,120,0.35)]">Tools</span>
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                Quick-access to your most critical daily AI tools.
              </p>
            </div>
            
            {/* Action Strip */}
            <div className="flex flex-wrap items-center gap-space-sm self-start lg:self-end">
              <div className="flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-low/70 backdrop-blur-2xl shadow-sm text-on-surface">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
                </span>
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Status:</span>
                <span className="font-label-md text-label-md text-primary font-medium">Optimal</span>
              </div>
            </div>
          </section>

          {/* Filters, Navigation & Control Bar */}
          <section className="flex flex-col gap-space-md">
            <div className="flex flex-col md:flex-row items-center justify-between gap-space-sm p-space-sm rounded-xl bg-surface-container-low/60 backdrop-blur-2xl shadow-sm">
              <div className="flex items-center gap-space-md self-end md:self-auto">
                <span className="font-label-caps text-label-caps text-secondary font-medium tracking-wide">{favoriteTools.length} Active Tools Displayed</span>
              </div>
            </div>
          </section>

          {/* Pinned Workhorse Cards Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md">
            {favoriteTools.length > 0 ? (
              favoriteTools.map(tool => (
                <ToolCard
                  key={tool.id}
                  id={tool.id}
                  name={tool.name}
                  url={tool.url}
                  category={tool.category || 'Uncategorized'}
                  description={tool.description || 'No description provided.'}
                  icon={getIconForCategory(tool.category)}
                  logo_url={tool.logo_url}
                  rating={tool.rating ? tool.rating.toString() : '4.5'}
                  tag={tool.pricing || 'Freemium'}
                  colorClass="text-primary"
                  tagLabel={tool.subcategory || 'Active'}
                  favorite={tool.favorite}
                />
              ))
            ) : (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-surface-container-low/40 rounded-2xl border border-white/5">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-4 opacity-50">star</span>
                <h3 className="text-xl font-headline-sm text-on-surface mb-2">No Favorites Yet</h3>
                <p className="text-on-surface-variant max-w-md">You have not starred any tools. Go to the dashboard or directory to add some tools to your favorites.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
