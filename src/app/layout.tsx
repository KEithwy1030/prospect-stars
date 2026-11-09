import type { Metadata } from "next";
import { Fraunces, Source_Sans_3, Geist_Mono } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

const sans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://prospect-stars.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Prospect Stars — pre-launch SaaS commercial-prospect scorer",
    template: "%s · Prospect Stars",
  },
  description:
    "Free rule-based pre-launch commercial prospect scoring for indie SaaS and websites. Overall plus six evidence-based star dimensions — not an LLM vibe score. Human form and HTTP API.",
  keywords: [
    "pre-launch SaaS scoring",
    "commercial prospect",
    "indie hacker",
    "startup idea score",
    "market demand stars",
    "Prospect Stars",
  ],
  authors: [{ name: "Kaimo" }],
  openGraph: {
    title: "Prospect Stars — pre-launch commercial-prospect scorer",
    description:
      "Fill a short form (or call the API) and get overall + six-dimension star scores from fixed evidence rules.",
    type: "website",
    locale: "en_US",
    siteName: "Prospect Stars",
  },
  twitter: {
    card: "summary_large_image",
    title: "Prospect Stars",
    description:
      "Free pre-launch commercial-prospect scorer for founders and AI agents.",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Prospect Stars",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      description:
        "Free rule-based pre-launch commercial-prospect scorer with a human form and HTTP API. Scores six evidence dimensions plus overall stars.",
      author: { "@type": "Person", name: "Kaimo" },
      url: siteUrl,
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Is Prospect Stars an AI vibe score?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. Scores are computed from fixed evidence rules. Missing evidence is marked insufficient and counted as 2 stars.",
          },
        },
        {
          "@type": "Question",
          name: "Can it tell a $1k/year business from a $100k/year one?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Not reliably yet. When probability spans three magnitude tiers, Prospect Stars says so and recommends a cheap test instead of assigning 4+ revenue stars.",
          },
        },
        {
          "@type": "Question",
          name: "Is there an API for agents?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. POST /api/v1/score with JSON. OpenAPI at /api/v1/openapi.json and agent notes at /llms.txt. No API key for basic v1 scoring; rate-limited.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="bg-atmosphere star-dot-field flex min-h-full flex-col font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SiteHeader />
        <main className="relative z-10 flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
