import * as XLSX from "xlsx";

// Excel template structure
export interface TaskExcelRow {
  template_code: string;
  title: string;
  description?: string;
  detailed_instructions?: string;
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
  learning_objectives?: string; // Semicolon-separated list
  deliverables?: string; // Semicolon-separated list
  review_instructions?: string;
  tags?: string; // Semicolon-separated list
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
          // Individual Development Tasks (DEV-SKILL-XX)
          {
            template_code: "DEV-SKILL-01",
            title: "Learn React Hooks",
            description:
              "Master React hooks including useState, useEffect, and custom hooks",
            detailed_instructions:
              "## Step-by-step Instructions\n\n1. **Set up** a new React project\n2. Create components using `useState`\n3. Implement `useEffect` for side effects\n4. Build a custom hook\n\n### Resources\n- [React Hooks Documentation](https://react.dev/reference/react)",
            category: "development",
            priority: "medium",
            difficulty_level: 2,
            estimated_hours: 4,
            base_xp_reward: 100,
            base_points_reward: 15,
            requires_review: false,
            auto_assign_to_new_teams: true,
            learning_objectives:
              "Understand React hooks;Master useState and useEffect;Create custom hooks",
            deliverables:
              "Working React app;Custom hook implementation;Code documentation",
            review_instructions: "",
            tags: "react;hooks;frontend;development",
          },
          // Individual Business Tasks (BIZ-FUND-XX)
          {
            template_code: "BIZ-FUND-01",
            title: "Market Analysis Fundamentals",
            description:
              "Learn market research and competitive analysis techniques",
            detailed_instructions:
              "## Market Research Process\n\n1. **Define** your target market\n2. **Research** industry trends\n3. **Analyze** competitors\n4. **Document** findings\n\n### Deliverables Format\n- Use templates provided in resources section",
            category: "business",
            priority: "medium",
            difficulty_level: 2,
            estimated_hours: 3,
            base_xp_reward: 80,
            base_points_reward: 12,
            requires_review: false,
            auto_assign_to_new_teams: true,
            learning_objectives:
              "Understand market analysis;Learn competitor research methods;Master research documentation",
            deliverables:
              "Market analysis report;Competitor comparison chart;Industry trends summary",
            review_instructions: "",
            tags: "business;market;analysis;research",
          },
          // Individual Design Tasks (DES-SKILL-XX)
          {
            template_code: "DES-SKILL-01",
            title: "Design Principles Fundamentals",
            description:
              "Learn core design principles: contrast, alignment, repetition, proximity",
            detailed_instructions:
              "## Design Principles Overview\n\n### The 4 Core Principles:\n1. **Contrast** - Make different elements obviously different\n2. **Alignment** - Every element should have visual connection\n3. **Repetition** - Repeat visual elements throughout design\n4. **Proximity** - Group related items together\n\n### Practice Exercise\nCreate 3 designs demonstrating each principle",
            category: "design",
            priority: "high",
            difficulty_level: 2,
            estimated_hours: 4,
            base_xp_reward: 90,
            base_points_reward: 14,
            requires_review: false,
            auto_assign_to_new_teams: true,
            learning_objectives:
              "Master design principles;Apply contrast effectively;Understand visual hierarchy",
            deliverables:
              "Design examples;Principle explanations;Before/after comparisons",
            review_instructions: "",
            tags: "design;principles;visual;fundamentals",
          },
          // Individual Marketing Tasks (MKT-SKILL-XX)
          {
            template_code: "MKT-SKILL-01",
            title: "Social Media Strategy Basics",
            description:
              "Learn to create effective social media content strategies",
            detailed_instructions:
              "## Social Media Strategy Framework\n\n### 1. Platform Analysis\n- Research target audience on each platform\n- Understand platform-specific best practices\n\n### 2. Content Planning\n- Develop content calendar\n- Create engaging post templates\n\n### 3. Engagement Strategy\n- Plan community interaction approach",
            category: "marketing",
            priority: "medium",
            difficulty_level: 2,
            estimated_hours: 3,
            base_xp_reward: 85,
            base_points_reward: 13,
            requires_review: false,
            auto_assign_to_new_teams: true,
            learning_objectives:
              "Understand social media platforms;Create content strategies;Plan engagement tactics",
            deliverables:
              "Platform analysis;Content calendar template;Engagement strategy document",
            review_instructions: "",
            tags: "marketing;social;media;strategy;content",
          },
          // Individual Onboarding Tasks (ONB-FUND-XX)
          {
            template_code: "ONB-FUND-01",
            title: "Platform Navigation Training",
            description:
              "Learn to navigate and use all platform features effectively",
            detailed_instructions:
              "## Platform Overview\n\n### Key Areas to Explore:\n1. **Dashboard** - Your main workspace\n2. **Team Journey** - Collaborate with team members\n3. **My Journey** - Track personal progress\n4. **Leaderboard** - See rankings and achievements\n\n### Practice Tasks\n- Complete profile setup\n- Join first team activity\n- Submit first task",
            category: "onboarding",
            priority: "high",
            difficulty_level: 1,
            estimated_hours: 1,
            base_xp_reward: 50,
            base_points_reward: 8,
            requires_review: false,
            auto_assign_to_new_teams: true,
            learning_objectives:
              "Navigate platform interface;Understand feature locations;Complete basic interactions",
            deliverables:
              "Completed profile;First team interaction;Platform tour completion",
            review_instructions: "",
            tags: "onboarding;platform;navigation;basics",
          },
          // Individual Testing Tasks (TEST-SKILL-XX)
          {
            template_code: "TEST-SKILL-01",
            title: "Manual Testing Fundamentals",
            description: "Learn systematic approach to manual software testing",
            detailed_instructions:
              "## Testing Methodology\n\n### Test Case Development\n1. **Understand** requirements\n2. **Design** test scenarios\n3. **Execute** tests systematically\n4. **Document** findings\n\n### Bug Report Format\n- Clear reproduction steps\n- Expected vs actual behavior\n- Screenshots/evidence",
            category: "testing",
            priority: "medium",
            difficulty_level: 2,
            estimated_hours: 3,
            base_xp_reward: 75,
            base_points_reward: 11,
            requires_review: false,
            auto_assign_to_new_teams: true,
            learning_objectives:
              "Understand testing process;Create effective test cases;Write clear bug reports",
            deliverables:
              "Test case examples;Bug report template;Testing checklist",
            review_instructions: "",
            tags: "testing;manual;qa;process;documentation",
          },
        ]
      : [
          // Team Production Tasks (TEAM-PROD-XX) - Development/Design/Testing/Deployment
          {
            template_code: "TEAM-PROD-01",
            title: "Build MVP Landing Page",
            description:
              "Create and deploy a professional landing page for your startup",
            detailed_instructions:
              "## Landing Page Requirements\n\n### Core Sections:\n1. **Hero Section** - Clear value proposition\n2. **Features** - Key product benefits\n3. **About** - Team and mission\n4. **Contact** - Get in touch form\n\n### Technical Requirements\n- Responsive design (mobile-first)\n- Fast loading (< 3 seconds)\n- SEO optimized\n- Analytics tracking\n\n### Deployment\n- Use modern hosting platform\n- Set up custom domain\n- Enable SSL certificate",
            category: "development",
            priority: "high",
            difficulty_level: 3,
            estimated_hours: 12,
            base_xp_reward: 200,
            base_points_reward: 25,
            requires_review: true,
            auto_assign_to_new_teams: true,
            learning_objectives:
              "Web development skills;Responsive design;Deployment process;SEO basics",
            deliverables:
              "Live landing page;Source code repository;Analytics setup;Performance report",
            review_instructions:
              "Check responsiveness across devices, loading speed, SEO elements, and overall design quality. Verify all links work and forms function properly.",
            tags: "development;web;mvp;landing;design;deployment",
          },
          // Team Customer Tasks (TEAM-CUST-XX) - Marketing focused
          {
            template_code: "TEAM-CUST-01",
            title: "Customer Discovery Campaign",
            description:
              "Research target market and validate product-market fit through customer interviews",
            detailed_instructions:
              "## Customer Discovery Process\n\n### Phase 1: Research (Week 1)\n- Define target customer personas\n- Research market size and trends\n- Identify key pain points\n\n### Phase 2: Interviews (Week 2-3)\n- Conduct 15-20 customer interviews\n- Use structured interview guide\n- Document insights systematically\n\n### Phase 3: Analysis (Week 4)\n- Analyze interview data\n- Validate/refine personas\n- Identify product opportunities",
            category: "marketing",
            priority: "high",
            difficulty_level: 4,
            estimated_hours: 16,
            base_xp_reward: 250,
            base_points_reward: 30,
            requires_review: true,
            auto_assign_to_new_teams: true,
            learning_objectives:
              "Customer research methods;Interview techniques;Market validation;Data analysis",
            deliverables:
              "Customer personas;Interview summaries;Market insights report;Product recommendations",
            review_instructions:
              "Evaluate quality of research methodology, depth of customer insights, and actionable recommendations for product development.",
            tags: "marketing;customer;research;interviews;validation;market",
          },
          // Team Growth Tasks (TEAM-GROW-XX) - Business/Milestone focused
          {
            template_code: "TEAM-GROW-01",
            title: "Business Model Canvas",
            description:
              "Develop comprehensive business model using the Business Model Canvas framework",
            detailed_instructions:
              "## Business Model Canvas Structure\n\n### The 9 Building Blocks:\n\n#### Value Creation\n1. **Value Propositions** - What value do you deliver?\n2. **Key Activities** - Most important activities\n3. **Key Resources** - Most important assets\n4. **Key Partners** - Network of suppliers/partners\n\n#### Customer Interface\n5. **Customer Segments** - Who are you creating value for?\n6. **Channels** - How do you reach customers?\n7. **Customer Relationships** - What type of relationship?\n\n#### Financial Aspects\n8. **Cost Structure** - Most important costs\n9. **Revenue Streams** - How do you make money?\n\n### Validation Process\n- Test key assumptions\n- Gather market feedback\n- Iterate based on learnings",
            category: "business",
            priority: "high",
            difficulty_level: 4,
            estimated_hours: 20,
            base_xp_reward: 300,
            base_points_reward: 35,
            requires_review: true,
            auto_assign_to_new_teams: true,
            learning_objectives:
              "Business model design;Strategic thinking;Market positioning;Revenue planning",
            deliverables:
              "Completed Business Model Canvas;Assumption testing plan;Market validation results;Financial projections",
            review_instructions:
              "Assess completeness of all 9 blocks, logical consistency between elements, evidence of market validation, and feasibility of revenue model.",
            tags: "business;strategy;model;canvas;planning;revenue",
          },
          // Team Onboarding Tasks (TEAM-ONB-XX)
          {
            template_code: "TEAM-ONB-01",
            title: "Team Formation & Charter",
            description:
              "Establish team identity, roles, and working agreements",
            detailed_instructions:
              "## Team Charter Development\n\n### Team Identity\n- Choose team name and create logo\n- Define mission and vision\n- Establish team values\n\n### Role Definition\n- Assign primary roles (CEO, CTO, CMO, etc.)\n- Define responsibilities and accountabilities\n- Create backup role assignments\n\n### Working Agreements\n- Meeting schedule and format\n- Communication protocols\n- Decision-making process\n- Conflict resolution approach\n\n### Success Metrics\n- Define team success criteria\n- Set initial milestone goals\n- Establish review checkpoints",
            category: "onboarding",
            priority: "urgent",
            difficulty_level: 2,
            estimated_hours: 8,
            base_xp_reward: 150,
            base_points_reward: 20,
            requires_review: true,
            auto_assign_to_new_teams: true,
            learning_objectives:
              "Team dynamics;Role clarity;Communication skills;Goal setting",
            deliverables:
              "Team charter document;Role assignment matrix;Meeting schedule;Communication guidelines",
            review_instructions:
              "Verify all team members have clear roles, communication protocols are practical, and success metrics are measurable and realistic.",
            tags: "onboarding;team;charter;roles;communication;planning",
          },
        ];

  // Convert boolean fields to Excel-friendly format
  const excelData = sampleData.map((row) => ({
    template_code: row.template_code,
    title: row.title,
    description: row.description || "",
    detailed_instructions: row.detailed_instructions || "",
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
    learning_objectives: row.learning_objectives || "",
    deliverables: row.deliverables || "",
    review_instructions: row.review_instructions || "",
    tags: row.tags || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Set column widths for better readability
  const columnWidths = [
    { wch: 15 }, // template_code
    { wch: 30 }, // title
    { wch: 50 }, // description
    { wch: 60 }, // detailed_instructions
    { wch: 12 }, // category
    { wch: 10 }, // priority
    { wch: 15 }, // difficulty_level
    { wch: 15 }, // estimated_hours
    { wch: 15 }, // base_xp_reward
    { wch: 18 }, // base_points_reward
    { wch: 15 }, // requires_review
    { wch: 22 }, // auto_assign_to_new_teams
    { wch: 40 }, // learning_objectives
    { wch: 40 }, // deliverables
    { wch: 50 }, // review_instructions
    { wch: 30 }, // tags
  ];
  worksheet["!cols"] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");

  // Add instructions sheet
  const instructions = [
    ["Task Import Instructions"],
    [""],
    ["Template Code Structure:"],
    ["Individual Tasks:"],
    ["- ONB-FUND-XX (Onboarding Fundamentals)"],
    ["- DEV-SKILL-XX (Development Skills)"],
    ["- DES-SKILL-XX (Design Skills)"],
    ["- MKT-SKILL-XX (Marketing Skills)"],
    ["- BIZ-FUND-XX (Business Fundamentals)"],
    ["- TEST-SKILL-XX (Testing Skills)"],
    ["- DEP-SKILL-XX (Deployment Skills)"],
    ["- MILE-FUND-XX (Milestone Fundamentals)"],
    [""],
    ["Team Tasks:"],
    ["- TEAM-ONB-XX (Team Onboarding)"],
    ["- TEAM-PROD-XX (Team Production: Dev/Design/Test/Deploy)"],
    ["- TEAM-CUST-XX (Team Customer: Marketing focused)"],
    ["- TEAM-GROW-XX (Team Growth: Business/Milestones)"],
    [""],
    ["Required Fields:"],
    [
      "- template_code: Use format above with sequential number (e.g., TEAM-PROD-05)",
    ],
    ["- title: Task name"],
    [""],
    ["Optional Fields:"],
    ["- description: Brief task description"],
    ["- detailed_instructions: Step-by-step instructions (supports markdown)"],
    [
      "- category: onboarding, development, design, marketing, business, testing, deployment, milestone",
    ],
    ["- priority: low, medium, high, urgent"],
    ["- difficulty_level: Number from 1-5"],
    ["- estimated_hours: Estimated time to complete"],
    ["- base_xp_reward: XP points awarded"],
    ["- base_points_reward: Points awarded"],
    ["- requires_review: Yes/No - Whether task needs review"],
    ["- auto_assign_to_new_teams: Yes/No - Assign to new teams automatically"],
    ["- learning_objectives: Semicolon-separated list of objectives"],
    ["- deliverables: Semicolon-separated list of deliverables"],
    ["- review_instructions: Instructions for reviewers"],
    ["- tags: Semicolon-separated list of tags"],
    [""],
    ["List Fields Format (use semicolon to separate):"],
    ["- learning_objectives: 'Learn React; Master hooks; Build components'"],
    ["- deliverables: 'Working app; Documentation; Tests'"],
    ["- tags: 'react; javascript; frontend; development'"],
    [""],
    ["Markdown Formatting:"],
    ["- Use **bold**, *italic*, `code`, ## headers in text fields"],
    ["- Links: [text](url), Lists: - item1, > blockquotes"],
    ["- Line breaks: Use actual line breaks in Excel cells"],
    [""],
    ["Notes:"],
    ["- All tasks will be assigned to existing active teams"],
    ["- Delete the sample rows and add your own tasks"],
    ["- Save as .xlsx file before uploading"],
    ["- Use semicolons (;) to separate items in list fields"],
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
            detailed_instructions: row.detailed_instructions
              ? String(row.detailed_instructions).trim()
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
            auto_assign_to_new_teams:
              row.auto_assign_to_new_teams === undefined
                ? true
                : excelToBool(row.auto_assign_to_new_teams as string | boolean),
            learning_objectives: row.learning_objectives
              ? String(row.learning_objectives).trim()
              : undefined,
            deliverables: row.deliverables
              ? String(row.deliverables).trim()
              : undefined,
            review_instructions: row.review_instructions
              ? String(row.review_instructions).trim()
              : undefined,
            tags: row.tags ? String(row.tags).trim() : undefined,
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
