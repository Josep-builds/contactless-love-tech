import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { QueueList } from "@/components/QueueList";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: cases } = await supabase
    .from("cases")
    .select("*")
    .neq("status", "closed");

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
      <p className="mt-1 text-sm text-slate-500">
        Ranked by priority score (severity + time since detection), not by
        creation order.
      </p>

      <QueueList cases={cases ?? []} currentOperatorId={user!.id} />
    </div>
  );
}
