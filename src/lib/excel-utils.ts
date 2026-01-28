import { csvParse } from "d3-dsv";

export interface TaskExcelRow {
  template_code?: string;
  title: string;
  description?: string;
  detailed_instructions?: string;
  detailed_description?: string;
  category?:
    | "onboarding"
    | "development"
    | "design"
    | "marketing"
    | "business"
    | "testing"
    | "deployment"
    | "milestone"
    | "customer-acquisition"
    | "customer-acqusition";
  priority?: "low" | "medium" | "high" | "urgent" | "Top" | "Medium";
  difficulty_level?: number;
  estimated_hours?: number;
  base_xp_reward?: number;
  base_points_reward?: number;
  requires_review?: boolean;
  learning_objectives?: string;
  deliverables?: string;
  review_instructions?: string;
  peer_review_instructions?: string;
  tags?: string;
  is_recurring?: boolean | string;
  cooldown_days?: number | string;
  is_confidential?: boolean | string;
}

const excelToBool = (value: string | boolean): boolean => {
  if (typeof value === "boolean") return value;
  return (
    value?.toString().toLowerCase() === "yes" ||
    value?.toString().toLowerCase() === "true"
  );
};

export function parseTasksFromExcel(file: File): Promise<TaskExcelRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const jsonData = csvParse(text);
        const tasks: TaskExcelRow[] = (
          jsonData as Record<string, unknown>[]
        ).map((row, index) => {
          if (!row.title)
            throw new Error(`Row ${index + 2}: title is required`);
          if (row.template_code) {
            const duplicateIndex = (
              jsonData as Record<string, unknown>[]
            ).findIndex(
              (other, i) =>
                i !== index && other.template_code === row.template_code
            );
            if (duplicateIndex !== -1)
              throw new Error(
                `Duplicate template_code "${row.template_code}" found in rows ${
                  index + 2
                } and ${duplicateIndex + 2}`
              );
          }
          return {
            template_code: row.template_code
              ? String(row.template_code).trim()
              : undefined,
            title: String(row.title).trim(),
            description:
              row.description || row.Description
                ? String(row.description || row.Description).trim()
                : undefined,
            detailed_instructions:
              row.detailed_instructions || row.detailed_description
                ? String(
                    row.detailed_instructions || row.detailed_description
                  ).trim()
                : undefined,
            category:
              (row.category as TaskExcelRow["category"]) || "development",
            priority: (row.priority as TaskExcelRow["priority"]) || "medium",
            difficulty_level: row.difficulty_level
              ? Math.min(5, Math.max(1, parseInt(String(row.difficulty_level))))
              : 1,
            estimated_hours: row.estimated_hours
              ? parseFloat(String(row.estimated_hours))
              : 0,
            base_xp_reward: row.base_xp_reward
              ? parseInt(String(row.base_xp_reward))
              : 0,
            base_points_reward: row.base_points_reward
              ? parseInt(String(row.base_points_reward))
              : 0,
            requires_review: excelToBool(
              row.requires_review as string | boolean
            ),
            learning_objectives: row.learning_objectives
              ? String(row.learning_objectives).trim()
              : undefined,
            deliverables: row.deliverables
              ? String(row.deliverables).trim()
              : undefined,
            review_instructions: row.review_instructions
              ? String(row.review_instructions).trim()
              : undefined,
            peer_review_instructions: row.peer_review_instructions
              ? String(row.peer_review_instructions).trim()
              : undefined,
            tags: row.tags ? String(row.tags).trim() : undefined,
            is_recurring:
              row.is_recurring !== undefined &&
              row.is_recurring !== null &&
              row.is_recurring !== ""
                ? excelToBool(row.is_recurring as string | boolean)
                : undefined,
            cooldown_days:
              row.cooldown_days !== undefined &&
              row.cooldown_days !== null &&
              row.cooldown_days !== ""
                ? parseInt(String(row.cooldown_days))
                : undefined,
            is_confidential:
              row.is_confidential !== undefined &&
              row.is_confidential !== null &&
              row.is_confidential !== ""
                ? excelToBool(row.is_confidential as string | boolean)
                : undefined,
          };
        });
        resolve(tasks);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file, "utf-8");
  });
}
