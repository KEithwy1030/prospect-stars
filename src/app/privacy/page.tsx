import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Privacy notes for Prospect Stars — what we store and what we don’t.",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl text-ink">Privacy</h1>
      <p className="mt-4 text-muted-foreground">Last updated: 2026-11-09</p>
      <div className="prose-sm mt-8 space-y-4 text-foreground/90">
        <p>
          Prospect Stars is a free scoring tool. You do not need an account or email to get a
          basic score.
        </p>
        <p>
          <strong>Submissions.</strong> Form and API score requests are processed to compute a
          score. In v1 we do not require email and we do not operate a public archive of ideas.
          Server logs may retain standard request metadata (time, IP, path, status) for rate
          limiting, abuse prevention, and reliability. If we later store submissions for
          calibration, we will update this page before doing so.
        </p>
        <p>
          <strong>Optional enrichment.</strong> If you provide a site URL, we may query the free
          Tranco rank API for that hostname. We do not scrape Google with logins.
        </p>
        <p>
          <strong>Cookies.</strong> No advertising cookies. Essential hosting/CDN cookies may be
          set by the platform (e.g. Vercel).
        </p>
        <p>
          <strong>Contact.</strong> Questions: site footer credit is Kaimo.
        </p>
        <p>
          <Link href="/" className="underline underline-offset-2">
            ← Back to scorer
          </Link>
        </p>
      </div>
    </article>
  );
}
