import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { detectionEventSchema } from "@/lib/validation/detection";

// Mimics an inbound detection webhook (e.g. a pharmacy retinal-scan
// event). Requires an authenticated operator session — there is no
// open route to case creation — and only ever produces a new,
// unassigned, open case (enforced again by the cases_insert_simulated_
// detection RLS policy at the DB layer).
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = detectionEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { patient_label, severity, detected_at } = parsed.data;

  const { data, error } = await supabase
    .from("cases")
    .insert({
      patient_label,
      severity,
      detected_at: detected_at ?? new Date().toISOString(),
      status: "open",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ case: data }, { status: 201 });
}
