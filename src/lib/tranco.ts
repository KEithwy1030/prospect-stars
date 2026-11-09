/**
 * Optional free Tranco rank lookup. No API key.
 * Docs: https://tranco-list.eu/
 * Failures are silent — scoring continues without the rank.
 */

export async function lookupTrancoRank(
  hostname: string,
  signal?: AbortSignal,
): Promise<number | null> {
  const host = hostname.replace(/^www\./, "").toLowerCase();
  if (!host || host.includes("/") || host.includes(" ")) return null;
  try {
    const url = `https://tranco-list.eu/api/ranks/domain/${encodeURIComponent(host)}`;
    const res = await fetch(url, {
      signal: signal ?? AbortSignal.timeout(4000),
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ranks?: Array<{ rank?: number }> } | { rank?: number };
    if ("rank" in data && typeof data.rank === "number") return data.rank;
    const ranks = "ranks" in data ? data.ranks : undefined;
    if (ranks?.length && typeof ranks[0]?.rank === "number") return ranks[0].rank;
    return null;
  } catch {
    return null;
  }
}

export function hostnameFromUrl(siteUrl?: string): string | null {
  if (!siteUrl) return null;
  try {
    return new URL(siteUrl).hostname;
  } catch {
    return null;
  }
}
