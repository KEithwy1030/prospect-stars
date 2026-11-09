import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="relative z-10 border-b border-border/70 bg-white/40 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="font-display text-xl tracking-tight text-ink sm:text-2xl">
            Prospect Stars
          </span>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            pre-launch scorer
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          <a href="/api/v1/openapi.json" className="hover:text-foreground transition-colors">
            API
          </a>
          <a href="/llms.txt" className="hover:text-foreground transition-colors">
            llms.txt
          </a>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms
          </Link>
        </nav>
      </div>
    </header>
  );
}
