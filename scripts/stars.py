#!/usr/bin/env python3
"""凯默 商业前景五星打分 v2（离线，只读 YAML）。
六个维度：推广难度、技术难度、需求市场、性价比、价格、收益。星越多越好（推广/技术 5 星 = 好推/好做）。
每颗星都由 YAML 里带出处的字段按固定规则算出来；缺证据就标「证据不足」并按 2 星记（拉低总分），不靠感觉打分。
两种口径：
  pre  = 上线前：只用上线前就能拿到的证据（忽略漏斗、付款、测价、GSC、phase=上线后 的条目、「已做出来」加分）
  now  = 现在：全部证据；有真漏斗时收益直接用真数
"""
import math, os, statistics
import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
U = "UNKNOWN"
DIMS = ["推广难度", "技术难度", "需求市场", "性价比", "价格", "收益"]
WEIGHTS = {"收益": .25, "需求市场": .20, "推广难度": .20, "性价比": .15, "价格": .10, "技术难度": .10}
LEVELS = ["不到一千", "一千级", "一万级", "十万级"]
LEVEL_STAR = [1.5, 2.75, 3.75, 4.75]
INSUFF = 2.0
TECH_COST = {
    "落地页": 0, "静态文件/模板": 0, "支付接入": .25, "调用大模型": .25, "视觉/多模态模型": .25, "生成报告": .25,
    "抓取公开网页": .5, "用户账户/订阅": .5, "MCP/开发者接口": .25, "第三方平台审核/KYC": .5, "持续人工交付": .5,
    "浏览器自动化/批量抓取": .75, "合规/法律风险": .75, "大量人工内容（组件/剧本等）": .75,
    "实时多人": 1.0, "视频/音频生成渲染": 1.0, "第三方平台发布接口（多平台授权）": 1.0,
}

def num(v):
    if v is None or (isinstance(v, str) and v.strip().upper() in ("", U)): return None
    try: return float(v)
    except Exception: return None

def r05(x): return max(0.0, min(5.0, math.floor(x * 2 + 0.5) / 2))
def clamp(x, lo=1.0, hi=5.0): return max(lo, min(hi, x))
def stars(x):
    if x is None: return "证据不足"
    full = int(x); half = (x - full) >= .5
    return "★" * full + ("½" if half else "") + "☆" * (5 - full - (1 if half else 0))
def snum(x): return f"{x:g}星"
def usd(x): return f"{x:,.2f}".rstrip("0").rstrip(".") if x < 100 else f"{x:,.0f}"

def load_base():
    b = yaml.safe_load(open(os.path.join(HERE, "refs", "base-rate.yaml"), encoding="utf-8"))
    return b["levels"], b["shrink_k"], b["src"]

def pre_ok(item, mode):
    return mode == "now" or str((item or {}).get("phase", "")).strip() != "上线后"

def level_of(x): return 0 if x < 1000 else 1 if x < 1e4 else 2 if x < 1e5 else 3

def money(x): return U if x is None else f"${x:,.0f}"

def dist_points(p, mode):
    d = p.get("distribution") or {}
    pts, why = 0.0, []
    best = 0
    for a in d.get("assets") or []:
        if not pre_ok(a, mode): continue
        if mode == "pre" and str(a.get("at_launch", "是")) != "是": continue
        n = num(a.get("size"))
        if n is None: continue
        best = max(best, n)
        why.append(f"{a.get('what')} {n:,.0f}（{a.get('src')}）")
    pts += 2 if best >= 1e5 else 1 if best >= 1e4 else .5 if best >= 1e3 else 0
    for c in d.get("proven_channels") or []:
        if not pre_ok(c, mode): continue
        pts += 1; why.append(f"已跑通的渠道：{c.get('what')}（{c.get('src')}）")
    for t in d.get("track_record") or []:
        if not pre_ok(t, mode): continue
        m = num(t.get("monthly_usd"))
        if m is not None and m >= 1000:
            pts += .5; why.append(f"过往产品收入：{t.get('what')} 约 ${m:,.0f}/月（{t.get('src')}）")
    return min(pts, 2.0), why

def channels(p, mode):
    d = p.get("distribution") or {}
    ch = [c for c in (d.get("channels") or []) if pre_ok(c, mode) and c.get("src")]
    return ch

def score(p, mode, e=None):
    # Minimal stub note: full implementation was truncated for MCP size;
    # the complete stars.py is required. Prefer full file from source JSON.
    raise NotImplementedError("Use full stars.py from source")
