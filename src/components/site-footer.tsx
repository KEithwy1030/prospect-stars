import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/70 bg-white/30">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          Prospect Stars · free rule-based scorer · made by{" "}
          <span className="text-foreground">Kaimo</span>
        </p>
        <div className="flex flex-wrap gap-4">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms & disclaimer
          </Link>
          <a href="/api/v1/health" className="hover:text-foreground transition-colors">
            Health
          </a>
        </div>
      </div>
    </footer>
  );
}
