import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { priorityScore, hoursSince } from "@/lib/priority/score";
import { urgencyTier, TIER_LABEL, TIER_CLASSES } from "@/lib/priority/tier";
import { elapsedLabel, STATUS_LABEL } from "@/lib/format";
import { SimulatedBadge } from "@/components/SimulatedBadge";
import { ClaimCaseButton } from "@/components/ClaimCaseButton";
import { FollowUpNoteForm } from "@/components/FollowUpNoteForm";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: caseRow } = await supabase
    .from("cases")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!caseRow) notFound();

  const { data: notes } = await supabase
    .from("case_notes")
    .select("id, note, created_at, operators(display_name)")
    .eq("case_id", id)
    .order("created_at", { ascending: true });

  const now = new Date();
  const score = priorityScore(caseRow, now);
  const tier = urgencyTier(score);
  const isMine = caseRow.assigned_operator === user!.id;
  const isUnassigned = caseRow.assigned_operator === null;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">{caseRow.patient_label}</h1>
        <SimulatedBadge />
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TIER_CLASSES[tier]}`}
        >
          {TIER_LABEL[tier]}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-400">
        Severity {caseRow.severity} · {STATUS_LABEL[caseRow.status]} ·
        detected {elapsedLabel(hoursSince(caseRow.detected_at, now))}
      </p>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-slate-300">Timeline</h2>
        <ol className="mt-2 space-y-3 border-l border-slate-800 pl-4">
          <li className="text-sm text-slate-400">
            <span className="font-medium text-slate-200">Detected</span> —{" "}
            {new Date(caseRow.detected_at).toLocaleString()}
          </li>
          {notes?.map((n) => (
            <li key={n.id} className="text-sm text-slate-400">
              <span className="font-medium text-slate-200">
                {n.operators?.display_name ?? "Operator"}
              </span>{" "}
              — {new Date(n.created_at).toLocaleString()}
              <p className="mt-1 text-slate-300">{n.note}</p>
            </li>
          ))}
          {caseRow.status === "closed" ? (
            <li className="text-sm text-slate-400">
              <span className="font-medium text-slate-200">
                Closed — confirmed by human
              </span>{" "}
              — {new Date(caseRow.confirmed_at!).toLocaleString()}
            </li>
          ) : (
            <li className="text-sm text-slate-500 italic">
              [blocked: awaiting human confirmation before this case can
              close]
            </li>
          )}
        </ol>
      </section>

      <section className="mt-6">
        {isUnassigned && <ClaimCaseButton caseId={caseRow.id} />}
        {isMine && caseRow.status !== "closed" && (
          <FollowUpNoteForm caseId={caseRow.id} />
        )}
      </section>
    </div>
  );
}
