"use client";

import { cn } from "@/lib/utils";

export function StarRating({
  value,
  size = "md",
  className,
}: {
  value: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  if (value === null) {
    return (
      <span className={cn("text-sm italic text-muted-foreground", className)}>
        Insufficient evidence
      </span>
    );
  }

  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  const px = size === "lg" ? "text-3xl sm:text-4xl" : size === "sm" ? "text-base" : "text-xl";

  return (
    <span
      className={cn("inline-flex items-center gap-0.5 text-star", px, className)}
      aria-label={`${value} out of 5 stars`}
    >
      {Array.from({ length: full }).map((_, i) => (
        <span
          key={`f${i}`}
          className="animate-star-pop"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          ★
        </span>
      ))}
      {half ? (
        <span
          className="animate-star-pop relative inline-block"
          style={{ animationDelay: `${full * 60}ms` }}
        >
          <span className="text-border">★</span>
          <span className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
            ★
          </span>
        </span>
      ) : null}
      {Array.from({ length: empty }).map((_, i) => (
        <span key={`e${i}`} className="text-border">
          ☆
        </span>
      ))}
      <span className="ml-2 text-sm font-medium text-foreground tabular-nums">
        {Number.parseFloat(String(value))}
      </span>
    </span>
  );
}
