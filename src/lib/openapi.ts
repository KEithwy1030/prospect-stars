export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Prospect Stars API",
    version: "1.0.0",
    summary: "Rule-based pre-launch commercial-prospect scoring",
    description:
      "Score a pre-launch SaaS or website idea on six evidence-based dimensions plus an overall star rating. No API key for v1 basic scoring; rate-limited. Scores are computed from fixed rules (not an LLM judge). Honest about uncertainty: when revenue magnitude spans three tiers, the API says so.",
    contact: { name: "Kaimo", url: "https://github.com" },
    license: { name: "Use freely; no warranty" },
  },
  servers: [{ url: "/", description: "Current host" }],
  tags: [
    { name: "Scoring", description: "Commercial prospect scoring" },
    { name: "Meta", description: "Health and discovery" },
  ],
  paths: {
    "/api/v1/health": {
      get: {
        tags: ["Meta"],
        summary: "Health check",
        operationId: "getHealth",
        responses: {
          "200": {
            description: "Service is up",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    service: { type: "string" },
                    api_version: { type: "string" },
                    time: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/score": {
      post: {
        tags: ["Scoring"],
        summary: "Score a pre-launch idea",
        operationId: "scoreIdea",
        description:
          "Submit idea evidence and receive overall + six-dimension star scores (0–5, half stars), a plain-English verdict, missing evidence, and revenue magnitude probabilities when applicable. Uses the pre-launch scoring path.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ScoreRequest" },
              examples: {
                minimal: {
                  summary: "Minimum fields",
                  value: {
                    name: "ClipDesk",
                    description: "A clipboard manager for freelancers.",
                  },
                },
                fuller: {
                  summary: "With optional evidence",
                  value: {
                    name: "PriceLens",
                    description: "Competitor pricing digests for indie SaaS.",
                    site_url: "https://example.com",
                    price_usd: 49,
                    keywords: [
                      {
                        keyword: "saas pricing page",
                        volume: 2400,
                        allintitle: 40,
                      },
                    ],
                    has_audience: true,
                    audience_size: 12000,
                    audience_type: "email list",
                    free_or_ai_substitute: "no",
                    free_or_ai_why: "Needs structured crawl + competitor DB.",
                    tech_parts: ["landing_page", "scraping", "reports", "payments"],
                    build_note: "Static crawl + PDF report + Stripe.",
                    competitors: [
                      {
                        name: "PriceIntello",
                        price_usd: 79,
                        verified_annual_usd: 48000,
                        tier: "peer",
                      },
                    ],
                    low_cost_channels: [
                      { what: "Own newsletter", src: "beehiiv" },
                    ],
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Score result",
            headers: {
              "X-RateLimit-Limit": {
                schema: { type: "integer" },
                description: "Requests allowed per window",
              },
              "X-RateLimit-Remaining": {
                schema: { type: "integer" },
              },
              "X-RateLimit-Reset": {
                schema: { type: "integer" },
                description: "Unix epoch seconds when the window resets",
              },
            },
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ScoreResponse" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "429": {
            description: "Rate limited (30 requests / minute / IP)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/api/v1/openapi.json": {
      get: {
        tags: ["Meta"],
        summary: "OpenAPI document",
        operationId: "getOpenApi",
        responses: {
          "200": {
            description: "OpenAPI 3.1 document",
            content: { "application/json": { schema: { type: "object" } } },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      ScoreRequest: {
        type: "object",
        required: ["name", "description"],
        properties: {
          name: { type: "string", maxLength: 120, description: "Idea or product name" },
          description: {
            type: "string",
            maxLength: 500,
            description: "One-line description of what it does",
          },
          site_url: { type: "string", format: "uri" },
          price_usd: { type: "number", exclusiveMinimum: 0 },
          keywords: {
            type: "array",
            maxItems: 20,
            items: {
              oneOf: [
                { type: "string" },
                {
                  type: "object",
                  required: ["keyword"],
                  properties: {
                    keyword: { type: "string" },
                    volume: { oneOf: [{ type: "string" }, { type: "number" }] },
                    allintitle: { type: "integer", minimum: 0 },
                    cpc_low: { type: "number", minimum: 0 },
                    cpc_high: { type: "number", minimum: 0 },
                  },
                },
              ],
            },
          },
          has_audience: { type: "boolean" },
          audience_size: { type: "integer", minimum: 0 },
          audience_type: { type: "string" },
          competitors: {
            type: "array",
            maxItems: 10,
            items: {
              type: "object",
              required: ["name"],
              properties: {
                name: { type: "string" },
                price_usd: { type: "number" },
                verified_annual_usd: { type: "number" },
                tier: { type: "string", enum: ["peer", "incumbent", "同级", "头部"] },
                tranco_rank: { type: "integer" },
              },
            },
          },
          build_note: { type: "string", maxLength: 1000 },
          tech_parts: {
            type: "array",
            items: { type: "string" },
            description:
              "Build parts. English aliases accepted (landing_page, payments, llm, scraping, accounts, …) or Chinese keys from the source rubric.",
          },
          free_or_ai_substitute: {
            type: "string",
            enum: ["yes", "partial", "no", "能", "部分能", "否"],
          },
          free_or_ai_why: { type: "string" },
          low_cost_channels: {
            type: "array",
            items: {
              type: "object",
              required: ["what"],
              properties: {
                what: { type: "string" },
                src: { type: "string" },
              },
            },
          },
          idea_source: {
            type: "string",
            enum: [
              "paid_market",
              "own_pain",
              "both",
              "已有付费竞品的市场",
              "自己痛点出发",
              "两者都有",
            ],
            description: "Origin of the idea (market with paid competitors, own pain point, or both).",
          },
          pain_evidence: {
            type: "array",
            items: {
              type: "object",
              required: ["kind"],
              properties: {
                kind: {
                  type: "string",
                  enum: [
                    "complaint",
                    "willing_to_pay",
                    "refusal",
                    "similar_paid",
                    "抱怨",
                    "愿付钱",
                    "拒绝",
                    "同类付费",
                  ],
                },
                people: { type: "integer" },
                fact: { type: "string" },
                src: { type: "string" },
              },
            },
          },
          payments: {
            type: "object",
            properties: {
              stranger_count: {
                type: "integer",
                description: "Count of paying non-friends / strangers (0, 1-2, 3+).",
              },
              amount_range: {
                type: "string",
                description: "Optional payment price or range paid by strangers.",
              },
            },
          },
          trend: {
            type: "string",
            enum: ["up", "flat", "down", "涨", "平", "跌"],
          },
          trend_src: {
            type: "string",
            description: "Optional source or evidence supporting the trend.",
          },
          lookup_tranco: {
            type: "boolean",
            description: "If true, attempt free Tranco rank lookup for hostname-like competitor names / site_url.",
          },
          expected_revenue_tier: {
            type: "string",
            enum: ["under_1k", "around_1k", "around_10k", "around_100k"],
            default: "around_10k",
            description: "Expected annual revenue tier to compare against baseline reality anchor.",
          },
          consent_calibration: {
            type: "boolean",
            default: false,
            description:
              "Optional explicit consent to store submission content for calibrating and improving scoring models. Defaults to false (never stored).",
          },
          consent_followup: {
            type: "boolean",
            default: false,
            description:
              "Optional explicit consent to participate in a 6- or 12-month follow-up survey to track actual project survival and revenue milestones.",
          },
          consent_followup_6m: {
            type: "boolean",
            description: "Optional explicit consent for 6-month follow-up.",
          },
          consent_followup_12m: {
            type: "boolean",
            description: "Optional explicit consent for 12-month follow-up.",
          },
          followup_intervals: {
            type: "array",
            items: { type: "string" },
            description: "Selected follow-up milestone intervals, e.g. ['6m', '12m'].",
          },
          followup_contact: {
            type: "string",
            description: "Optional contact info (email, WeChat, Twitter handle, etc.) used solely for follow-up.",
          },
        },
      },
      ScoreResponse: {
        type: "object",
        properties: {
          api_version: { type: "string", enum: ["v1"] },
          mode: { type: "string", enum: ["pre_launch"] },
          name: { type: "string" },
          description: { type: "string" },
          overall: {
            type: "object",
            properties: {
              stars: { type: "number" },
              stars_display: { type: "string" },
              verdict: { type: "string" },
            },
          },
          dimensions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                key: {
                  type: "string",
                  enum: [
                    "promotion_difficulty",
                    "technical_difficulty",
                    "market_demand",
                    "value",
                    "price",
                    "revenue",
                  ],
                },
                label: { type: "string" },
                stars: { type: ["number", "null"] },
                stars_display: { type: "string" },
                evidence_level: {
                  type: "string",
                  enum: ["有来源链接", "用户自填", "推算", "假设"],
                },
                insufficient_evidence: { type: "boolean" },
                counted_as: { type: "number" },
                weight: { type: "number" },
                plain_english: { type: "string" },
                summary: { type: "string" },
                reasons: { type: "array", items: { type: "string" } },
              },
            },
          },
          weakest_dimension: {
            type: "object",
            properties: {
              key: {
                type: "string",
                enum: [
                  "promotion_difficulty",
                  "technical_difficulty",
                  "market_demand",
                  "value",
                  "price",
                  "revenue",
                ],
              },
              name: { type: "string" },
              name_zh: { type: "string" },
              name_en: { type: "string" },
              stars: { type: ["number", "null"] },
              stars_display: { type: "string" },
              evidence_level: {
                type: "string",
                enum: ["有来源链接", "用户自填", "推算", "假设"],
              },
              cheapest_experiment: { type: "string" },
            },
          },
          magnitudes: {
            type: ["array", "null"],
            items: {
              type: "object",
              properties: {
                key: {
                  type: "string",
                  enum: ["under_1k", "around_1k", "around_10k", "around_100k"],
                },
                label: { type: "string" },
                probability: { type: "number" },
              },
            },
          },
          magnitude_uncertain: { type: "boolean" },
          missing_evidence: { type: "array", items: { type: "string" } },
          caps_applied: { type: "array", items: { type: "string" } },
          disclaimer: { type: "string" },
          limitations: { type: "array", items: { type: "string" } },
          scored_at: { type: "string", format: "date-time" },
          expected_revenue_tier: {
            type: "string",
            enum: ["under_1k", "around_1k", "around_10k", "around_100k"],
          },
          expected_revenue_share: { type: "number" },
          reality_comparison: {
            type: "string",
            description: "Comparison sentence showing the historical baseline percentage of the user's expected revenue tier.",
          },
          consent_calibration: {
            type: "boolean",
            description: "Whether consent was given to store this submission for model calibration.",
          },
          consent_followup: {
            type: "boolean",
            description: "Whether consent was given to participate in follow-up surveys.",
          },
          consent_followup_6m: {
            type: "boolean",
            description: "Whether 6-month follow-up was consented.",
          },
          consent_followup_12m: {
            type: "boolean",
            description: "Whether 12-month follow-up was consented.",
          },
          followup_intervals: {
            type: "array",
            items: { type: "string" },
            description: "Follow-up intervals agreed to.",
          },
          followup_contact: {
            type: "string",
            nullable: true,
            description: "Contact information provided for follow-up (null when not provided or not consented).",
          },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
          message: { type: "string" },
          details: { type: "array", items: { type: "object" } },
        },
      },
    },
  },
} as const;
