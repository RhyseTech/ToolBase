import { ShaderBackground } from "@/components/ShaderBackground";
import { AskClient } from "@/components/AskClient";

export default async function AskAI() {
  let tools: any[] = [];
  let macros: any[] = [];
  try {
    const [tRes, pRes] = await Promise.all([
      fetch("http://127.0.0.1:8000/api/tools/", { cache: "no-store" }),
      fetch("http://127.0.0.1:8000/api/prompts/", { cache: "no-store" }),
    ]);
    if (tRes.ok) tools = await tRes.json();
    if (pRes.ok) macros = await pRes.json();
  } catch (err) {
    console.error("Failed to fetch ask context:", err);
  }

  return (
    <main className="w-full pt-28 bg-background min-h-screen px-space-xl pb-space-xl">
      <ShaderBackground />
      <div className="flex flex-col w-full gap-space-xl relative z-10">
        <AskClient tools={tools} macros={macros} />
      </div>
    </main>
  );
}
