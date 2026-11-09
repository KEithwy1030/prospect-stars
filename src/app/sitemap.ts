import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://prospect-stars.vercel.app";
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/llms.txt`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/api/v1/openapi.json`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
}
