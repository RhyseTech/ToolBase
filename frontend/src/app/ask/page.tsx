import { ShaderBackground } from "@/components/ShaderBackground";
import { AskClient } from "@/components/AskClient";
import { ScrollProgress } from "@/components/magic/ScrollProgress";
import { API_BASE } from "@/lib/providers";
import { toolHeaders } from "@/lib/server-auth";

export default async function AskAI() {
  let tools: any[] = [];
  let macros: any[] = [];
  try {
    const headers = await toolHeaders();
    const [tRes, pRes] = await Promise.all([
      fetch(`${API_BASE}/api/tools/`, { cache: "no-store", headers }),
      fetch(`${API_BASE}/api/prompts/`, { cache: "no-store" }),
    ]);
    if (tRes.ok) tools = await tRes.json();
    if (pRes.ok) macros = await pRes.json();
  } catch (err) {
    console.error("Failed to fetch ask context:", err);
  }

  return (
    <main className="w-full pt-28 bg-background min-h-screen px-space-xl pb-space-xl">
      <ScrollProgress />
      <ShaderBackground />
      <div className="flex flex-col w-full gap-space-xl relative z-10">
        <AskClient tools={tools} macros={macros} />
      </div>
    </main>
  );
}
