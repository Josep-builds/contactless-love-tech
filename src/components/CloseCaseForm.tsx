"use client";

import { useState, useTransition } from "react";
import { closeCase } from "@/app/dashboard/cases/[id]/actions";

export function CloseCaseForm({
  caseId,
  operatorName,
}: {
  caseId: string;
  operatorName: string;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <p className="text-sm font-semibold text-slate-200">Close case</p>
      <p className="mt-1 text-xs text-slate-500">
        This case cannot be closed automatically. Confirming below records
        that you, personally, verified the patient reached treatment.
      </p>

      <label className="mt-3 flex items-start gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-1"
        />
        <span>Confirm patient reached treatment</span>
      </label>

      <p className="mt-2 text-xs text-slate-500">
        Confirming operator: <span className="text-slate-300">{operatorName}</span>
      </p>

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      <button
        type="button"
        disabled={!confirmed || isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await closeCase(caseId, confirmed);
            if (result.error) setError(result.error);
          })
        }
        className="mt-3 rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPending ? "Closing…" : "Close case"}
      </button>
    </div>
  );
}
