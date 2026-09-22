export const dynamic = "force-dynamic";
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShaderBackground } from "@/components/ShaderBackground";
import { API_BASE, authHeaders } from "@/lib/providers";

export default function AddTool() {
  const router = useRouter();
  const [url, setUrl] = useState("https://www.perplexity.ai");
  const [stage, setStage] = useState(0); // 0: input, 1: loading, 2: review
  const [data, setData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "private">("private");

  // Who am I? Admins may publish globally; everyone else adds privately.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, { headers: authHeaders(), cache: "no-store" });
        if (res.ok) {
          const me = await res.json();
          const admin = !!me.is_admin;
          setIsAdmin(admin);
          setVisibility(admin ? "public" : "private");
        }
      } catch { /* anonymous → backend forces private */ }
    })();
  }, []);

  const handleAnalyze = async () => {
    setStage(1);
    try {
      const res = await fetch(`${API_BASE}/api/ai/analyze-tool`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        const result = await res.json();
        // Fallback for dummy responses
        if (Object.keys(result).length === 0) {
           setData({
              name: "Analyzed Tool",
              url: url,
              description: "This is a fallback description due to AI limit.",
              purpose: "General",
              category: "Search",
              subcategory: "AI Search",
              use_cases: ["Research"],
              features: ["AI"],
              tags: ["search", "ai"],
              pricing: "Freemium",
              rating: 5.0
           });
        } else {
           setData(result);
        }
        setStage(2);
      } else {
        alert("Failed to analyze tool.");
        setStage(0);
      }
    } catch (e) {
      alert("Error analyzing tool.");
      setStage(0);
    }
  };

  const getFaviconForUrl = (rawUrl: string) => {
    try {
      const withProto = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
      const host = new URL(withProto).hostname.replace(/^www\./, '');
      if (!host) return '';
      return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
    } catch {
      return '';
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        name: data.name || "Unknown",
        url: url,
        description: data.description || "",
        purpose: data.purpose || "",
        category: data.category || "Other",
        subcategory: data.subcategory || "",
        pricing: data.pricing || "Unknown",
        logo_url: data.logo_url || getFaviconForUrl(url),
        rating: data.rating || 4.5,
        favorite: false,
        archived: false,
        tags: data.tags || [],
        visibility,
      };

      const res = await fetch(`${API_BASE}/api/tools/`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push("/tools");
      } else {
        alert("Failed to save tool.");
        setIsSaving(false);
      }
    } catch (e) {
      alert("Error saving tool.");
      setIsSaving(false);
    }
  };

  return (
    <main className="relative w-full pt-20 px-gutter min-h-screen bg-surface flex items-center justify-center">
      <ShaderBackground />
      
      <div className="absolute -top-12 left-1/3 w-96 h-96 rounded-full bg-primary-container/10 blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-[420px] h-[420px] rounded-full bg-secondary-container/15 blur-[140px] pointer-events-none"></div>
      
      <div className="relative w-full max-w-5xl rounded-xl bg-surface-container-lowest/80 backdrop-blur-3xl shadow-[0_30px_90px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.12)] p-space-md md:p-space-xl flex flex-col gap-space-lg overflow-hidden my-space-xl">
        <div className="flex items-center justify-between gap-space-md border-b-0">
          <div className="flex items-center gap-space-md">
            <div className="w-12 h-12 rounded-xl bg-surface-container-high/60 flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] text-primary">
              <span className="material-symbols-outlined text-2xl">auto_awesome</span>
            </div>
            <div>
              <div className="flex items-center gap-space-sm">
                <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Add AI Instrument</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-high/70 text-secondary font-label-caps text-label-caps uppercase tracking-wider shadow-[inset_0_1px_0_0_rgba(233,195,73,0.3)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                  &lt; 10s Automated Intake
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-outline mt-0.5">High-fidelity parsing, taxonomy indexing, and sovereign curation pipeline</p>
            </div>
          </div>
          <button onClick={() => router.push("/tools")} aria-label="Close Intake Modal" className="group relative w-10 h-10 rounded-full bg-surface-container-high/40 hover:bg-surface-container-high/80 text-on-surface-variant hover:text-primary transition-all duration-300 flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]" type="button">
            <span className="material-symbols-outlined text-lg group-hover:rotate-90 transition-transform duration-300">close</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          <div className="lg:col-span-7 flex flex-col gap-space-md">
            
            {/* Stage 01 */}
            <div className={`p-space-md rounded-xl bg-surface-container-low/80 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] flex flex-col gap-space-sm transition-opacity duration-300 ${stage > 0 ? "opacity-60" : "opacity-100"}`}>
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-label-caps uppercase tracking-widest text-outline">Stage 01 // Target Ingestion</span>
                {stage === 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container-high/60 text-primary font-label-caps text-label-caps">
                    <span className="material-symbols-outlined text-xs text-secondary animate-spin">arrow_back_ios_new</span>
                    Auto-detect: Search & Intelligence
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 flex items-center gap-1.5 pointer-events-none text-secondary">
                  <span className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(233,195,73,0.9)]"></span>
                  <span className="material-symbols-outlined text-sm text-outline">link</span>
                </div>
                <input 
                  className="w-full h-11 pl-14 pr-24 rounded-lg bg-surface-container-lowest/90 font-body-md text-body-md text-on-surface focus:outline-none shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]" 
                  type="text" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={stage > 0}
                />
                {stage === 0 && (
                  <button onClick={handleAnalyze} className="absolute right-2 px-space-sm py-1 rounded bg-surface-container-high/70 hover:bg-primary-container text-on-surface-variant hover:text-on-primary-container font-label-md text-label-md tracking-wider transition-all flex items-center gap-1" type="button">
                    <span className="material-symbols-outlined text-xs">bolt</span>
                    ANALYZE
                  </button>
                )}
              </div>
              {stage > 0 && (
                <div className="flex items-center justify-between px-space-xs font-body-sm text-body-sm text-secondary">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">verified</span>
                    <span>Target Recognized</span>
                  </div>
                </div>
              )}
            </div>

            {/* Stage 02 */}
            <div className={`p-space-md rounded-xl bg-surface-container-low/80 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] flex flex-col gap-space-sm transition-opacity duration-300 ${stage === 1 ? "opacity-100" : stage === 2 ? "opacity-60" : "opacity-30"}`}>
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-label-caps uppercase tracking-widest text-outline">Stage 02 // Live Extraction Telemetry</span>
                {stage === 1 && <span className="font-label-caps text-label-caps text-secondary font-medium tracking-wide animate-pulse">PROCESSING...</span>}
                {stage === 2 && <span className="font-label-caps text-label-caps text-primary font-medium tracking-wide">COMPLETED</span>}
              </div>
              <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                <div className={`h-full rounded-full bg-gradient-to-r from-secondary-container via-primary-container to-secondary shadow-[0_0_12px_rgba(233,195,73,0.5)] transition-all duration-1000 ${stage === 1 ? 'w-2/3 animate-pulse' : stage === 2 ? 'w-full' : 'w-0'}`}></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-xs pt-space-xs">
                {["Domain & Manifest Verified", "Capabilities & Models Parsed", "Taxonomy Assigned", "Security & SLA Evaluated"].map((label, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-lowest/40">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${stage === 2 ? 'bg-primary-container text-on-primary-container shadow-[0_0_6px_rgba(229,195,120,0.5)]' : 'bg-surface-container-high text-outline'}`}>
                      {stage === 2 ? '✓' : ''}
                    </span>
                    <span className={`font-body-sm text-body-sm ${stage === 2 ? 'text-on-surface' : 'text-on-surface-variant'}`}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-5 flex flex-col gap-space-md">
            {/* Stage 03 */}
            <div className={`h-full p-space-md rounded-xl bg-surface-container-low/80 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] flex flex-col justify-between gap-space-md transition-opacity duration-300 ${stage === 2 ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
              <div className="flex flex-col gap-space-sm">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-label-caps uppercase tracking-widest text-outline">Stage 03 // Curator Review</span>
                </div>
                
                <div className="p-space-sm rounded-lg bg-surface-container-lowest/70 flex items-center justify-between gap-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-secondary text-lg">deployed_code</span>
                    <div className="min-w-0">
                      <span className="block font-label-caps text-label-caps text-outline uppercase tracking-wider">Instrument Title</span>
                      <span className="font-headline-sm text-headline-sm text-on-surface truncate">{data?.name || '...'}</span>
                    </div>
                  </div>
                  <button className="p-1.5 rounded-lg bg-surface-container-high/60 hover:bg-surface-container-highest text-on-surface-variant hover:text-primary transition-colors" type="button">
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-label-md text-outline uppercase tracking-wider">Category Vector</label>
                  <div className="h-10 px-space-sm rounded-lg bg-surface-container-lowest/70 text-on-surface flex items-center justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
                    <span className="font-body-md text-body-md">{data?.category || '...'} / {data?.subcategory || '...'}</span>
                    <span className="material-symbols-outlined text-outline text-base">expand_more</span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-label-md text-outline uppercase tracking-wider">Extracted Architecture</label>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed p-space-sm rounded-lg bg-surface-container-lowest/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
                    {data?.description || '...'}
                  </p>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-outline uppercase tracking-wider">Confirmed Use Cases</label>
                  <div className="flex flex-wrap gap-1.5">
                    {data?.use_cases?.map((uc: string, i: number) => (
                      <button key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-container/20 text-primary font-label-md text-label-md shadow-[0_0_10px_rgba(229,195,120,0.2)] transition-all" type="button">
                        <span>✓</span> {uc}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-outline uppercase tracking-wider">Curated Tags</label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {data?.tags?.map((tag: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-surface-container-highest/60 text-on-surface-variant font-label-caps text-label-caps">#{tag}</span>
                    ))}
                    <button className="px-2 py-0.5 rounded bg-surface-container-high/60 hover:bg-surface-container-highest text-secondary font-label-caps text-label-caps transition-colors" type="button">
                      + Add Tag
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-outline uppercase tracking-wider">Visibility</label>
                  {isAdmin ? (
                    <div className="flex rounded-lg bg-surface-container-lowest/70 p-1 gap-1">
                      {(["public", "private"] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setVisibility(v)}
                          className={`flex-1 px-3 py-2 rounded-md font-label-md text-label-md capitalize transition-all ${
                            visibility === v
                              ? "bg-primary-container text-on-primary-container shadow-[0_0_12px_rgba(229,195,120,0.3)]"
                              : "text-on-surface-variant hover:text-on-surface"
                          }`}
                        >
                          {v === "public" ? "🌍 Global (all users)" : "🔒 Private (only me)"}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container-lowest/70 text-on-surface-variant font-body-sm text-body-sm">
                      <span className="material-symbols-outlined text-sm text-secondary">lock</span>
                      <span>Private — only you will see this tool. Admins can publish globally.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="pt-space-sm flex flex-col md:flex-row items-center justify-between gap-space-md">
          <div className="flex items-center gap-2 text-outline font-body-sm text-body-sm">
            <span className="material-symbols-outlined text-secondary text-base">shield</span>
            <span>Private human notes are encrypted and never overwritten by automatic sync.</span>
          </div>
          <div className="flex items-center gap-space-sm w-full md:w-auto justify-end">
            <button disabled={stage !== 2} onClick={handleSave} className={`relative group overflow-hidden px-space-lg py-2.5 rounded-full ${stage === 2 ? 'bg-gradient-to-r from-primary-container to-secondary text-on-primary shadow-[0_0_25px_rgba(229,195,120,0.35)] hover:shadow-[0_0_35px_rgba(229,195,120,0.55)] cursor-pointer' : 'bg-surface-container-highest text-on-surface-variant cursor-not-allowed'} font-label-lg text-label-lg transition-all flex items-center gap-2`} type="button">
              <span>{isSaving ? "Saving..." : "Save to ToolBase"}</span>
              {!isSaving && <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">arrow_forward</span>}
              {stage === 2 && !isSaving && <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></span>}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
