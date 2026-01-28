import { createClient } from "@/lib/supabase/client";

// Template code generation utility
export interface TemplateCodeResult {
  code: string;
  error?: string;
}

/**
 * Generate next sequential template code by checking database
 */
export async function generateNextTemplateCode(
  category: string,
  taskContext: "individual" | "team"
): Promise<TemplateCodeResult> {
  try {
    const supabase = createClient();

    // Define prefix mapping
    const categoryMap = {
      onboarding: { individual: "ONB-FUND", team: "TEAM-ONB" },
      development: { individual: "DEV-SKILL", team: "TEAM-PROD" },
      design: { individual: "DES-SKILL", team: "TEAM-PROD" },
      marketing: { individual: "MKT-SKILL", team: "TEAM-CUST" },
      business: { individual: "BIZ-FUND", team: "TEAM-GROW" },
      testing: { individual: "TEST-SKILL", team: "TEAM-PROD" },
      deployment: { individual: "DEP-SKILL", team: "TEAM-PROD" },
      milestone: { individual: "MILE-FUND", team: "TEAM-GROW" },
      "customer-acquisition": { individual: "CUST-ACQ", team: "TEAM-CUST" },
      "product-foundation": { individual: "PROD-FOUND", team: "TEAM-PROD" },
      "idea-validation": { individual: "IDEA-VAL", team: "TEAM-IDEA" },
      "repeatable-tasks": { individual: "REPEAT", team: "REPEAT" },
      "team-growth": { individual: "GROWTH", team: "TEAM-GROW" },
      "legal-finance": { individual: "LEGAL-FIN", team: "TEAM-LEGAL" },
      pitch: { individual: "PITCH", team: "TEAM-PITCH" },
    };

    const prefix =
      categoryMap[category as keyof typeof categoryMap]?.[taskContext] ||
      (taskContext === "individual" ? "SKILL-FUND" : "TEAM-TASK");

    // Query database for existing template codes with this prefix
    const { data: existingTasks, error } = await supabase
      .from("tasks")
      .select("template_code")
      .eq("is_active", true)
      .like("template_code", `${prefix}-%`)
      .order("template_code", { ascending: false });

    if (error) {
      console.error("Error querying template codes:", error);
      return {
        code: `${prefix}-01`,
        error: "Database query failed, using default numbering",
      };
    }

    // Extract numbers from existing codes and find the highest
    let highestNumber = 0;

    if (existingTasks && existingTasks.length > 0) {
      for (const task of existingTasks) {
        const match = task.template_code.match(
          new RegExp(
            `^${prefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}-(\\d+)$`
          )
        );
        if (match) {
          const number = parseInt(match[1], 10);
          if (number > highestNumber) {
            highestNumber = number;
          }
        }
      }
    }

    // Generate next sequential number (pad with leading zero if needed)
    const nextNumber = highestNumber + 1;
    const paddedNumber = nextNumber.toString().padStart(2, "0");

    return {
      code: `${prefix}-${paddedNumber}`,
    };
  } catch (error) {
    console.error("Error generating template code:", error);
    // Fallback to timestamp-based unique code
    const timestamp = Date.now().toString().slice(-4);
    const prefix = taskContext === "individual" ? "SKILL-FUND" : "TEAM-TASK";
    return {
      code: `${prefix}-${timestamp}`,
      error: "Failed to generate sequential code, using timestamp fallback",
    };
  }
}
