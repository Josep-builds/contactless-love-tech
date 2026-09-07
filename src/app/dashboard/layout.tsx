import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div>
          <p className="text-sm font-semibold">
            Contactless Love — Operator Console
          </p>
          <p className="text-xs text-slate-500">
            [SIMULATED] follow-up case management. Not a diagnostic tool.
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-400">{user?.email}</span>
          <form action={signOut}>
            <button className="rounded-md border border-slate-700 px-3 py-1.5 text-slate-200 transition hover:bg-slate-800">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
