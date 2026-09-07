// Operators shouldn't have to interpret a raw score, so the queue only
// ever shows a color-coded urgency tier derived from it.
export type UrgencyTier = "critical" | "high" | "medium" | "low";

export function urgencyTier(score: number): UrgencyTier {
  if (score >= 100) return "critical";
  if (score >= 50) return "high";
  if (score >= 20) return "medium";
  return "low";
}

export const TIER_LABEL: Record<UrgencyTier, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const TIER_CLASSES: Record<UrgencyTier, string> = {
  critical: "bg-red-950/50 text-red-400 border-red-800/60",
  high: "bg-amber-950/50 text-amber-400 border-amber-800/60",
  medium: "bg-yellow-950/40 text-yellow-300 border-yellow-800/50",
  low: "bg-slate-800/50 text-slate-400 border-slate-700",
};
