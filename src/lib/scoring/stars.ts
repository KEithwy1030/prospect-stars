/**
 * Prospect Stars scoring engine — faithful TypeScript port of stars.py.
 * Numeric rules, caps, and half-star rounding must match the Python source.
 * Reason strings are English for the public product.
 */
import baseRate from "@/data/base-rate.json";
import type {
  DimKey,
  DimResult,
  FunnelEstimate,
  Mode,
  Product,
  ScoreResult,
} from "./types";

export const U = "UNKNOWN";
export const DIMS: DimKey[] = [
  "推广难度",
  "技术难度",
  "需求市场",
  "性价比",
  "价格",
  "收益",
];
export const WEIGHTS: Record<DimKey, number> = {
  收益: 0.25,
  需求市场: 0.2,
  推广难度: 0.2,
  性价比: 0.15,
  价格: 0.1,
  技术难度: 0.1,
};
export const LEVELS = ["不到一千", "一千级", "一万级", "十万级"] as const;
export const LEVEL_STAR = [1.5, 2.75, 3.75, 4.75];
export const INSUFF = 2.0;

export const TECH_COST: Record<string, number> = {
  落地页: 0,
  "静态文件/模板": 0,
  支付接入: 0.25,
  调用大模型: 0.25,
  "视觉/多模态模型": 0.25,
  生成报告: 0.25,
  抓取公开网页: 0.5,
  "用户账户/订阅": 0.5,
  "MCP/开发者接口": 0.25,
  "第三方平台审核/KYC": 0.5,
  持续人工交付: 0.5,
  "浏览器自动化/批量抓取": 0.75,
  "合规/法律风险": 0.75,
  "大量人工内容（组件/剧本等）": 0.75,
  实时多人: 1.0,
  "视频/音频生成渲染": 1.0,
  "第三方平台发布接口（多平台授权）": 1.0,
};

/** English labels for known tech parts (UI/API). */
export const TECH_PART_LABELS: Record<string, string> = {
  落地页: "Landing page",
  "静态文件/模板": "Static files / templates",
  支付接入: "Payment integration",
  调用大模型: "LLM calls",
  "视觉/多模态模型": "Vision / multimodal models",
  生成报告: "Report generation",
  抓取公开网页: "Public web scraping",
  "用户账户/订阅": "User accounts / subscriptions",
  "MCP/开发者接口": "MCP / developer API",
  "第三方平台审核/KYC": "Third-party review / KYC",
  持续人工交付: "Ongoing manual delivery",
  "浏览器自动化/批量抓取": "Browser automation / bulk scraping",
  "合规/法律风险": "Compliance / legal risk",
  "大量人工内容（组件/剧本等）": "Heavy manual content",
  实时多人: "Realtime multiplayer",
  "视频/音频生成渲染": "Video / audio generation",
  "第三方平台发布接口（多平台授权）": "Multi-platform publish APIs",
};

export function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" && ["", U].includes(v.trim().toUpperCase())) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function r05(x: number): number {
  return Math.max(0.0, Math.min(5.0, Math.floor(x * 2 + 0.5) / 2));
}

export function clamp(x: number, lo = 1.0, hi = 5.0): number {
  return Math.max(lo, Math.min(hi, x));
}

export function snum(x: number): string {
  return `${Number.parseFloat(String(x))} stars`;
}

function usd(x: number): string {
  if (x < 100) {
    const s = x.toFixed(2).replace(/\.?0+$/, "");
    return s;
  }
  return Math.round(x).toLocaleString("en-US");
}

function money(x: number | null): string {
  return x === null ? U : `$${Math.round(x).toLocaleString("en-US")}`;
}

export function loadBase(): { levels: number[]; shrinkK: number; src: string } {
  return {
    levels: [...baseRate.levels],
    shrinkK: baseRate.shrink_k,
    src: baseRate.src,
  };
}

export function preOk(item: { phase?: string } | null | undefined, mode: Mode): boolean {
  return mode === "now" || String(item?.phase ?? "").trim() !== "上线后";
}

export function levelOf(x: number): number {
  return x < 1000 ? 0 : x < 1e4 ? 1 : x < 1e5 ? 2 : 3;
}

export function distPoints(
  p: Product,
  mode: Mode,
): { pts: number; why: string[] } {
  const d = p.distribution || {};
  let pts = 0.0;
  const why: string[] = [];
  let best = 0;
  for (const a of d.assets || []) {
    if (!preOk(a, mode)) continue;
    if (mode === "pre" && String(a.at_launch ?? "是") !== "是") continue;
    const n = num(a.size);
    if (n === null) continue;
    best = Math.max(best, n);
    why.push(`${a.what} ${Math.round(n).toLocaleString("en-US")} (${a.src})`);
  }
  pts += best >= 1e5 ? 2 : best >= 1e4 ? 1 : best >= 1e3 ? 0.5 : 0;
  for (const c of d.proven_channels || []) {
    if (!preOk(c, mode)) continue;
    pts += 1;
    why.push(`Proven channel: ${c.what} (${c.src})`);
  }
  for (const t of d.track_record || []) {
    if (!preOk(t, mode)) continue;
    const m = num(t.monthly_usd);
    if (m !== null && m >= 1000) {
      pts += 0.5;
      why.push(
        `Prior product revenue: ${t.what} ~$${Math.round(m).toLocaleString("en-US")}/mo (${t.src})`,
      );
    }
  }
  return { pts: Math.min(pts, 2.0), why };
}

function channels(p: Product, mode: Mode) {
  const d = p.distribution || {};
  return (d.channels || []).filter((c) => preOk(c, mode) && c.src);
}

export function vol(k: { volume?: string | number }): number | null {
  const v = k.volume;
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const s = String(v).trim().toLowerCase().replace(/k/g, "000");
  if (s.includes("-")) {
    const [a, b] = s.split("-").map((x) => Number(x));
    return a > 0 ? (a * b) ** 0.5 : b / 2;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function cpcMid(p: Product): number | null {
  const vals: number[] = [];
  for (const k of p.keywords || []) {
    const lo = num(k.cpc_low);
    const hi = num(k.cpc_high);
    if (lo !== null && hi !== null) vals.push((lo * hi) ** 0.5);
  }
  const a = p.ads || {};
  if (!vals.length && num(a.cpc_low) !== null && num(a.cpc_high) !== null) {
    vals.push((num(a.cpc_low)! * num(a.cpc_high)!) ** 0.5);
  }
  if (!vals.length) return null;
  const sorted = [...vals].sort((x, y) => x - y);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function minPrice(p: Product): number | null {
  const t = ((p.price || {}).tiers || [])
    .map((x) => num(x))
    .filter((x): x is number => x !== null);
  return t.length ? Math.min(...t) : null;
}

function painCounts(p: Product, mode: Mode) {
  const c = { 抱怨: 0, 愿付钱: 0, 拒绝: 0 };
  for (const x of p.pain_evidence || []) {
    if (!preOk(x, mode) || !x.src) continue;
    const k = String(x.kind ?? "").trim() as keyof typeof c;
    if (k in c) c[k] += Math.trunc(num(x.people) || 1);
  }
  return c;
}

export function dimPromo(
  p: Product,
  mode: Mode,
  e: FunnelEstimate | null | undefined,
): [number, string[], boolean] {
  const why: string[] = [];
  const ch = channels(p, mode);
  const { pts: D, why: dwhy } = distPoints(p, mode);
  let s = 1.5;
  if (ch.length) {
    s += ch.length >= 2 ? 1.5 : 1.0;
    for (const c of ch) why.push(`Low-cost reach: ${c.what} (${c.src})`);
  } else {
    why.push("No sourced low-cost reach channel found");
  }
  if (D) {
    s += 0.75 * D;
    why.push(...dwhy);
  } else {
    why.push("No verifiable distribution assets (followers / email list / proven channels)");
  }
  let reachTxt = "";
  if (
    mode === "now" &&
    e &&
    e.reached != null &&
    e.reached >= 50 &&
    e.looked != null
  ) {
    const r = e.looked / e.reached;
    if (r > 1) {
      why.push(
        `Actuals: reached ${e.reached.toFixed(0)}, looked ${e.looked.toFixed(0)} (looked > reached — inconsistent, no adjustment)`,
      );
    } else if (r >= 0.2) {
      s += 0.5;
      reachTxt = `Actuals: ${e.looked.toFixed(0)} of ${e.reached.toFixed(0)} looked`;
      why.push(
        `Actuals: ${e.looked.toFixed(0)} of ${e.reached.toFixed(0)} looked (${(r * 100).toFixed(0)}%), reach works +0.5`,
      );
    } else if (r < 0.05) {
      s -= 0.5;
      reachTxt = `Actuals: only ${e.looked.toFixed(0)} of ${e.reached.toFixed(0)} looked`;
      why.push(
        `Actuals: only ${e.looked.toFixed(0)} of ${e.reached.toFixed(0)} looked (${(r * 100).toFixed(0)}%) −0.5`,
      );
    }
  }
  const cpc = cpcMid(p);
  const pr = minPrice(p);
  if (cpc && pr) {
    const ratio = pr / cpc;
    if (ratio < 5) {
      s -= 0.5;
      why.push(
        `Ad click ~$${cpc.toFixed(2)}; ASP $${Number.parseFloat(String(pr))} only buys ${ratio.toFixed(0)} clicks — paid acquisition is hard`,
      );
    } else if (ratio >= 30) {
      s += 0.5;
      why.push(
        `Ad click ~$${cpc.toFixed(2)}; ASP buys ${ratio.toFixed(0)} clicks — paid acquisition has room`,
      );
    } else {
      why.push(
        `Ad click ~$${cpc.toFixed(2)}; ASP buys ${ratio.toFixed(0)} clicks (moderate)`,
      );
    }
  }
  const kgrs: number[] = [];
  for (const k of p.keywords || []) {
    const v = vol(k);
    const ait = num(k.allintitle);
    if (v && ait !== null) kgrs.push(ait / v);
  }
  if (kgrs.length) {
    const a = kgrs.reduce((x, y) => x + y, 0) / kgrs.length;
    if (a < 0.25) {
      s += 0.5;
      why.push(`Low keyword competition (mean KGR ${a.toFixed(2)})`);
    } else if (a > 1) {
      s -= 0.5;
      why.push(`High keyword competition (mean KGR ${a.toFixed(2)})`);
    }
  }
  const big = (p.paid_comps || []).filter((c) => {
    const r = num(c.tranco?.rank);
    return r !== null && r <= 50000;
  });
  if (big.length && D === 0) {
    s -= 0.5;
    const rank = num(big[0]!.tranco!.rank)!;
    why.push(
      `Large peer site (${big[0]!.name} ~rank ${Math.round(rank).toLocaleString("en-US")}); hard to be seen without distribution`,
    );
  }
  let cap: number | null = null;
  if (!ch.length && D === 0) {
    cap = 2.0;
    why.push("No low-cost reach and no distribution assets → this dimension capped at 2 stars");
  }
  s = clamp(s);
  if (cap !== null) s = Math.min(s, cap);
  const b: string[] = [
    ch.length
      ? `${ch.length} low-cost reach channel(s)`
      : "No low-cost reach channel found",
    D
      ? `Verifiable distribution advantage (${Number.parseFloat(String(D))} tiers)`
      : "No followers / email list / distribution assets",
  ];
  if (reachTxt) b.push(reachTxt);
  if (big.length && D === 0) b.push("Large peer sites competing for attention");
  why.unshift("BRIEF:" + b.join("; "));
  return [r05(s), why, false];
}

export function dimTech(
  p: Product,
  mode: Mode,
): [number | null, string[], boolean] {
  const t = p.tech || {};
  const parts = t.parts || [];
  if (!parts.length || !t.why) {
    return [
      null,
      ["BRIEF:No tech parts and rationale written", "Missing tech.parts / tech.why"],
      true,
    ];
  }
  let cost = 0.0;
  const why: string[] = [];
  const unk: string[] = [];
  for (const x of parts) {
    if (x in TECH_COST) cost += TECH_COST[x]!;
    else {
      cost += 0.5;
      unk.push(x);
    }
  }
  let s = 5 - cost;
  const partLabels = parts.map((x) => TECH_PART_LABELS[x] || x);
  why.push(`Parts to build: ${partLabels.join(", ")} (total −${Number.parseFloat(String(cost))} stars)`);
  if (unk.length) why.push(`Unknown parts, −0.5 each: ${unk.join(", ")}`);
  if (mode === "now" && String(t.built ?? "") === "是") {
    s += 0.5;
    why.push("Already shipped and running +0.5");
  }
  why.push(`Rationale: ${t.why}${t.src ? ` (${t.src})` : ""}`);
  const hard = parts.filter((x) => (TECH_COST[x] ?? 0.5) >= 0.75);
  let b = hard.length
    ? `Hard parts: ${hard.map((x) => TECH_PART_LABELS[x] || x).join(", ")}`
    : "No hard parts";
  if (mode === "now" && String(t.built ?? "") === "是") b += "; already shipped";
  why.unshift("BRIEF:" + b);
  return [r05(clamp(s)), why, false];
}

export function dimDemand(
  p: Product,
  mode: Mode,
): [number | null, string[], boolean] {
  const subs: number[] = [];
  const why: string[] = [];
  const vs = (p.keywords || []).map(vol).filter((v): v is number => v !== null);
  if (vs.length) {
    const t = vs.reduce((a, b) => a + b, 0);
    const s = t < 100 ? 1.5 : t < 1000 ? 2.5 : t < 1e4 ? 3.5 : 4.5;
    subs.push(s);
    why.push(
      `Search volume: ${vs.length} keyword(s) ~${Math.round(t).toLocaleString("en-US")}/mo → ${snum(s)}`,
    );
  } else {
    why.push("Search volume: no real numbers (insufficient evidence)");
  }
  const pc = painCounts(p, mode);
  if (pc["愿付钱"] || pc["抱怨"]) {
    const n = pc["愿付钱"];
    const m = pc["抱怨"];
    let s =
      n >= 5 ? 4.5 : n >= 3 ? 4 : n >= 1 ? 3 : m >= 10 ? 3 : m >= 3 ? 2.5 : 2;
    if (pc["拒绝"] > n) s -= 0.5;
    subs.push(s);
    why.push(
      `Pain: ${m} complaint/ask posts, ${n} willing-to-pay signals, ${pc["拒绝"]} explicit refusals → ${snum(s)}`,
    );
  } else {
    why.push("Pain: no sourced user quotes (insufficient evidence)");
  }
  const ver = (p.paid_comps || [])
    .map((c) => num(c.verified_annual_usd))
    .filter((x): x is number => x !== null);
  if (ver.length) {
    const b = Math.max(...ver);
    const s = b >= 1e5 ? 4.5 : b >= 1e4 ? 3.5 : b >= 1e3 ? 2.5 : 1.5;
    subs.push(s);
    why.push(`Peer verified revenue: highest ~${money(b)}/yr → ${snum(s)}`);
  } else {
    why.push("Peer verified revenue: none");
  }
  const ranks = (p.paid_comps || []).filter((c) => c.tranco);
  if (ranks.length) {
    const rs = ranks
      .map((c) => num(c.tranco?.rank))
      .filter((x): x is number => x !== null);
    let b: number | null = null;
    let s: number;
    if (rs.length) {
      b = Math.min(...rs);
      s = b <= 1e5 ? 4.5 : b <= 1e6 ? 3.5 : 2.5;
    } else {
      s = 1.5;
    }
    subs.push(s);
    why.push(
      `Peer traffic: checked ${ranks.length} site(s); ` +
        (b !== null
          ? `best global rank ~${Math.round(b).toLocaleString("en-US")}`
          : "none on the global rank list") +
        ` → ${snum(s)}`,
    );
  }
  const tr = p.trend || {};
  const adj =
    { 涨: 0.5, 跌: -0.5 }[String(tr.direction ?? "")] ?? 0;
  if (tr.direction && tr.direction !== U) {
    const dir =
      tr.direction === "涨" ? "up" : tr.direction === "跌" ? "down" : tr.direction;
    why.push(`Trend: ${dir} (${tr.src})`);
  }
  const b: string[] = [];
  b.push(vs.length ? `Search ~${Math.round(vs.reduce((a, c) => a + c, 0)).toLocaleString("en-US")}/mo` : "No search volume numbers");
  b.push(
    pc["抱怨"] || pc["愿付钱"]
      ? `Pain ${pc["抱怨"]} complaints, ${pc["愿付钱"]} willing-to-pay`
      : "No user quotes",
  );
  b.push(ver.length ? `Highest peer verified revenue ~${money(Math.max(...ver))}/yr` : "No peer verified revenue");
  why.unshift("BRIEF:" + b.join("; "));
  if (!subs.length) return [null, why, true];
  let s = subs.reduce((a, c) => a + c, 0) / subs.length + adj;
  if (subs.length === 1) {
    s = Math.min(s, 3.5);
    why.push("Only one evidence class → capped at 3.5 stars");
  }
  return [r05(clamp(s)), why, false];
}

export function dimValue(
  p: Product,
  mode: Mode,
  e: FunnelEstimate | null | undefined,
): [number | null, string[], boolean] {
  const fs = p.free_or_ai_substitute || {};
  const a = String(fs.answer ?? "").trim();
  const baseMap: Record<string, number> = { 能: 1.5, 部分能: 2.5, 否: 3.5 };
  const base = baseMap[a];
  if (base === undefined) {
    return [
      null,
      [
        "BRIEF:Did not say whether free/AI can substitute",
        "Free/AI substitute: not stated (insufficient evidence)",
      ],
      true,
    ];
  }
  let s = base;
  const why = [
    `Can free tools or AI replace this directly: ${a === "能" ? "yes" : a === "部分能" ? "partly" : "no"} (${fs.why || ""}) → starts at ${snum(base)}`,
  ];
  const pr = minPrice(p);
  const cp = (p.paid_comps || [])
    .map((c) => num(c.price_low_usd))
    .filter((x): x is number => x !== null);
  if (pr && cp.length) {
    const sorted = [...cp].sort((x, y) => x - y);
    const mid = Math.floor(sorted.length / 2);
    const m =
      sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
    const r = pr / m;
    if (r <= 0.6) {
      s += 0.5;
      why.push(`Our low $${Number.parseFloat(String(pr))} vs peer median start $${usd(m)} — meaningfully cheaper +0.5`);
    } else if (r >= 2) {
      s -= 0.5;
      why.push(`Our low $${Number.parseFloat(String(pr))} vs peer median start $${usd(m)} — 2×+ more expensive −0.5`);
    } else {
      why.push(`Our low $${Number.parseFloat(String(pr))} vs peer median start $${usd(m)} — similar`);
    }
  }
  const cpc = cpcMid(p);
  let conv: number | null = null;
  if (mode === "now" && e?.paid && e?.looked) conv = e.paid / e.looked;
  if (cpc && pr) {
    if (conv) {
      const pb = (pr * conv) / cpc;
      why.push(
        `Paid acquisition payback: click ~$${cpc.toFixed(2)}, real pay rate ${(conv * 100).toFixed(1)}%, recover $${pb.toFixed(2)} per $1 spent`,
      );
      s += pb >= 1 ? 0.5 : pb < 0.3 ? -0.5 : 0;
    } else {
      const need = cpc / pr;
      why.push(
        `Paid acquisition payback: click ~$${cpc.toFixed(2)}; need 1 paying customer per ~${(1 / need).toFixed(0)} clicks at $${Number.parseFloat(String(pr))} (no real pay rate yet)`,
      );
      s += need <= 0.01 ? 0.5 : need >= 0.05 ? -0.5 : 0;
    }
  }
  const ca = (p.distribution || {}).comp_cpa || {};
  if (num(ca.usd) && pr) {
    const r = pr / num(ca.usd)!;
    why.push(
      `Peer public CPA ~$${Number.parseFloat(String(num(ca.usd)))}; our low price is ${r.toFixed(1)}× that (${ca.src})`,
    );
    s += r >= 1 ? 0.5 : r < 0.3 ? -0.5 : 0;
  }
  const briefBits = [
    `Free/AI ${a === "能" ? "can" : a === "部分能" ? "partly can" : "cannot"} replace directly`,
  ];
  if (pr && cp.length) {
    const sorted = [...cp].sort((x, y) => x - y);
    const mid = Math.floor(sorted.length / 2);
    const m =
      sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
    briefBits.push(`Ours $${Number.parseFloat(String(pr))}, peer start median $${usd(m)}`);
  }
  if (mode === "now" && e) {
    if (e.paid) {
      s += 0.5;
      why.push(`Actuals: ${e.paid.toFixed(0)} strangers already paid +0.5`);
      briefBits.push(`${e.paid.toFixed(0)} paid`);
    } else if (e.paid === 0 && e.looked && e.looked >= 30) {
      s -= 0.5;
      why.push(`Actuals: ${e.looked.toFixed(0)} looked carefully, 0 paid −0.5`);
      briefBits.push(`${e.looked.toFixed(0)} looked, 0 paid`);
    }
  }
  why.unshift("BRIEF:" + briefBits.join("; "));
  return [r05(clamp(s)), why, false];
}

export function dimPrice(
  p: Product,
  mode: Mode,
  _e: FunnelEstimate | null | undefined,
): [number | null, string[], boolean] {
  const comps = p.paid_comps || [];
  const band = comps
    .map((c) => num(c.price_low_usd))
    .filter((x): x is number => x !== null);
  if (!band.length) {
    return [
      null,
      [
        "BRIEF:No verifiable peer list prices",
        "No peer list prices (price_low_usd) → insufficient evidence",
      ],
      true,
    ];
  }
  const lo = Math.min(...band);
  const hi = Math.max(...band);
  let s = 2.5;
  const why = [`Peer price band: $${Number.parseFloat(String(lo))}–$${Number.parseFloat(String(hi))}`];
  if (
    comps.some(
      (c) => num(c.verified_annual_usd) && num(c.price_low_usd),
    )
  ) {
    s += 0.5;
    why.push("A peer at this price band has verified revenue +0.5");
  }
  const pr = minPrice(p);
  if (pr !== null) {
    if (0.5 * lo <= pr && pr <= 1.5 * hi) {
      s += 0.5;
      why.push(`Our low $${Number.parseFloat(String(pr))} sits in the peer band +0.5`);
    } else {
      s -= 0.5;
      why.push(`Our low $${Number.parseFloat(String(pr))} is outside the peer band −0.5`);
    }
  }
  let tested = false;
  if (mode === "now") {
    const pay = p.payments || {};
    const n = num(pay.stranger_count) || 0;
    if (n >= 1) {
      tested = true;
      s += n >= 3 ? 1 : 0.5;
      why.push(
        `${n.toFixed(0)} strangers paid our price +${n >= 3 ? 1 : 0.5}`,
      );
    }
    for (const t of p.trials || []) {
      tested = true;
      if ((num(t.paid) || 0) > 0) {
        s += 1;
        why.push(`Price test $${t.price} got a payment +1`);
      } else if ((num(t.people) || 0) >= 10) {
        s -= 0.5;
        why.push(`Price test $${t.price} shown to ${t.people}, 0 paid −0.5`);
      }
    }
  }
  if (!tested) {
    s = Math.min(s, 3.5);
    why.push("No price test yet → capped at 3.5 stars");
  }
  const b = [
    `Peer prices $${Number.parseFloat(String(lo))}–$${Number.parseFloat(String(hi))}` +
      (pr !== null ? `, our low $${Number.parseFloat(String(pr))}` : ""),
  ];
  if (mode === "now") {
    const n = num((p.payments || {}).stranger_count) || 0;
    const fails = (p.trials || []).filter((t) => !(num(t.paid) || 0));
    if (n) b.push(`${n.toFixed(0)} strangers paid our price`);
    if (fails.length)
      b.push(
        "Price tests " + fails.map((t) => `$${t.price}`).join(", ") + " all 0 paid",
      );
  }
  if (!tested) b.push("No price test yet");
  why.unshift("BRIEF:" + b.join("; "));
  return [r05(clamp(s)), why, false];
}

export function revFromFunnel(x: number): number {
  if (x <= 0) return 1.0;
  const lv = levelOf(x);
  if (lv === 0) return 1 + Math.log10(Math.max(x, 1)) / 3;
  const lo = 10 ** (lv + 2);
  const frac = Math.min(Math.log10(x / lo), 1);
  return [NaN, 2.5, 3.5, 4.5][lv]! + 0.5 * frac;
}

export function dimRevenue(
  p: Product,
  mode: Mode,
  e: FunnelEstimate | null | undefined,
): [number, string[], boolean, number[] | null] {
  const why: string[] = [];
  if (mode === "now" && e && e.revenue != null) {
    const s = revFromFunnel(e.revenue);
    why.push(
      `BRIEF:From real funnel ~${money(e.revenue)}/yr` +
        (e.revenue === 0 ? " (no stranger payments yet)" : "") +
        (e.small_sample ? "; small sample" : ""),
    );
    why.push(
      `Real funnel: ~${money(e.revenue)}/yr (${LEVELS[levelOf(e.revenue)]})`,
    );
    if (e.small_sample) why.push("Small sample — may be off by one tier");
    return [r05(s), why, false, null];
  }
  if (mode === "now" && e && e.revenue == null && e.paid == null) {
    why.push("Payments not verified; cannot compute real funnel → using pre-launch path");
  }
  const { levels: base, shrinkK: k } = loadBase();
  const peers = (p.paid_comps || [])
    .filter(
      (c) =>
        num(c.verified_annual_usd) !== null && String(c.tier ?? "") === "同级",
    )
    .map((c) => [c.name, num(c.verified_annual_usd)!] as const);
  const n = peers.length;
  let dist = base.map((b) => k * b);
  for (const [, v] of peers) dist[levelOf(v)]! += 1;
  const tot = dist.reduce((a, b) => a + b, 0);
  dist = dist.map((x) => x / tot);
  const { pts: D, why: dwhy } = distPoints(p, mode);
  if (D) {
    const shift = (dd: number[], sft: number) => {
      const o = [0, 0, 0, 0];
      for (let i = 0; i < dd.length; i++) o[Math.min(i + sft, 3)]! += dd[i]!;
      return o;
    };
    const f = Math.floor(D);
    const fr = D - f;
    const a = shift(dist, f);
    const b = shift(dist, f + 1);
    dist = a.map((x, i) => (1 - fr) * x + fr * b[i]!);
  }
  let s = dist.reduce((acc, pp, i) => acc + pp * LEVEL_STAR[i]!, 0);
  const insuff = n === 0;
  if (n) {
    why.push(
      "Same-tier peer verified revenue: " +
        peers.map(([nm, v]) => `${nm} ~${money(v)}/yr`).join(", ") +
        ` (${n} peer(s); small sample shrinks toward base rate)`,
    );
  } else {
    why.push(
      "No same-tier peers with verified revenue → insufficient evidence; using site-wide base rate (~68% under $1k)",
    );
  }
  if (D) {
    why.push(
      `Distribution advantage ${Number.parseFloat(String(D))} tiers (verifiable only): ` +
        dwhy.join("; "),
    );
  } else {
    why.push("No verifiable distribution advantage → no upward shift");
  }
  const spread = dist.filter((x) => x >= 0.15).length;
  if (spread >= 3) {
    s = Math.min(s, 3.5);
    why.push(
      `Probability mass spans ${spread} tiers → cannot tell apart yet; run a cheap test first`,
    );
  }
  if (insuff) {
    s = Math.min(s, 3.0);
    why.push("No same-tier verified revenue → revenue capped at 3 stars");
  }
  const top = dist.reduce(
    (best, x, i, arr) => (x > arr[best]! ? i : best),
    0,
  );
  const b = [
    n ? `${n} same-tier peer(s) with verified revenue` : "No same-tier verified revenue (insufficient evidence)",
    D ? `Distribution advantage ${Number.parseFloat(String(D))} tiers` : "No distribution advantage",
    `Most likely ${LEVELS[top]} (${(dist[top]! * 100).toFixed(0)}%)`,
  ];
  if (spread >= 3) b.push("But spans three tiers — cannot tell");
  why.unshift("BRIEF:" + b.join("; "));
  return [r05(clamp(s)), why, insuff, dist];
}

export function total(ds: Record<DimKey, DimResult>): [number, string[]] {
  const vals: Record<DimKey, number> = {} as Record<DimKey, number>;
  for (const k of DIMS) {
    vals[k] = ds[k].star !== null ? ds[k].star! : INSUFF;
  }
  let t = 0;
  for (const k of DIMS) t += vals[k]! * WEIGHTS[k]!;
  const caps: string[] = [];
  if (vals["收益"]! <= 2 || vals["需求市场"]! <= 2) {
    t = Math.min(t, 3);
    caps.push("Revenue or market demand ≤2 stars → overall capped at 3");
  }
  if (vals["推广难度"]! <= 1.5 || vals["性价比"]! <= 1.5) {
    t = Math.min(t, 3);
    caps.push("Promotion or value ≤1.5 stars → overall capped at 3");
  }
  if (ds["收益"].insuff && ds["需求市场"].insuff) {
    t = Math.min(t, 3.5);
    caps.push("Revenue and demand both insufficient → overall capped at 3.5");
  }
  return [r05(t), caps];
}

export function score(
  p: Product,
  mode: Mode,
  e: FunnelEstimate | null = null,
): ScoreResult {
  const ds = {} as Record<DimKey, DimResult>;
  {
    const [s, w, i] = dimPromo(p, mode, e);
    ds["推广难度"] = { star: s, why: w, insuff: i };
  }
  {
    const [s, w, i] = dimTech(p, mode);
    ds["技术难度"] = { star: s, why: w, insuff: i };
  }
  {
    const [s, w, i] = dimDemand(p, mode);
    ds["需求市场"] = { star: s, why: w, insuff: i };
  }
  {
    const [s, w, i] = dimValue(p, mode, e);
    ds["性价比"] = { star: s, why: w, insuff: i };
  }
  {
    const [s, w, i] = dimPrice(p, mode, e);
    ds["价格"] = { star: s, why: w, insuff: i };
  }
  {
    const [s, w, i, dist] = dimRevenue(p, mode, e);
    ds["收益"] = { star: s, why: w, insuff: i, dist };
  }
  const [t, caps] = total(ds);
  return { dims: ds, total: t, caps, mode };
}

export function plain(dim: DimKey, s: number | null): string {
  if (s === null) return "Insufficient evidence — counted as 2 stars";
  const hi = s >= 4;
  const mid = s >= 3;
  const map: Record<DimKey, string> = {
    推广难度: hi ? "Easy to promote" : mid ? "Doable, but promotion takes work" : "Hard to promote",
    技术难度: hi ? "Easy to build" : mid ? "Medium — buildable with time" : "Hard to build",
    需求市场: hi ? "Demand is clear" : mid ? "Some demand, evidence is mixed" : "Demand not yet proven",
    性价比: hi ? "Buyers should find it worth it" : mid ? "OK, but substitutes exist" : "Easy to replace with free/AI tools",
    价格: hi ? "Pricing has evidence behind it" : mid ? "Pricing looks reasonable, not fully tested" : "Price unvalidated",
    收益:
      s >= 4.5
        ? "Could reach ~$100k / year"
        : s >= 3.5
          ? "Around the $10k / year tier"
          : s >= 2.5
            ? "Around the $1k / year tier"
            : "Likely under $1k / year",
  };
  return map[dim];
}

export function shortReason(d: DimResult): string {
  for (const x of d.why) {
    if (x.startsWith("BRIEF:")) return x.slice(6);
  }
  return d.why[0] || "";
}

export function verdict(sc: ScoreResult): string {
  const t = sc.total;
  const ds = sc.dims;
  const weak = [...DIMS].sort((a, b) => {
    const sa = ds[a].star !== null ? ds[a].star! : INSUFF;
    const sb = ds[b].star !== null ? ds[b].star! : INSUFF;
    return sa - sb;
  }).slice(0, 2);
  const weakTxt = weak
    .map((k) => {
      const label =
        k === "推广难度"
          ? "promotion"
          : k === "技术难度"
            ? "technical"
            : k === "需求市场"
              ? "demand"
              : k === "性价比"
                ? "value"
                : k === "价格"
                  ? "price"
                  : "revenue";
      return ds[k].star === null
        ? `${label} (insufficient evidence)`
        : `${label} ${snum(ds[k].star!)}`;
    })
    .join(", ");
  const dist = ds["收益"].dist;
  const unsure = dist != null && dist.filter((x) => x >= 0.15).length >= 3;
  let head: string;
  if (t >= 4) head = "Strong prospect — worth building seriously.";
  else if (t >= 3.5) head = "Promising, but fix the weak spots first.";
  else if (t >= 3) head = "Worth a cheap test — don't spend money yet.";
  else if (t >= 2.5) head = "Weak prospect — only worth a small time-boxed experiment.";
  else head = "Not recommended.";
  const tail = unsure
    ? " Revenue magnitude is still unclear across tiers — run a minimal-cost test first."
    : "";
  return `${head} Weakest: ${weakTxt}.${tail}`;
}

export function distTxt(dist: number[] | null | undefined): string {
  if (!dist) return "";
  return LEVELS.map((lv, i) => `${lv} ${(dist[i]! * 100).toFixed(0)}%`).join("; ");
}

export function starsGlyph(x: number | null): string {
  if (x === null) return "insufficient";
  const full = Math.floor(x);
  const half = x - full >= 0.5;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - (half ? 1 : 0));
}
