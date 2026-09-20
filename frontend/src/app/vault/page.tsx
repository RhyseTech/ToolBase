import { ShaderBackground } from "@/components/ShaderBackground";
import { VaultClient } from "@/components/VaultClient";
import { API_BASE } from "@/lib/providers";

export default async function Vault() {
  let prompts: any[] = [];
  try {
    const res = await fetch(`${API_BASE}/api/prompts/`, { cache: "no-store" });
    if (res.ok) prompts = await res.json();
  } catch (err) {
    console.error("Failed to fetch prompts:", err);
  }

  return (
    <main className="w-full pt-28 bg-background min-h-screen px-space-xl pb-space-xl">
      <ShaderBackground />
      <div className="flex flex-col w-full gap-space-xl relative z-10">
        <div className="relative w-full">
          <div className="absolute -top-12 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
          <div className="absolute top-28 right-10 w-80 h-80 bg-secondary/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>
          <VaultClient initialPrompts={prompts} />
        </div>
      </div>
    </main>
  );
}
