import { REALITY_ANCHOR_STATS } from "@/lib/scoring/types";

export function RealityAnchor() {
  const { tiers, source, snapshot_date } = REALITY_ANCHOR_STATS;

  return (
    <aside
      aria-label="收入现实锚点"
      className="rounded-xl border border-star/35 bg-star/[0.04] p-4 sm:p-5 text-sm"
    >
      <div className="space-y-2.5">
        {/* 行 1：快照日期与来源名称 */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-ink font-medium">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-star" />
            <span>收入现实锚点</span>
          </span>
          <span className="text-muted-foreground/60 hidden sm:inline">·</span>
          <span>来源：{source} 公开数据快照</span>
          <span className="text-muted-foreground/60 hidden sm:inline">·</span>
          <span className="text-foreground/80">快照日期：{snapshot_date}</span>
          <span className="text-xs text-muted-foreground">
            (Reality Anchor · Source: {source}, Snapshot: {snapshot_date})
          </span>
        </div>

        {/* 行 2：真实收入分布底数 */}
        <div className="font-semibold text-foreground tabular-nums flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{tiers.under_1k.labelZh}占 {tiers.under_1k.percentageText}</span>
          <span className="text-muted-foreground/50">｜</span>
          <span>{tiers.around_1k.labelZh} {tiers.around_1k.percentageText}</span>
          <span className="text-muted-foreground/50">｜</span>
          <span>{tiers.around_10k.labelZh} {tiers.around_10k.percentageText}</span>
          <span className="text-muted-foreground/50">｜</span>
          <span>{tiers.around_100k.labelZh} {tiers.around_100k.percentageText}</span>
          <span className="text-xs font-normal text-muted-foreground ml-1">
            (&lt; $1k: {tiers.under_1k.percentageText} · $1k: {tiers.around_1k.percentageText} · $10k: {tiers.around_10k.percentageText} · $100k+: {tiers.around_100k.percentageText})
          </span>
        </div>

        {/* 行 3：边界与免责声明 */}
        <div className="text-xs leading-relaxed text-muted-foreground">
          只展示真实分布比例与快照日期供现实对照参考，不复制排行榜、不展示明细、不做背书。
          <span className="ml-1 text-muted-foreground/80">
            (Coarse baseline distribution only; no leaderboards, no item details, no endorsement.)
          </span>
        </div>
      </div>
    </aside>
  );
}
