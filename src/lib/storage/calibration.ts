import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { ScoreRequest } from "../scoring/input";
import type { ScoreResult } from "../scoring/types";

export interface CalibrationEntry {
  id: string;
  timestamp: string;
  consent_calibration: true;
  submission: {
    name: string;
    description: string;
    site_url?: string;
    price_usd?: number;
    keywords?: unknown[];
    has_audience?: boolean;
    audience_size?: number;
    audience_type?: string;
    competitors?: unknown[];
    build_note?: string;
    tech_parts?: string[];
    free_or_ai_substitute?: string;
    free_or_ai_why?: string;
    low_cost_channels?: unknown[];
    pain_evidence?: unknown[];
    trend?: string;
    trend_src?: string;
    payments?: unknown;
    idea_source?: string;
    consent_followup?: boolean;
    consent_followup_6m?: boolean;
    consent_followup_12m?: boolean;
    followup_intervals?: string[];
    followup_contact?: string;
  };
  score_summary: {
    overall_stars: number;
    verdict?: string;
  };
}

/**
 * Minimal append-only JSONL storage for calibration submissions.
 * Only invoked when user has explicitly granted consent (consent_calibration === true).
 * Unchecked / non-consented submissions are never passed to this function.
 */
export async function saveCalibrationSubmission(
  req: ScoreRequest,
  sc: ScoreResult,
): Promise<string> {
  const id = `cal_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const entry: CalibrationEntry = {
    id,
    timestamp: new Date().toISOString(),
    consent_calibration: true,
    submission: {
      name: req.name,
      description: req.description,
      site_url: req.site_url,
      price_usd: req.price_usd,
      keywords: req.keywords,
      has_audience: req.has_audience,
      audience_size: req.audience_size,
      audience_type: req.audience_type,
      competitors: req.competitors,
      build_note: req.build_note,
      tech_parts: req.tech_parts,
      free_or_ai_substitute: req.free_or_ai_substitute,
      free_or_ai_why: req.free_or_ai_why,
      low_cost_channels: req.low_cost_channels,
      pain_evidence: req.pain_evidence,
      trend: req.trend,
      trend_src: req.trend_src,
      payments: req.payments,
      idea_source: req.idea_source,
      consent_followup: req.consent_followup,
      consent_followup_6m: req.consent_followup_6m,
      consent_followup_12m: req.consent_followup_12m,
      followup_intervals: req.followup_intervals,
      followup_contact: req.followup_contact,
    },
    score_summary: {
      overall_stars: sc.total,
    },
  };

  const line = JSON.stringify(entry) + "\n";

  // Primary location: data/calibration-submissions.jsonl
  // Fallback location: OS tmpdir
  const primaryFile = path.resolve(process.cwd(), "data", "calibration-submissions.jsonl");
  const fallbackFile = path.join(os.tmpdir(), "prospect-stars-calibration-submissions.jsonl");

  let writtenFile: string | null = null;
  try {
    const dir = path.dirname(primaryFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.appendFileSync(primaryFile, line, "utf8");
    writtenFile = primaryFile;
  } catch {
    try {
      fs.appendFileSync(fallbackFile, line, "utf8");
      writtenFile = fallbackFile;
    } catch (fallbackErr) {
      console.warn("Failed to write calibration submission to filesystem:", fallbackErr);
    }
  }

  // Structured logging for cloud log collectors / log drains
  console.info(
    JSON.stringify({
      event: "CALIBRATION_SUBMISSION_RECORDED",
      id,
      timestamp: entry.timestamp,
      file: writtenFile,
    }),
  );

  return id;
}
