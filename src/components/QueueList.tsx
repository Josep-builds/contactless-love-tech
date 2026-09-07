import Link from "next/link";
import type { CaseRow } from "@/lib/supabase/types";
import { hoursSince, priorityScore } from "@/lib/priority/score";
import { urgencyTier, TIER_LABEL, TIER_CLASSES } from "@/lib/priority/tier";
import { elapsedLabel, STATUS_LABEL } from "@/lib/format";
import { SimulatedBadge } from "@/components/SimulatedBadge";

export function QueueList({
  cases,
  currentOperatorId,
}: {
  cases: CaseRow[];
  currentOperatorId: string;
}) {
  const now = new Date();
  const ranked = [...cases].sort(
    (a, b) => priorityScore(b, now) - priorityScore(a, now),
  );

  if (ranked.length === 0) {
    return (
      <p className="mt-6 text-sm text-slate-400">
        No cases yet. Simulated detection events will appear here, ranked by
        priority.
      </p>
    );
  }

  return (
    <ul className="mt-6 divide-y divide-slate-800 rounded-lg border border-slate-800">
      {ranked.map((c) => {
        const hours = hoursSince(c.detected_at, now);
        const tier = urgencyTier(priorityScore(c, now));
        const isMine = c.assigned_operator === currentOperatorId;

        return (
          <li key={c.id}>
            <Link
              href={`/dashboard/cases/${c.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-slate-900"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TIER_CLASSES[tier]}`}
                >
                  {TIER_LABEL[tier]}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-100">
                      {c.patient_label}
                    </span>
                    <SimulatedBadge />
                  </div>
                  <p className="text-xs text-slate-500">
                    Severity {c.severity} · detected {elapsedLabel(hours)} ·{" "}
                    {isMine ? "assigned to you" : "unassigned"}
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-400">
                {STATUS_LABEL[c.status]}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
