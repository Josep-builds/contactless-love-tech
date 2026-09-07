export type CaseStatus = "open" | "in_progress" | "escalated" | "closed";

export type OperatorRow = {
  id: string;
  display_name: string;
  email: string;
  created_at: string;
};

export type CaseRow = {
  id: string;
  patient_label: string;
  severity: number;
  detected_at: string;
  last_contacted_at: string | null;
  status: CaseStatus;
  assigned_operator: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  created_at: string;
};

export type CaseNoteRow = {
  id: string;
  case_id: string;
  operator_id: string;
  note: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      operators: {
        Row: OperatorRow;
        Insert: Partial<OperatorRow> & { id: string; email: string };
        Update: Partial<OperatorRow>;
        Relationships: [];
      };
      cases: {
        Row: CaseRow;
        Insert: Partial<CaseRow> & {
          patient_label: string;
          severity: number;
          detected_at: string;
        };
        Update: Partial<CaseRow>;
        Relationships: [
          {
            foreignKeyName: "cases_assigned_operator_fkey";
            columns: ["assigned_operator"];
            isOneToOne: false;
            referencedRelation: "operators";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cases_confirmed_by_fkey";
            columns: ["confirmed_by"];
            isOneToOne: false;
            referencedRelation: "operators";
            referencedColumns: ["id"];
          },
        ];
      };
      case_notes: {
        Row: CaseNoteRow;
        Insert: Partial<CaseNoteRow> & {
          case_id: string;
          operator_id: string;
          note: string;
        };
        Update: Partial<CaseNoteRow>;
        Relationships: [
          {
            foreignKeyName: "case_notes_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "case_notes_operator_id_fkey";
            columns: ["operator_id"];
            isOneToOne: false;
            referencedRelation: "operators";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
