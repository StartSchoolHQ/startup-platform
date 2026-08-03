// Builds the frozen DiplomaSnapshot from RPC output + batch data.
// Throws "missing_*" errors when issue prerequisites are absent;
// checkReadiness() reports the same conditions without throwing.

import { STARTUP_CATEGORIES } from "./constants";

/**
 * Tracks below this percentage don't appear on the diploma at all.
 * 30 exactly IS included.
 */
export const TECH_MODULE_MIN_PERCENT = 30;
import type {
  BatchRow,
  DiplomaReadiness,
  DiplomaSnapshot,
  RpcDiplomaData,
} from "./types";

export function checkReadiness(
  rpc: RpcDiplomaData,
  batch: BatchRow
): DiplomaReadiness {
  return {
    qwasar_username: !!rpc.student.qwasar_username,
    personal_code: !!rpc.student.personal_code,
    batch_dates: !!batch.admission_date && !!batch.completion_date,
    has_qwasar_rows: rpc.tech_modules.length > 0,
  };
}

export function buildSnapshot(input: {
  rpc: RpcDiplomaData;
  batch: BatchRow;
  diplomaNumber: string;
  diplomaType: "full" | "tech_only";
  issuedDate: string;
}): DiplomaSnapshot {
  const { rpc, batch, diplomaNumber, diplomaType, issuedDate } = input;

  if (!rpc.student.personal_code) throw new Error("missing_personal_code");
  if (!batch.admission_date || !batch.completion_date) {
    throw new Error("missing_batch_dates");
  }
  if (!rpc.student.qwasar_username) throw new Error("missing_qwasar_username");

  const byCategory = new Map(rpc.startup_modules.map((m) => [m.category, m]));
  const startupModules =
    diplomaType === "tech_only"
      ? []
      : STARTUP_CATEGORIES.flatMap((c) => {
          const m = byCategory.get(c.key);
          if (!m) return [];
          return [
            {
              category: c.key,
              displayName: c.displayName,
              description: c.description,
              hours: Number(m.hours),
              percent: Number(m.percent),
            },
          ];
        });

  return {
    diploma_number: diplomaNumber,
    diploma_type: diplomaType,
    issued_date: issuedDate,
    student: {
      name: rpc.student.name,
      personal_code: rpc.student.personal_code,
    },
    batch: {
      name: batch.name,
      admission_date: batch.admission_date,
      completion_date: batch.completion_date,
    },
    startup_name: diplomaType === "tech_only" ? null : rpc.startup_name,
    startup_modules: startupModules,
    tech_modules: rpc.tech_modules.filter(
      (t) => (t.percent ?? 0) >= TECH_MODULE_MIN_PERCENT
    ),
  };
}
