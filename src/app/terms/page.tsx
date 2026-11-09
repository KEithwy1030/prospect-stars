import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & disclaimer",
  description:
    "Terms and accuracy disclaimer for Prospect Stars commercial-prospect scoring.",
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl text-ink">Terms & disclaimer</h1>
      <p className="mt-4 text-muted-foreground">Last updated: 2026-11-09</p>
      <div className="mt-8 space-y-4 text-foreground/90">
        <p>
          Prospect Stars is a free, rule-based pre-launch commercial-prospect scorer provided as-is
          by Kaimo. It is not financial, legal, or investment advice.
        </p>
        <p>
          <strong>No guaranteed accuracy.</strong> Scores summarize evidence you supply against
          fixed rules. They do not guarantee revenue, traction, or product-market fit. When
          evidence is thin, dimensions are marked insufficient and counted as 2 stars.
        </p>
        <p>
          <strong>Magnitude limit.</strong> We cannot yet reliably separate a ~$1k/year business
          from a ~$100k/year one. If probability spans three tiers, treat revenue stars cautiously
          and run a cheap test.
        </p>
        <p>
          <strong>Acceptable use.</strong> Do not abuse the API (automated flooding beyond the
          published rate limit). Do not use the service to republish third-party bulk revenue
          datasets (including TrustMRR bulk data) as a public page.
        </p>
        <p>
          <strong>No warranty.</strong> The service may change, rate-limit, or go offline without
          notice. You use results at your own risk.
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
