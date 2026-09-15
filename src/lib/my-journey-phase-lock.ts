/**
 * My Journey phase gate — client-side copy only. The rule itself lives in
 * the database (`my_journey_phase_unlocked_v1` + the task_progress trigger);
 * this file just turns the V2 progress rows into card descriptions.
 */

export interface PhaseProgressRow {
  achievement_id: string;
  achievement_name: string;
  sort_order?: number | null;
  completed_tasks?: number | null;
  total_tasks?: number | null;
  is_unlocked?: boolean | null;
  always_unlocked?: boolean | null;
}

export interface PhaseLock {
  locked: boolean;
  /** Human sentence for a locked card; undefined when unlocked. */
  description?: string;
}

/** Approved tasks needed for >= 50% of `total` (matches the SQL rule). */
export function requiredForHalf(total: number): number {
  return Math.ceil(total / 2);
}

/**
 * Locked cards explain what opens them: the previous gated phase (skipping
 * always-open ones such as the reading list), how many tasks are done there
 * and how many are needed.
 */
export function phaseLocks(rows: PhaseProgressRow[]): Map<string, PhaseLock> {
  const ordered = [...rows].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
  const locks = new Map<string, PhaseLock>();

  ordered.forEach((row, index) => {
    if (row.is_unlocked !== false) {
      locks.set(row.achievement_id, { locked: false });
      return;
    }
    const prev = [...ordered.slice(0, index)]
      .reverse()
      .find((r) => !r.always_unlocked);
    if (!prev) {
      locks.set(row.achievement_id, { locked: true, description: "Locked" });
      return;
    }
    const total = prev.total_tasks ?? 0;
    const done = prev.completed_tasks ?? 0;
    const needed = requiredForHalf(total);
    locks.set(row.achievement_id, {
      locked: true,
      description: `Locked. Finish ${needed} of ${total} tasks in ${prev.achievement_name} to open this phase (${done} done).`,
    });
  });

  return locks;
}

/** True when a start-task error came from the phase gate trigger. */
export function isPhaseLockedError(error: unknown): boolean {
  return (
    error instanceof Error && error.message.includes("my_journey_phase_locked")
  );
}
