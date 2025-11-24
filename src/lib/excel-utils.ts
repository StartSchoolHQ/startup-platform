import * as XLSX from "xlsx";

// Excel template structure
export interface TaskExcelRow {
  template_code: string;
  title: string;
  description?: string;
  category?:
    | "onboarding"
    | "development"
    | "design"
    | "marketing"
    | "business"
    | "testing"
    | "deployment"
    | "milestone";
  priority?: "low" | "medium" | "high" | "urgent";
  difficulty_level?: number;
  estimated_hours?: number;
  base_xp_reward?: number;
  base_points_reward?: number;
  requires_review?: boolean;
  auto_assign_to_new_teams?: boolean;
}

// Convert boolean to Excel-friendly format
const boolToExcel = (value: boolean): string => (value ? "Yes" : "No");
const excelToBool = (value: string | boolean): boolean => {
  if (typeof value === "boolean") return value;
  return (
    value?.toString().toLowerCase() === "yes" ||
    value?.toString().toLowerCase() === "true"
  );
};

/**
 * Generate Excel template file for bulk task creation
 */
export function generateTaskTemplate(
  taskContext: "individual" | "team" = "team"
): Blob {
  const sampleData: TaskExcelRow[] =
    taskContext === "individual"
      ? [
          {
            template_code: "DEV-SKILL-15",
            title: "Learn React Hooks",
            description:
              "Complete tutorial on React hooks including useState, useEffect, and custom hooks",
            category: "development",
            priority: "medium",
            difficulty_level: 2,
            estimated_hours: 4,
            base_xp_reward: 100,
            base_points_reward: 15,
            requires_review: false, // Individual tasks don't require review by default
            auto_assign_to_new_teams: true,
          },
          {
            template_code: "BIZ-FUND-23",
            title: "Market Analysis Basics",
            description:
              "Learn fundamental concepts of market analysis and competitor research",
            category: "business",
            priority: "low",
            difficulty_level: 1,
            estimated_hours: 2,
            base_xp_reward: 80,
            base_points_reward: 10,
            requires_review: false,
            auto_assign_to_new_teams: true,
          },
        ]
      : [
          {
            template_code: "TEAM-PROD-42",
            title: "Create Business Plan",
            description:
              "Develop a comprehensive business plan including market analysis, financial projections, and strategy",
            category: "business",
            priority: "high",
            difficulty_level: 3,
            estimated_hours: 8,
            base_xp_reward: 150,
            base_points_reward: 15,
            requires_review: true, // Team tasks always require review
            auto_assign_to_new_teams: true,
          },
          {
            template_code: "TEAM-PROD-67",
            title: "Design Logo and Branding",
            description:
              "Create company logo, color palette, and brand guidelines",
            category: "design",
            priority: "medium",
            difficulty_level: 2,
            estimated_hours: 6,
            base_xp_reward: 100,
            base_points_reward: 10,
            requires_review: true, // Team tasks always require review
            auto_assign_to_new_teams: true,
          },
        ];

  // Convert boolean fields to Excel-friendly format
  const excelData = sampleData.map((row) => ({
    template_code: row.template_code,
    title: row.title,
    description: row.description || "",
    category: row.category || "development",
    priority: row.priority || "medium",
    difficulty_level: row.difficulty_level || 1,
    estimated_hours: row.estimated_hours || 0,
    base_xp_reward: row.base_xp_reward || 0,
    base_points_reward: row.base_points_reward || 0,
    requires_review: boolToExcel(row.requires_review || false),
    auto_assign_to_new_teams: boolToExcel(
      row.auto_assign_to_new_teams !== false
    ),
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Set column widths for better readability
  const columnWidths = [
    { wch: 15 }, // template_code
    { wch: 30 }, // title
    { wch: 50 }, // description
    { wch: 12 }, // category
    { wch: 10 }, // priority
    { wch: 15 }, // difficulty_level
    { wch: 15 }, // estimated_hours
    { wch: 15 }, // base_xp_reward
    { wch: 18 }, // base_points_reward
    { wch: 15 }, // requires_review
    { wch: 22 }, // auto_assign_to_new_teams
  ];
  worksheet["!cols"] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");

  // Add instructions sheet
  const instructions = [
    ["Task Import Instructions"],
    [""],
    ["Required Fields:"],
    ["- template_code: Unique identifier (e.g., TASK_001)"],
    ["- title: Task name"],
    [""],
    ["Optional Fields:"],
    ["- description: Detailed task description"],
    [
      "- category: onboarding, development, design, marketing, business, testing, deployment, milestone",
    ],
    ["- priority: low, medium, high, urgent"],
    ["- difficulty_level: Number from 1-10"],
    ["- estimated_hours: Estimated time to complete"],
    ["- base_xp_reward: XP points awarded"],
    ["- base_points_reward: Points awarded"],
    ["- requires_review: Yes/No - Whether task needs review"],
    ["- auto_assign_to_new_teams: Yes/No - Assign to new teams automatically"],
    [""],
    ["Notes:"],
    ["- All tasks will be assigned to existing active teams"],
    ["- Delete the sample rows and add your own tasks"],
    ["- Save as .xlsx file before uploading"],
  ];

  const instructionSheet = XLSX.utils.aoa_to_sheet(instructions);
  instructionSheet["!cols"] = [{ wch: 60 }];
  XLSX.utils.book_append_sheet(workbook, instructionSheet, "Instructions");

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * Parse Excel file and extract task data
 */
export function parseTasksFromExcel(file: File): Promise<TaskExcelRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        // Use the first sheet (should be Tasks)
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          raw: false, // Keep as strings for easier processing
          defval: "", // Default value for empty cells
        });

        // Process and validate the data
        const tasks: TaskExcelRow[] = (
          jsonData as Record<string, unknown>[]
        ).map((row, index) => {
          // Validate required fields
          if (!row.template_code || !row.title) {
            throw new Error(
              `Row ${index + 2}: template_code and title are required`
            );
          }

          // Check for duplicate template codes
          const duplicateIndex = (
            jsonData as Record<string, unknown>[]
          ).findIndex(
            (other, i) =>
              i !== index && other.template_code === row.template_code
          );
          if (duplicateIndex !== -1) {
            throw new Error(
              `Duplicate template_code "${row.template_code}" found in rows ${
                index + 2
              } and ${duplicateIndex + 2}`
            );
          }

          return {
            template_code: String(row.template_code).trim(),
            title: String(row.title).trim(),
            description: row.description
              ? String(row.description).trim()
              : undefined,
            category:
              (row.category as TaskExcelRow["category"]) || "development",
            priority: (row.priority as TaskExcelRow["priority"]) || "medium",
            difficulty_level: row.difficulty_level
              ? parseInt(String(row.difficulty_level))
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
            auto_assign_to_new_teams:
              row.auto_assign_to_new_teams === undefined
                ? true
                : excelToBool(row.auto_assign_to_new_teams as string | boolean),
          };
        });

        resolve(tasks);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Download the Excel template
 */
export function downloadTaskTemplate(
  taskContext: "individual" | "team" = "team"
) {
  const blob = generateTaskTemplate(taskContext);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${taskContext}-task-import-template.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
