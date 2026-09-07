import { z } from "zod";

export const followUpNoteSchema = z.object({
  case_id: z.string().uuid(),
  note: z
    .string()
    .trim()
    .min(1, "Note cannot be empty.")
    .max(2000, "Note must be 2000 characters or fewer."),
});
