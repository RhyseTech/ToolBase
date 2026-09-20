import { ShaderBackground } from "@/components/ShaderBackground";
import { ToolCard } from "@/components/ToolCard";
import { CollectionStarToggle } from "@/components/CollectionStarToggle";
import { API_BASE } from "@/lib/providers";
import { toolHeaders } from "@/lib/server-auth";
import Link from "next/link";

function getIconForCategory(category: string) {
  if (!category) return "build";
  const c = category.toLowerCase();
  if (c.includes("code") || c.includes("coding") || c.includes("developer")) return "terminal";
  if (c.includes("design") || c.includes("image")) return "brush";
  if (c.includes("research")) return "science";
  if (c.includes("search")) return "travel_explore";
  return "auto_awesome";
}

export default async function CollectionDetail({ params }: { params: { category: string } }) {
  const slug = decodeURIComponent(params.category || "");
  const wanted = slug.toLowerCase();

  let tools: any[] = [];
  try {
    const res = await fetch(`${API_BASE}/api/tools/`, { cache: "no-store", headers: await toolHeaders() });
    if (res.ok) tools = await res.json();
  } catch (err) {
    console.error("Failed to fetch tools:", err);
  }

  // Separate list for this category — favorites first, then highest rated
  const filtered = tools
    .filter((t) => String(t.category || "Uncategorized").toLowerCase() === wanted)
    .sort((a, b) => {
      if (!!a.favorite !== !!b.favorite) return a.favorite ? -1 : 1;
      return Number(b.rating ?? 0) - Number(a.rating ?? 0);
    });

  const displayName =
    filtered[0]?.category || (slug ? slug : "Collection");
  const favCount = filtered.filter((t) => t.favorite).length;

  return (
    <main className="relative w-full pt-28 px-gutter min-h-screen bg-transparent">
      <ShaderBackground />
      <div className="flex flex-col w-full relative pb-space-xl max-w-[1600px] mx-auto">
        <div className="flex items-center gap-space-sm mb-space-md">
          <Link
            href="/collections"
            className="group inline-flex items-center gap-space-sm px-space-md py-space-xs rounded-full bg-surface-container-lowest/60 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:bg-surface-container-high/60 transition-all duration-300"
          >
            <span className="material-symbols-outlined text-sm text-primary group-hover:-translate-x-1 transition-transform duration-300">arrow_back</span>
            <span className="font-label-lg text-label-lg text-on-surface-variant group-hover:text-on-surface transition-colors">Back to Collections</span>
          </Link>
        </div>

        <header className="flex flex-col gap-space-sm mb-space-xl">
          <div className="inline-flex items-center gap-space-xs px-space-md py-1 rounded-full bg-surface-container-high/80 backdrop-blur-xl w-fit">
            <span className="material-symbols-outlined text-primary text-base">{getIconForCategory(displayName)}</span>
            <span className="font-label-caps text-label-caps text-primary tracking-[0.14em] uppercase">Collection</span>
          </div>
          <div className="flex items-center gap-space-sm">
            <h1 className="font-display-md text-display-md text-on-surface tracking-tight">{displayName}</h1>
            <CollectionStarToggle toolIds={filtered.map((t) => t.id)} starredCount={favCount} />
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {filtered.length} instrument{filtered.length === 1 ? "" : "s"} · {favCount} starred · favorites first
          </p>
        </header>

        {filtered.length > 0 ? (
          <div className="flex flex-col gap-space-sm">
            {filtered.map((tool: any) => (
              <ToolCard
                key={tool.id}
                id={tool.id}
                name={tool.name}
                url={tool.url}
                category={tool.category || "Uncategorized"}
                description={tool.description || "No description provided."}
                icon={getIconForCategory(tool.category)}
                logo_url={tool.logo_url}
                rating={tool.rating ? tool.rating.toString() : "4.5"}
                tag={tool.pricing || "Freemium"}
                colorClass="text-primary"
                tagLabel={tool.subcategory || "Active"}
                favorite={tool.favorite} visibility={tool.visibility}
                layout="list"
              />
            ))}
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-center bg-surface-container-low/40 rounded-2xl border border-white/5">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-4 opacity-50">category</span>
            <h3 className="text-xl font-headline-sm text-on-surface mb-2">No tools in “{displayName}”</h3>
            <p className="text-on-surface-variant max-w-md">Starred tools always appear first once you add some here.</p>
            <Link href="/tools" className="mt-4 px-space-md py-space-sm rounded-full bg-primary-container font-label-lg text-label-lg text-on-primary-container">
              Browse directory
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
