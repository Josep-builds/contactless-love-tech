import Link from "next/link";

export default function DashboardPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Queue</h1>
        <Link
          href="/dashboard/simulate"
          className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-slate-800"
        >
          Simulate detection event
        </Link>
      </div>
      <p className="mt-2 text-sm text-slate-400">
        No cases yet. Simulated detection events will appear here, ranked by
        priority.
      </p>
    </div>
  );
}
