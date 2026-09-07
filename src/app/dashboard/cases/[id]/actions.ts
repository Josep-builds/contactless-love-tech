"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { followUpNoteSchema } from "@/lib/validation/note";

export async function claimCase(caseId: string) {
  const parsedId = z.string().uuid().safeParse(caseId);
  if (!parsedId.success) {
    return { error: "Invalid case id." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("cases")
    .update({ assigned_operator: user.id })
    .eq("id", caseId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/cases/${caseId}`);
  revalidatePath("/dashboard");
  return { error: null };
}

export async function addFollowUpNote(formData: FormData) {
  const parsed = followUpNoteSchema.safeParse({
    case_id: formData.get("case_id"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error: noteError } = await supabase.from("case_notes").insert({
    case_id: parsed.data.case_id,
    operator_id: user.id,
    note: parsed.data.note,
  });
  if (noteError) return { error: noteError.message };

  const { error: caseError } = await supabase
    .from("cases")
    .update({ last_contacted_at: new Date().toISOString() })
    .eq("id", parsed.data.case_id);
  if (caseError) return { error: caseError.message };

  revalidatePath(`/dashboard/cases/${parsed.data.case_id}`);
  revalidatePath("/dashboard");
  return { error: null };
}
