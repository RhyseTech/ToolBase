import { ShaderBackground } from "@/components/ShaderBackground";

export default function PlaceholderPage() {
  return (
    <main className="relative w-full pt-20 px-gutter min-h-screen bg-surface flex items-center justify-center">
      <ShaderBackground />
      <div className="flex flex-col items-center gap-space-sm">
        <span className="material-symbols-outlined text-4xl text-primary animate-pulse">construction</span>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Module in Construction</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">This sector is currently being built.</p>
      </div>
    </main>
  );
}
