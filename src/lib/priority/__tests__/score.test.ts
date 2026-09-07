import { describe, expect, it } from "vitest";
import { priorityScore, sortByPriority } from "@/lib/priority/score";

const NOW = new Date("2026-09-07T12:00:00.000Z");

describe("priorityScore", () => {
  it("ranks a low-severity, long-neglected case above a high-severity, just-detected one", () => {
    const oldLowSeverity = {
      severity: 1,
      detected_at: new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    };
    const freshHighSeverity = {
      severity: 5,
      detected_at: new Date(NOW.getTime() - 10 * 60 * 1000), // 10 minutes ago
    };

    expect(priorityScore(oldLowSeverity, NOW)).toBeGreaterThan(
      priorityScore(freshHighSeverity, NOW),
    );
  });

  it("computes severity_weight * severity + time_weight * hours_elapsed", () => {
    const case_ = {
      severity: 3,
      detected_at: new Date(NOW.getTime() - 10 * 60 * 60 * 1000), // 10 hours ago
    };

    // 10 * 3 + 1 * 10 = 40
    expect(priorityScore(case_, NOW)).toBeCloseTo(40, 5);
  });

  it("returns 0 elapsed hours (never negative) for a detection timestamp in the future", () => {
    const futureCase = {
      severity: 2,
      detected_at: new Date(NOW.getTime() + 60 * 60 * 1000),
    };

    expect(priorityScore(futureCase, NOW)).toBeCloseTo(20, 5);
  });

  it("sorts a mixed queue by score descending, not by creation order", () => {
    const midSeverityMedium = {
      id: "mid",
      severity: 3,
      detected_at: new Date(NOW.getTime() - 10 * 60 * 60 * 1000), // score 40
    };
    const oldLowSeverity = {
      id: "old-low",
      severity: 1,
      detected_at: new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000), // score 130
    };
    const freshHighSeverity = {
      id: "fresh-high",
      severity: 5,
      detected_at: new Date(NOW.getTime() - 10 * 60 * 1000), // score ~50.17
    };

    // Deliberately inserted out of score order to prove sort, not FIFO.
    const queue = [midSeverityMedium, oldLowSeverity, freshHighSeverity];

    const ranked = sortByPriority(queue, NOW).map((c) => c.id);

    expect(ranked).toEqual(["old-low", "fresh-high", "mid"]);
  });
});
