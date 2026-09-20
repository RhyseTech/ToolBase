export function getDomainFromUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  try {
    const withProto = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const host = new URL(withProto).hostname.trim().toLowerCase();
    return host.startsWith('www.') ? host.slice(4) : host;
  } catch {
    return '';
  }
}

export function googleFaviconUrl(toolUrl: string, size = 128): string {
  const domain = getDomainFromUrl(toolUrl);
  if (!domain) return '';
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

export function duckDuckGoIconUrl(toolUrl: string): string {
  const domain = getDomainFromUrl(toolUrl);
  if (!domain) return '';
  return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
}

/**
 * Ordered logo candidates: stored logo first, then derived favicons.
 * ToolCard walks this list on <img> onError so Gamma / Napkin AI
 * (saved with empty logo_url) still resolve to their original brand mark.
 */
export function getLogoCandidates(args: { logo_url?: string; url?: string }): string[] {
  const out: string[] = [];
  const stored = (args.logo_url || '').trim();
  if (stored) out.push(stored);
  const g = googleFaviconUrl(args.url || '');
  if (g && !out.includes(g)) out.push(g);
  const d = duckDuckGoIconUrl(args.url || '');
  if (d && !out.includes(d)) out.push(d);
  return out;
}
