"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SimulatedBadge } from "@/components/SimulatedBadge";

export default function SimulateDetectionPage() {
  const router = useRouter();
  const [patientLabel, setPatientLabel] = useState("");
  const [severity, setSeverity] = useState(3);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const res = await fetch("/api/detections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_label: patientLabel,
        severity,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to create case.");
      setPending(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="max-w-md">
      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-lg font-semibold">Simulate a detection event</h1>
        <SimulatedBadge />
      </div>
      <p className="mb-6 text-sm text-slate-400">
        This mimics an inbound webhook from a detection source (e.g. a
        pharmacy retinal scan). It is not a diagnostic tool — it only
        creates a new, unassigned case in the queue with the severity and
        timestamp you provide.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300">
            Patient label (initials or case tag — never a real name)
          </label>
          <input
            type="text"
            required
            maxLength={60}
            value={patientLabel}
            onChange={(e) => setPatientLabel(e.target.value)}
            placeholder="e.g. J.R."
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">
            Severity (1–5)
          </label>
          <input
            type="number"
            required
            min={1}
            max={5}
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          />
        </div>

        <p className="text-xs text-slate-500">
          Detection timestamp defaults to now.
        </p>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-200 disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create simulated case"}
        </button>
      </form>
    </div>
  );
}
