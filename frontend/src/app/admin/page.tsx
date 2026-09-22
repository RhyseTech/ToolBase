import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ShaderBackground } from "@/components/ShaderBackground";
import { AdminClient } from "@/components/AdminClient";
import { API_BASE } from "@/lib/providers";

export default async function AdminPortal() {
  // Server-side guard: only admins ever see this route.
  let isAdmin = false;
  try {
    const jar = await cookies();
    const email = (jar.get("tb_email")?.value || "").trim().toLowerCase();
    if (email) {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { "X-User-Email": email },
        cache: "no-store",
      });
      if (res.ok) isAdmin = !!(await res.json()).is_admin;
    }
  } catch { /* backend offline → deny */ }

  if (!isAdmin) redirect("/");

  return (
    <main className="relative w-full pt-20 px-gutter min-h-screen bg-transparent">
      <ShaderBackground />
      <div className="flex flex-col w-full relative pb-space-xl max-w-[1400px] mx-auto">
        <header className="flex flex-col gap-space-xs max-w-3xl mb-space-lg pt-space-lg">
          <div className="inline-flex items-center gap-space-xs px-space-md py-1 rounded-full w-fit bg-secondary/10 backdrop-blur-xl">
            <span className="material-symbols-outlined text-sm text-secondary">shield_person</span>
            <span className="font-label-caps text-label-caps tracking-[0.2em] text-secondary uppercase">Admin portal</span>
          </div>
          <h1 className="font-display-lg text-display-lg font-light tracking-tight text-on-surface">
            Mission <span className="bg-gradient-to-r from-primary-fixed via-secondary to-primary-container bg-clip-text text-transparent font-normal">Control</span>
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            Every account, every tool — including private ones. Publish user tools globally or remove them.
          </p>
        </header>
        <AdminClient />
      </div>
    </main>
  );
}
