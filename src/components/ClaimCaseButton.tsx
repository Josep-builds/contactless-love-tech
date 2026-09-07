"use client";

import { useState, useTransition } from "react";
import { claimCase } from "@/app/dashboard/cases/[id]/actions";

export function ClaimCaseButton({ caseId }: { caseId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await claimCase(caseId);
            if (result.error) setError(result.error);
          })
        }
        className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-200 disabled:opacity-60"
      >
        {isPending ? "Claiming…" : "Claim case"}
      </button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
