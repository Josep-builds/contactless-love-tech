import { z } from "zod";

// Mirrors the DB constraints in supabase/migrations/00001_init.sql so
// bad input is rejected before it ever reaches Postgres.
export const detectionEventSchema = z.object({
  patient_label: z
    .string()
    .trim()
    .min(1, "Patient label is required.")
    .max(60, "Patient label must be 60 characters or fewer."),
  severity: z
    .number()
    .int("Severity must be a whole number.")
    .min(1, "Severity must be between 1 and 5.")
    .max(5, "Severity must be between 1 and 5."),
  detected_at: z
    .string()
    .datetime({ message: "detected_at must be an ISO 8601 timestamp." })
    .optional(),
});

export type DetectionEventInput = z.infer<typeof detectionEventSchema>;
