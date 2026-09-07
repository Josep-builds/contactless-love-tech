// score = (severity_weight * severity) + (time_weight * hours_since_detected_at)
//
// Weights are tuned so that a handful of hours of neglect outweighs a
// couple of severity points — a case doesn't get to sit quietly just
// because it started out low-severity. See __tests__/score.test.ts for
// the worked example from the packet: a severity-1 case open 5 days
// outranks a severity-5 case opened 10 minutes ago.
export const SEVERITY_WEIGHT = 10;
export const TIME_WEIGHT = 1; // points per hour of elapsed time

export interface ScorableCase {
  severity: number;
  detected_at: string | Date;
}

export function hoursSince(
  detectedAt: string | Date,
  now: Date = new Date(),
): number {
  const detected =
    typeof detectedAt === "string" ? new Date(detectedAt) : detectedAt;
  const diffMs = now.getTime() - detected.getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60));
}

export function priorityScore(
  input: ScorableCase,
  now: Date = new Date(),
): number {
  return (
    SEVERITY_WEIGHT * input.severity + TIME_WEIGHT * hoursSince(input.detected_at, now)
  );
}

export function sortByPriority<T extends ScorableCase>(
  cases: T[],
  now: Date = new Date(),
): T[] {
  return [...cases].sort(
    (a, b) => priorityScore(b, now) - priorityScore(a, now),
  );
}
