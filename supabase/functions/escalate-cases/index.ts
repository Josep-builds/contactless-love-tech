// Supabase Edge Function: auto-escalation.
//
// Finds open/in_progress cases that have gone stale — no contact
// within ESCALATION_WINDOW_HOURS of whichever is more recent,
// detection or last follow-up — and flips them to 'escalated' with no
// assigned operator, so they resurface at the top of everyone's
// unassigned queue instead of aging silently.
//
// Uses the service-role key, which bypasses RLS by design (it has to
// reach cases assigned to any operator) but is still bound by the
// Shadow Clause: this function only ever sets status to 'escalated',
// never 'closed', so the DB trigger's "no automated close" rule is
// never in play here — and would reject it outright if it tried.
//
// Deploy: `supabase functions deploy escalate-cases`
// Schedule: Supabase Dashboard → Edge Functions → escalate-cases →
// Cron, e.g. every 30 minutes. Or invoke manually for testing:
//   curl -i --request POST '<project-url>/functions/v1/escalate-cases' \
//     --header 'Authorization: Bearer <service-role-key>'

import { createClient } from "jsr:@supabase/supabase-js@2";

const DEFAULT_WINDOW_HOURS = 48;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const windowHours = Number(
    Deno.env.get("ESCALATION_WINDOW_HOURS") ?? DEFAULT_WINDOW_HOURS,
  );

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const cutoff = new Date(
    Date.now() - windowHours * 60 * 60 * 1000,
  ).toISOString();

  // Stale = no contact since detection, and detected more than the
  // window ago; or contacted, but not since before the window.
  const { data: stale, error: selectError } = await supabase
    .from("cases")
    .select("id")
    .in("status", ["open", "in_progress"])
    .or(
      `and(last_contacted_at.is.null,detected_at.lt.${cutoff}),last_contacted_at.lt.${cutoff}`,
    );

  if (selectError) {
    return new Response(JSON.stringify({ error: selectError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const staleIds = (stale ?? []).map((c) => c.id);

  if (staleIds.length === 0) {
    return new Response(JSON.stringify({ escalated: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { error: updateError } = await supabase
    .from("cases")
    .update({ status: "escalated", assigned_operator: null })
    .in("id", staleIds);

  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ escalated: staleIds.length, case_ids: staleIds }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
