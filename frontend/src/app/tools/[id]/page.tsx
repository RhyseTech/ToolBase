import { ShaderBackground } from "@/components/ShaderBackground";
import { ToolDetailClient } from "@/components/ToolDetailClient";
import { ScrollProgress } from "@/components/magic/ScrollProgress";
import { API_BASE } from "@/lib/providers";
import { toolHeaders } from "@/lib/server-auth";
import Link from "next/link";

function openRouterFallback() {
  return {
    id: "openrouter",
    name: "OpenRouter",
    url: "https://openrouter.ai/",
    description:
      "OpenRouter is a unified LLM gateway — one OpenAI-compatible API to access 400+ models (GPT, Claude, Gemini, Llama, Mistral) with automatic fallbacks, cost routing, and usage analytics. Single API key, pay-as-you-go credits, no per-provider signup.",
    purpose: "Unified model gateway for chat, completions, and agentic workflows",
    category: "AI Gateway",
    subcategory: "LLM Routing",
    pricing: "Pay-as-you-go",
    logo_url: "https://www.google.com/s2/favicons?domain=openrouter.ai&sz=128",
    rating: 4.9,
    favorite: false,
    archived: false,
    tags: [{ id: 1, name: "llm-gateway" }, { id: 2, name: "api" }, { id: 3, name: "models" }],
  };
}

async function fetchTool(id: string) {
  const headers = await toolHeaders();
  // 1) direct fetch (works for numeric id AND slug after backend fix)
  try {
    const res = await fetch(`${API_BASE}/api/tools/${encodeURIComponent(id)}`, { cache: "no-store", headers });
    if (res.ok) return await res.json();
  } catch {}
  // 2) list + fuzzy match (covers old DBs / id mismatch)
  try {
    const res = await fetch(`${API_BASE}/api/tools/?limit=500`, { cache: "no-store", headers });
    if (res.ok) {
      const tools = await res.json();
      const slug = id.toLowerCase().replace(/[-_ ]/g, "");
      const hit = tools.find((t: any) => {
        if (String(t.id) === String(id)) return true;
        const n = (t.name || "").toLowerCase().replace(/[-_ ]/g, "");
        return n === slug || n.includes(slug) || slug.includes(n);
      });
      if (hit) return hit;
    }
  } catch {}
  // 3) built-in OpenRouter dossier so /tools/openrouter never 404s
  const slug = id.toLowerCase().replace(/[-_ ]/g, "");
  if (slug.includes("openrouter")) return openRouterFallback();
  return null;
}

export default async function ToolDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tool = await fetchTool(id);

  if (!tool) {
    return (
      <main className="relative w-full pt-20 px-gutter min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-space-md text-center">
          <span className="material-symbols-outlined text-5xl text-outline">search_off</span>
          <h1 className="text-xl text-on-surface">Tool not found</h1>
          <p className="text-on-surface-variant font-body-sm text-body-sm">No tool matches “{id}”. It may have been deleted or the backend is offline.</p>
          <Link href="/tools" className="px-space-lg py-space-sm rounded-full bg-primary-container text-on-primary-container font-label-lg text-label-lg">Back to Directory</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative w-full pt-20 px-gutter min-h-screen bg-surface">
      <ScrollProgress />
      <div className="flex flex-col w-full relative">
        <ShaderBackground />
        <div className="relative w-full max-w-[1600px] mx-auto pb-space-xl flex flex-col gap-space-lg">
          <ToolDetailClient tool={tool} />
        </div>
      </div>
    </main>
  );
}
