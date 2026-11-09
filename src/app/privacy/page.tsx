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
      <p className="mt-4 text-muted-foreground">Last updated: 2026-11-10</p>
      <div className="prose-sm mt-8 space-y-4 text-foreground/90">
        <p>
          Prospect Stars is a free scoring tool. You do not need an account or email to get a
          basic score.
        </p>
        <p>
          <strong>Submissions & Model Calibration (提交数据与模型校准).</strong> 默认不存；只有用户单独勾选同意“提交可用于校准评分模型”时，才保存提交内容用于改进评分，且可撤回、撤回不影响打分。
        </p>
        <p className="text-muted-foreground">
          <em>English reference:</em> By default, we do not store submission content. Only when
          you explicitly opt in by checking &ldquo;提交可用于校准评分模型&rdquo; (Allow submission to be
          used to calibrate scoring models) will we save submission content to calibrate and
          improve our scoring models. You may withdraw consent at any time; withholding or withdrawing
          consent never affects scoring.
        </p>
        <p>
          Server logs may retain standard request metadata (time, IP, path, status) for rate
          limiting, abuse prevention, and reliability. We do not operate a public archive of ideas.
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
