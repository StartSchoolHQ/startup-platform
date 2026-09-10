/**
 * Normalisers for the loosely-typed task content columns. The RPCs return
 * `learning_objectives` / `deliverables` either as arrays or as one
 * comma-joined string, and `resources` either as an array or a JSON string.
 */

export interface TaskResource {
  title: string;
  type?: string;
  url: string;
  description?: string;
}

export function parseStringList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string" && !!v);
  }
  if (typeof value === "string") {
    return value
      .split(", ")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function parseResources(value: unknown): TaskResource[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as TaskResource[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as TaskResource[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}
