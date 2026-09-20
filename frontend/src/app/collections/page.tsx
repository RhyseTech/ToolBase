import { ShaderBackground } from "@/components/ShaderBackground";
import { CollectionStarToggle } from "@/components/CollectionStarToggle";
import Link from "next/link";

export default async function Collections() {
  let tools: any[] = [];
  try {
    const res = await fetch("http://127.0.0.1:8000/api/tools/", { cache: "no-store" });
    if (res.ok) {
      tools = await res.json();
    }
  } catch (err) {
    console.error("Failed to fetch tools:", err);
  }

  // Group tools by category — favorites first inside each list
  const categories = tools.reduce((acc, tool) => {
    const cat = tool.category || "Uncategorized";
    if (!acc[cat]) {
      acc[cat] = {
        name: cat,
        slug: encodeURIComponent(cat),
        tools: [],
        starredCount: 0,
        averageRating: 0
      };
    }
    acc[cat].tools.push(tool);
    if (tool.favorite) acc[cat].starredCount += 1;
    return acc;
  }, {});

  const categoryList = (Object.values(categories) as any[]).map((cat) => {
    // Favorites first, then highest rated
    cat.tools.sort((a: any, b: any) => {
      if (!!a.favorite !== !!b.favorite) return a.favorite ? -1 : 1;
      return Number(b.rating ?? 0) - Number(a.rating ?? 0);
    });
    cat.averageRating = cat.tools.length
      ? cat.tools.reduce((sum: number, t: any) => sum + (t.rating || 0), 0) / cat.tools.length
      : 0;
    return cat;
  }).sort((a: any, b: any) => {
    // Collections with selected favorites come first
    const aStar = a.starredCount > 0 ? 1 : 0;
    const bStar = b.starredCount > 0 ? 1 : 0;
    if (aStar !== bStar) return bStar - aStar;
    if (a.starredCount !== b.starredCount) return b.starredCount - a.starredCount;
    if (a.tools.length !== b.tools.length) return b.tools.length - a.tools.length;
    return String(a.name).localeCompare(String(b.name));
  });

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
    <main className="w-full pt-28 bg-background min-h-screen px-space-xl pb-space-xl">
      <div className="flex flex-col w-full">
        <div className="relative w-full max-w-[1600px] mx-auto flex flex-col gap-space-xl pb-space-xl">
          <div className="absolute -top-12 left-1/4 w-96 h-96 bg-primary-container/10 rounded-full blur-[140px] pointer-events-none -z-10"></div>
          <div className="absolute top-1/3 -right-24 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[160px] pointer-events-none -z-10"></div>
          
          <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg">
            <div className="flex flex-col gap-space-xs max-w-3xl">
              <div className="inline-flex items-center gap-space-xs px-space-md py-1 rounded-full bg-surface-container-high/80 backdrop-blur-xl w-fit shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(233,195,73,0.8)] animate-pulse"></span>
                <span className="font-label-caps text-label-caps text-primary tracking-[0.14em] uppercase">Collections</span>
              </div>
              <h1 className="font-display-md text-display-md lg:font-display-lg lg:text-display-lg text-on-surface tracking-tight mt-space-xs">
                Tool <span className="italic bg-gradient-to-r from-primary-fixed via-primary-container to-secondary bg-clip-text text-transparent font-normal">Collections</span>
              </h1>
              <p className="font-body-md text-body-md text-outline-variant text-on-surface-variant max-w-2xl leading-relaxed mt-1">
                Browse your AI tools organized by category and discipline.
              </p>
            </div>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-lg mt-space-xl">
            {categoryList.length > 0 ? (
              categoryList.map((cat, idx) => (
                <Link key={idx} href={`/collections/${cat.slug}`} className="block group">
                <article className="group relative flex flex-col justify-between p-space-lg rounded-xl bg-surface-container-low/70 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)] transition-all duration-300 hover:bg-surface-container/80 h-full cursor-pointer">
                  <div className="flex flex-col gap-space-md">
                    <div className="flex items-start justify-between gap-space-xs">
                      <div className="flex items-center gap-space-sm">
                        <div className="w-9 h-9 rounded-lg bg-surface-container-highest/60 flex items-center justify-center text-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
                          <span className="material-symbols-outlined text-xl">{getIconForCategory(cat.name)}</span>
                        </div>
                        <div className="flex flex-col">
                          <h2 className="font-headline-sm text-headline-sm text-on-surface font-medium leading-tight group-hover:text-primary transition-colors max-w-[150px] truncate">
                            {cat.name}
                          </h2>
                          <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Discipline</span>
                        </div>
                      </div>
                      <CollectionStarToggle toolIds={cat.tools.map((t: any) => t.id)} starredCount={cat.starredCount} />
                    </div>
                    <div className="flex items-center gap-space-xs">
                      <span className="font-label-caps text-label-caps px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-medium">{cat.tools.length} Instruments</span>
                      <span className="font-label-caps text-label-caps px-2 py-0.5 rounded-full bg-surface-container-high/60 text-outline">{cat.starredCount} Starred</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-space-xs">
                      {cat.tools.slice(0, 3).map((t: any) => (
                        <span key={t.id} className={`px-2 py-1 rounded text-on-surface font-label-caps text-label-caps truncate max-w-full ${t.favorite ? 'bg-primary-container/25 text-primary' : 'bg-surface-container-highest/50'}`}>
                          {t.favorite ? `★ ${t.name}` : t.name}
                        </span>
                      ))}
                      {cat.tools.length > 3 && (
                        <span className="px-2 py-1 rounded bg-surface-container-highest/50 text-on-surface-variant font-label-caps text-label-caps">+{cat.tools.length - 3}</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-space-lg pt-space-sm flex items-center justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
                    <div className="flex items-center gap-1 text-secondary">
                      <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="font-label-caps text-label-caps font-semibold text-on-surface">{cat.averageRating.toFixed(1)}</span>
                    </div>
                    <span className="font-label-lg text-label-lg text-primary opacity-0 group-hover:opacity-100 transition-opacity">Open →</span>
                  </div>
                </article>
                </Link>
              ))
            ) : (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-surface-container-low/40 rounded-2xl border border-white/5">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-4 opacity-50">category</span>
                <h3 className="text-xl font-headline-sm text-on-surface mb-2">No Collections Yet</h3>
                <p className="text-on-surface-variant max-w-md">You have not added any tools. Collections will automatically group your tools by category.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
