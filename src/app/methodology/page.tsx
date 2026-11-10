import type { Metadata } from "next";
import Link from "next/link";
import {
  API_DIM_LABELS,
  DIM_TO_API,
  type DimKey,
} from "@/lib/scoring/types";
import {
  CHEAPEST_EXPERIMENTS,
  DIMS,
  INSUFF,
  WEIGHTS,
} from "@/lib/scoring/stars";

export const metadata: Metadata = {
  title: "公开打分方法与已知短板 (Methodology)",
  description:
    "Prospect Stars 评分引擎的公开计算方法、六维权重定义、证据不足按 2 星计算规则与“分不清年入一千与十万”的已知短板说明。",
};

const DIMENSION_DETAILS: Record<
  DimKey,
  {
    descZh: string;
    highEvidence: string;
    defaultAssumption: string;
  }
> = {
  收益: {
    descZh: "评估产品真实商业收入潜力与天花板，杜绝把流量、融资、TAM 当作收入。",
    highEvidence: "同级竞品已公开验证的年收入链接，或真实预收 3 个陌生人定金记录。",
    defaultAssumption: "若仅为预期收入或缺乏同级同量级对照，按推算或 2 星假设兜底。",
  },
  需求市场: {
    descZh: "评估目标人群的真实痛点强烈程度与市场检索热度，不做无根据的脑补。",
    highEvidence: "社交网络/社区中的真实用户抱怨与求助原话链接，或核心词搜索热度验证。",
    defaultAssumption: "无外部链接的“我觉得大家很痛”或自述痛点按 2 星证据不足处理。",
  },
  推广难度: {
    descZh: "评估种子客户获取可行性与渠道触达成本，得分越高表示越容易冷启动推广。",
    highEvidence: "自带精准受众渠道链接、历史同品类成功获客记录或可溯源渠道。",
    defaultAssumption: "无证据时按中立冷启动难度假设处理。",
  },
  性价比: {
    descZh: "评估解决方案相比于现有免费工具/AI 替代品的相对壁垒与客户付费意愿。",
    highEvidence: "有明确替代品对比并有公开佐证链接，证明即便免费工具覆盖 70% 用户仍愿付费。",
    defaultAssumption: "若易被免费工具/通用 AI 替代且无差异化证据，降低评分。",
  },
  价格: {
    descZh: "评估目标客单价与付款转化意愿，验证定价是否落在已被市场接受的区间内。",
    highEvidence: "同类竞品实测价格带链接、或已上线的带价预售页/订金转化链接。",
    defaultAssumption: "未经验证的目标标价视为推算或假设。",
  },
  技术难度: {
    descZh: "评估 MVP 原型开发周期与技术实现复杂度，得分越高表示越容易用现成工具快速搞定。",
    highEvidence: "可复用的开源组件/成熟 API 落地拆解，可在 24 小时内做出可用原型。",
    defaultAssumption: "无现成积木需要重头自研核心引擎时下调星级。",
  },
};

export default function MethodologyPage() {
  const sortedDims = [...DIMS].sort((a, b) => WEIGHTS[b] - WEIGHTS[a]);

  return (
    <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <header className="mb-10 space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wider text-star">
          Transparency & Methodology
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-5xl">
          公开打分方法与已知短板
        </h1>
        <p className="text-base text-muted-foreground sm:text-lg">
          Prospect Stars 坚持以纯规则引擎运行。我们不使用大模型给项目“凭感觉打印象分”，所有维度均基于确定性规则、客观权重与真实证据等级打分。
        </p>
      </header>

      {/* 核心原则与短板摘要 */}
      <section
        className="mb-10 rounded-2xl border border-star/30 bg-star/[0.03] p-6 space-y-4"
        data-testid="methodology-core-principles"
      >
        <h2 className="font-display text-xl font-bold text-ink">
          三大核心准则 (Core Principles)
        </h2>
        <ul className="space-y-3 text-sm text-foreground/90">
          <li className="flex items-start gap-2">
            <span className="font-bold text-star shrink-0">1.</span>
            <div>
              <strong className="text-foreground">不改六维权重，不让大模型直接输出星级：</strong>
              所有最终得分均由公开权重公式严格计算而来，严防 AI“随口乱夸”。
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-star shrink-0">2.</span>
            <div data-testid="methodology-insuff-rule">
              <strong className="text-foreground">证据不足按 {INSUFF.toFixed(1)} 星算（默认惩罚）：</strong>
              预上线项目通常充满乐观假设。凡是缺乏客观佐证的维度，引擎强制判定为“证据不足”并按 {INSUFF.toFixed(1)} 星（2★）计入加权总分，直接压低总评。
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-star shrink-0">3.</span>
            <div>
              <strong className="text-foreground">弱证据在结论（verdict）中强制封顶：</strong>
              如果某个维度得分较高但证据仅为“假设”或“用户自填”（无外部验证链接），结论文本中会严格加上弱证据封顶提示，不许“只给高分不讲证据”。
            </div>
          </li>
        </ul>
      </section>

      {/* 六维权重表 */}
      <section className="mb-12 space-y-4" data-testid="methodology-weights-section">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-bold text-ink">
            六维权重定义 (Dimension Weights)
          </h2>
          <span className="text-xs text-muted-foreground">总权重合计 1.0 (100%)</span>
        </div>
        <p className="text-sm text-muted-foreground">
          与引擎底层代码 <code>WEIGHTS</code> 实时保持一致：
        </p>

        <div className="overflow-x-auto rounded-xl border border-border/80 bg-white/70 shadow-xs">
          <table className="w-full text-left text-sm" data-testid="methodology-weights-table">
            <thead className="border-b border-border/80 bg-muted/40 font-medium text-foreground">
              <tr>
                <th className="px-4 py-3">维度名称</th>
                <th className="px-4 py-3">API 标识符</th>
                <th className="px-4 py-3 text-right">权重数值</th>
                <th className="px-4 py-3 text-right">占比</th>
                <th className="px-4 py-3">核心考察与证据要求</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-foreground/90">
              {sortedDims.map((dim) => {
                const w = WEIGHTS[dim];
                const apiKey = DIM_TO_API[dim];
                const label = API_DIM_LABELS[apiKey];
                const detail = DIMENSION_DETAILS[dim];
                return (
                  <tr key={dim} className="hover:bg-muted/20" data-testid={`weight-row-${apiKey}`}>
                    <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                      {dim} <span className="text-xs font-normal text-muted-foreground">({label})</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {apiKey}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-star" data-testid={`weight-num-${apiKey}`}>
                      {w.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-foreground whitespace-nowrap">
                      {(w * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                      <span className="text-foreground">{detail.descZh}</span>
                      <br />
                      <span className="text-emerald-700">高证据：{detail.highEvidence}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 四档证据等级 */}
      <section className="mb-12 space-y-4" data-testid="methodology-evidence-levels">
        <h2 className="font-display text-2xl font-bold text-ink">
          四档证据等级划分 (Evidence Hierarchy)
        </h2>
        <p className="text-sm text-muted-foreground">
          结果页在每个维度名称旁边明确标示其实际证据等级，清晰揭示评分背后的事实支撑强弱：
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-600/30 bg-emerald-50/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                有来源链接
              </span>
              <span className="text-xs text-emerald-700 font-mono">最高可信度</span>
            </div>
            <p className="text-xs leading-relaxed text-emerald-900">
              包含有效 HTTP/HTTPS 外部验证链接。例如公开的论坛抱怨原帖、行业竞品公开收入截屏链接、Tranco/Similarweb 流量排名、搜索指数链接等。
            </p>
          </div>

          <div className="rounded-xl border border-blue-600/30 bg-blue-50/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                用户自填
              </span>
              <span className="text-xs text-blue-700 font-mono">有具体事实</span>
            </div>
            <p className="text-xs leading-relaxed text-blue-900">
              提交者填写了具体的定性或定量事实（如陌生人付款数、自测价格区间、具体痛点描述、自有渠道），但尚未提供公开可查的外部 URL 证据。
            </p>
          </div>

          <div className="rounded-xl border border-amber-600/30 bg-amber-50/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                推算
              </span>
              <span className="text-xs text-amber-700 font-mono">规则计算得出</span>
            </div>
            <p className="text-xs leading-relaxed text-amber-900">
              无直接交易或直接链接，但通过竞品公开价格中位数、CPC 获客成本区间、月搜索量等关联指标由引擎算法模型推导得出。
            </p>
          </div>

          <div className="rounded-xl border border-rose-600/30 bg-rose-50/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center rounded-md bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800">
                假设
              </span>
              <span className="text-xs text-rose-700 font-mono">默认 2 星兜底</span>
            </div>
            <p className="text-xs leading-relaxed text-rose-900">
              未填写任何证据、或仅填“我觉得大家都需要”等主观猜测。引擎一律按证据不足判定，该维度按 2.0 星惩罚计分并在结论中封顶。
            </p>
          </div>
        </div>
      </section>

      {/* 已知短板说明 */}
      <section
        className="mb-12 rounded-2xl border border-border/80 bg-white/60 p-6 space-y-4"
        data-testid="methodology-known-limitations"
      >
        <h2 className="font-display text-2xl font-bold text-ink">
          已知短板：分不清年入一千与十万
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
          <p>
            商业世界中，极早期的 Pre-launch 项目存在一个客观难题：<strong>在项目真正拿到陌生人订单之前，没有任何数学模型或 AI 能 100% 区分它最终是“年入一千美元的小玩具”还是“年入十万美元的成熟业务”。</strong>
          </p>
          <p>
            由于两者在初期阶段都可能具备相似的关键词搜索量或类似的 Landing Page，两者的根本区别在于后续的<strong>真实付费转化率、流失率与渠道扩展能力</strong>。
          </p>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-xs text-amber-900">
            <strong>引擎的处理策略：</strong>
            <br />
            当收入先验分布跨越三个量级（under $1k / ~$1k / ~$10k / ~$100k+）且缺乏高置信度同级竞品验证时，引擎将明确将 <code>magnitude_uncertain</code> 设为 <code>true</code>，对收益星级实施上限封顶，并在最终结论中如实告知<strong>“收入量级尚不明朗，请勿过早大额投入”</strong>。
          </div>
        </div>
      </section>

      {/* 最便宜的下一步实验 */}
      <section className="mb-12 space-y-4" data-testid="methodology-cheapest-experiments">
        <h2 className="font-display text-2xl font-bold text-ink">
          最便宜的下一步实验 (Cheapest Next-Step Experiments)
        </h2>
        <p className="text-sm text-muted-foreground">
          结果页底部会自动计算出<strong>“最弱维度”</strong>，并给出低成本、高效率的下一步验证实验。绝大多数验证在 24–48 小时内花费极少（甚至零成本）即可完成：
        </p>

        <div className="space-y-3">
          {DIMS.map((dim) => {
            const exp = CHEAPEST_EXPERIMENTS[dim];
            return (
              <div
                key={dim}
                className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm"
              >
                <div className="font-semibold text-foreground mb-1">
                  【{dim}】验证实验：
                </div>
                <p className="text-foreground/90 text-xs sm:text-sm">{exp.zh}</p>
                <p className="text-muted-foreground text-xs mt-1 font-mono">{exp.en}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 底部导航 */}
      <footer className="pt-6 border-t border-border/70 flex items-center justify-between">
        <Link
          href="/"
          className="text-sm font-medium text-foreground underline underline-offset-4 hover:text-star transition-colors"
        >
          ← 返回打分器 (Back to scorer)
        </Link>
        <Link
          href="/terms"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          免责声明与服务条款 →
        </Link>
      </footer>
    </article>
  );
}
