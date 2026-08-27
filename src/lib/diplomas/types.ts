// Diploma module types. The DiplomaSnapshot is the frozen jsonb stored in
// diplomas.snapshot — PDFs render ONLY from it, never from live data.

export interface StartupModuleRow {
  category: string;
  displayName: string;
  description: string;
  hours: number;
  percent: number;
}

export interface TechModuleRow {
  track: string;
  display_name: string;
  weeks: number | null;
  description: string | null;
  percent: number | null;
}

export interface DiplomaSnapshot {
  diploma_number: string;
  diploma_type: "full" | "tech_only";
  issued_date: string; // YYYY-MM-DD
  student: { name: string; personal_code: string };
  batch: {
    name: string;
    admission_date: string;
    completion_date: string;
  };
  startup_name: string | null;
  startup_modules: StartupModuleRow[];
  tech_modules: TechModuleRow[];
}

export interface QwasarProgressRow {
  qwasar_login: string;
  track: string;
  percent: number;
  cohort: string;
  qwasar_status: string;
}

/** Raw return shape of the get_diploma_data RPC (pre-snapshot). */
export interface RpcDiplomaData {
  student: {
    name: string;
    personal_code: string | null;
    qwasar_username: string | null;
  };
  startup_name: string | null;
  startup_modules: { category: string; hours: number; percent: number }[];
  tech_modules: TechModuleRow[];
}

/** diploma_batches row as consumed by buildSnapshot. */
export interface BatchRow {
  id: string;
  name: string;
  admission_date: string | null;
  completion_date: string | null;
  number_prefix: string;
  next_seq: number;
  /** Set when the cohort was archived via close_batch_v1; null = open. */
  closed_at?: string | null;
}

export interface DiplomaReadiness {
  qwasar_username: boolean;
  personal_code: boolean;
  batch_dates: boolean;
  has_qwasar_rows: boolean;
}
