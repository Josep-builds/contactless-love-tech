"use client";

import { useRef, useState, useTransition } from "react";
import { addFollowUpNote } from "@/app/dashboard/cases/[id]/actions";

export function FollowUpNoteForm({ caseId }: { caseId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      ref={formRef}
      action={(formData) =>
        startTransition(async () => {
          const result = await addFollowUpNote(formData);
          if (result.error) {
            setError(result.error);
          } else {
            setError(null);
            formRef.current?.reset();
          }
        })
      }
      className="mt-4 space-y-2"
    >
      <input type="hidden" name="case_id" value={caseId} />
      <textarea
        name="note"
        required
        maxLength={2000}
        rows={3}
        placeholder="Log this follow-up (e.g. call attempted, patient reached, next step)…"
        className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-slate-800 disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Add follow-up note"}
      </button>
    </form>
  );
}
