#!/usr/bin/env python3
"""Generate golden score fixtures from stars.py for TypeScript parity tests."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import stars as ST

# Patch load_base to use our copied YAML
_HERE = os.path.join(os.path.dirname(__file__), "..", "src", "data")
_orig = ST.load_base
def load_base():
    import yaml
    b = yaml.safe_load(open(os.path.join(_HERE, "base-rate.yaml"), encoding="utf-8"))
    return b["levels"], b["shrink_k"], b["src"]
ST.load_base = load_base

FIXTURES = {
  "empty_minimal": {
    "name": "Blank Idea",
    "concept": "A vague idea with almost no evidence.",
  },
  "prelaunch_thin": {
    "name": "Thin SaaS",
    "concept": "Keyword research helper for indie founders.",
    "price": {"tiers": [29], "src": "planned"},
    "keywords": [
      {"keyword": "keyword research tool", "volume": "1200", "allintitle": 80},
    ],
    "free_or_ai_substitute": {"answer": "部分能", "why": "ChatGPT can draft keyword lists but not track ranks.", "src": "manual"},
    "paid_comps": [
      {"name": "Ahrefs Lite", "price_low_usd": 99, "tier": "头部", "tranco": {"rank": 12000, "date": "2026-11-01", "src": "tranco"}},
    ],
    "tech": {"parts": ["落地页", "用户账户/订阅", "调用大模型"], "why": "Next.js app + LLM for suggestions", "src": "plan"},
    "distribution": {
      "channels": [],
      "assets": [],
    },
  },
  "prelaunch_strong": {
    "name": "Audience Tool",
    "concept": "Pricing page analyzer for SaaS founders with an existing newsletter.",
    "price": {"tiers": [49, 99], "src": "planned"},
    "keywords": [
      {"keyword": "saas pricing page", "volume": "2400", "allintitle": 40, "cpc_low": 1.2, "cpc_high": 3.5},
      {"keyword": "pricing page analyzer", "volume": "880", "allintitle": 12, "cpc_low": 0.8, "cpc_high": 2.0},
    ],
    "free_or_ai_substitute": {"answer": "否", "why": "Needs structured crawl + competitor price DB.", "src": "manual"},
    "pain_evidence": [
      {"kind": "愿付钱", "people": 4, "fact": "Founders said they would pay for competitor price digests", "src": "reddit threads"},
      {"kind": "抱怨", "people": 8, "fact": "People complain about manually checking pricing pages", "src": "indie hackers"},
    ],
    "paid_comps": [
      {"name": "PriceIntello", "price_low_usd": 79, "tier": "同级", "verified_annual_usd": 48000, "verified_note": "founder tweet", "tranco": {"rank": 420000, "date": "2026-11-01", "src": "tranco"}},
      {"name": "CompWatch", "price_low_usd": 39, "tier": "同级", "verified_annual_usd": 12000, "tranco": {"rank": 900000, "date": "2026-11-01", "src": "tranco"}},
    ],
    "tech": {"parts": ["落地页", "抓取公开网页", "生成报告", "支付接入"], "why": "Static crawl + report PDF + Stripe", "src": "plan"},
    "distribution": {
      "channels": [
        {"what": "Own newsletter to SaaS founders", "src": "beehiiv"},
        {"what": "SEO for pricing-page keywords", "src": "keyword planner"},
      ],
      "assets": [
        {"what": "Email list", "size": 12000, "at_launch": "是", "src": "beehiiv export"},
      ],
      "proven_channels": [
        {"what": "Newsletter launch sold prior product", "src": "stripe"},
      ],
    },
    "trend": {"direction": "涨", "src": "google trends"},
  },
  "insufficient_everywhere": {
    "name": "No Evidence",
    "concept": "Something something AI.",
    "free_or_ai_substitute": {"answer": "UNKNOWN"},
  },
}

out = {}
for key, p in FIXTURES.items():
    sc = ST.score(p, "pre")
    dims = {}
    for k, d in sc["dims"].items():
        dims[k] = {
            "star": d["star"],
            "insuff": d["insuff"],
            "brief": ST.short_reason(d),
            "dist": d.get("dist"),
        }
    out[key] = {
        "product": p,
        "total": sc["total"],
        "caps": sc["caps"],
        "verdict": ST.verdict(sc),
        "dims": dims,
    }

path = os.path.join(os.path.dirname(__file__), "..", "tests", "goldens.json")
with open(path, "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print("Wrote", path)
for k, v in out.items():
    print(k, "total=", v["total"], "verdict=", v["verdict"][:60])
    for dk, dd in v["dims"].items():
        print(f"  {dk}: {dd['star']} insuff={dd['insuff']}")
