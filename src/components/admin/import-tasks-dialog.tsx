"use client";

import { useState, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseTasksFromExcel, TaskExcelRow } from "@/lib/excel-utils";
import { createTask } from "@/lib/database";
import { generateNextTemplateCode } from "@/lib/template-codes";
import { createClient } from "@/lib/supabase/client";

// Map task categories to achievement names
const CATEGORY_TO_ACHIEVEMENT_MAP: Record<string, string> = {
  "customer-acquisition": "Customer Acquisition",
  "product-foundation": "Product Foundation",
  "idea-validation": "Idea Validation",
  "repeatable-tasks": "Recurring Tasks",
  "team-growth": "Team Growth",
  "legal-finance": "Legal & Finance",
  pitch: "Pitch & Presentation",
};

// Parse review instructions markdown into peer_review_criteria JSONB structure
function parseReviewInstructionsToCriteria(
  reviewInstructions: string | undefined
): Array<{ category: string; points: string[] }> {
  if (!reviewInstructions) return [];

  const lines = reviewInstructions.split("\n");
  const criteria: Array<{ category: string; points: string[] }> = [];
  let currentCategory: { category: string; points: string[] } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and main headers
    if (
      !trimmed ||
      trimmed === "## Review Instructions" ||
      trimmed.startsWith("---")
    )
      continue;

    // Detect section headers like **What to evaluate:** or **Reject if:**
    if (trimmed.startsWith("**") && trimmed.endsWith(":**")) {
      if (currentCategory) {
        criteria.push(currentCategory);
      }
      currentCategory = {
        category: trimmed.replace(/^\*\*|\*\*:$/g, ""),
        points: [],
      };
    }
    // Detect numbered points (1., 2., etc.)
    else if (/^\d+\./.test(trimmed) && currentCategory) {
      currentCategory.points.push(trimmed);
    }
    // Detect bullet points (-, *, +)
    else if (/^[-*+]\s/.test(trimmed) && currentCategory) {
      currentCategory.points.push(trimmed);
    }
  }

  // Push the last category
  if (currentCategory) {
    criteria.push(currentCategory);
  }

  return criteria;
}

export function ImportTasksDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedTasks, setParsedTasks] = useState<TaskExcelRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [importResults, setImportResults] = useState<{
    success: number;
    errors: string[];
  }>({ success: 0, errors: [] });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      setError("Please select a CSV (.csv) file");
      return;
    }

    setFile(selectedFile);
    setError("");
    setParsedTasks([]);

    try {
      const tasks = await parseTasksFromExcel(selectedFile);
      setParsedTasks(tasks);
      if (tasks.length === 0) {
        setError("No valid tasks found in the CSV file");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse CSV file");
      setParsedTasks([]);
    }
  };

  const handleImport = async () => {
    if (parsedTasks.length === 0) return;

    setIsProcessing(true);
    setError("");
    setSuccess("");

    const results = { success: 0, errors: [] as string[] };

    try {
      const supabase = createClient();

      // Check for existing tasks with same titles
      const titlesToCheck = parsedTasks.map((t) => t.title);
      const { data: existingTasks } = await supabase
        .from("tasks")
        .select("title")
        .in("title", titlesToCheck);

      if (existingTasks && existingTasks.length > 0) {
        const existingTitles = existingTasks.map((t) => t.title);
        const duplicates = parsedTasks.filter((t) =>
          existingTitles.includes(t.title)
        );
        if (duplicates.length > 0) {
          setError(
            `Found ${
              duplicates.length
            } task(s) with existing titles: ${duplicates
              .slice(0, 3)
              .map((d) => `"${d.title}"`)
              .join(", ")}${duplicates.length > 3 ? "..." : ""}`
          );
          setIsProcessing(false);
          return;
        }
      }

      // Fetch achievements to build category -> achievement_id mapping
      const { data: achievements, error: achievementsError } = await supabase
        .from("achievements")
        .select("id, name")
        .eq("context", "team");

      if (achievementsError) {
        setError("Failed to load achievements: " + achievementsError.message);
        setIsProcessing(false);
        return;
      }

      // Build achievement name -> id map
      const achievementMap = new Map<string, string>();
      achievements?.forEach((ach) => {
        achievementMap.set(ach.name, ach.id);
      });

      // Process tasks one by one to handle individual failures
      for (let i = 0; i < parsedTasks.length; i++) {
        const task = parsedTasks[i];
        let templateCode = task.template_code || "";
        try {
          // Auto-generate template_code if not provided
          if (!templateCode) {
            const category = task.category || "development";
            const result = await generateNextTemplateCode(category, "team");
            templateCode = result.code;
          }

          // Convert semicolon-separated strings to arrays
          const learningObjectives = task.learning_objectives
            ? task.learning_objectives
                .split(";")
                .map((s) => s.trim())
                .filter((s) => s)
            : undefined;
          const deliverables = task.deliverables
            ? task.deliverables
                .split(";")
                .map((s) => s.trim())
                .filter((s) => s)
            : undefined;
          const tags = task.tags
            ? task.tags
                .split(";")
                .map((s) => s.trim())
                .filter((s) => s)
            : undefined;

          // Normalize priority - map CSV values to enum values
          let priority: "low" | "medium" | "high" | "critical" | undefined;
          const rawPriority = task.priority?.toLowerCase();
          if (rawPriority === "top") {
            priority = "high";
          } else if (
            rawPriority === "low" ||
            rawPriority === "medium" ||
            rawPriority === "high" ||
            rawPriority === "critical"
          ) {
            priority = rawPriority;
          } else {
            priority = undefined;
          }

          // Normalize category (fix typo variant)
          let category = task.category;
          if (category === "customer-acqusition") {
            category = "customer-acquisition";
          }

          // Map category to achievement_id
          const achievementName = category
            ? CATEGORY_TO_ACHIEVEMENT_MAP[category]
            : undefined;
          const achievementId = achievementName
            ? achievementMap.get(achievementName)
            : undefined;

          // Parse review instructions into peer_review_criteria
          const reviewInstructions =
            task.peer_review_instructions || task.review_instructions;
          const peerReviewCriteria =
            parseReviewInstructionsToCriteria(reviewInstructions);

          const result = await createTask({
            templateCode,
            title: task.title,
            description: task.description,
            detailedInstructions: task.detailed_instructions,
            category,
            achievementId, // Map task category to achievement
            priority,
            difficultyLevel: task.difficulty_level,
            estimatedHours: task.estimated_hours,
            baseXpReward: task.base_xp_reward,
            basePointsReward: task.base_points_reward,
            requiresReview: true, // ALL team tasks require peer review
            taskContext: "team", // CSV imports are for team tasks only
            learningObjectives,
            deliverables,
            reviewInstructions,
            peerReviewCriteria, // Parsed from review_instructions
            tags,
            isRecurring:
              typeof task.is_recurring === "boolean"
                ? task.is_recurring
                : undefined,
            cooldownDays:
              typeof task.cooldown_days === "number"
                ? task.cooldown_days
                : undefined,
            isConfidential:
              typeof task.is_confidential === "boolean"
                ? task.is_confidential
                : undefined,
          });

          // Parse the JSON response from the database function
          const response =
            typeof result === "string" ? JSON.parse(result) : result;

          if (response?.success) {
            results.success++;
          } else {
            results.errors.push(
              `Row ${i + 2} (${templateCode}): ${
                response?.error || "Unknown error"
              }`
            );
          }
        } catch (err) {
          results.errors.push(
            `Row ${i + 2} (${templateCode || task.title}): ${
              err instanceof Error ? err.message : "Unknown error"
            }`
          );
        }
      }

      setImportResults(results);

      if (results.success > 0) {
        const message = `Successfully imported ${results.success} of ${parsedTasks.length} tasks`;
        setSuccess(message);

        // Reset form if all tasks were successful
        if (results.errors.length === 0) {
          setFile(null);
          setParsedTasks([]);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }

          // Close dialog after 2 seconds if fully successful
          setTimeout(() => {
            setOpen(false);
            setSuccess("");
            setImportResults({ success: 0, errors: [] });
          }, 2000);
        }
      } else {
        setError("No tasks were imported successfully");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import tasks");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetDialog = () => {
    setFile(null);
    setParsedTasks([]);
    setError("");
    setSuccess("");
    setImportResults({ success: 0, errors: [] });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) resetDialog();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import from CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Tasks from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import multiple tasks. All tasks will be
            assigned to existing active teams.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-primary text-sm flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file">Select CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              disabled={isProcessing}
              ref={fileInputRef}
            />
            <p className="text-xs text-muted-foreground">
              Supported formats: .csv
            </p>
          </div>

          {file && parsedTasks.length > 0 && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                <span className="font-medium">
                  Preview: {parsedTasks.length} tasks found
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2">
                {parsedTasks.slice(0, 5).map((task, index) => (
                  <div
                    key={index}
                    className="text-sm p-2 bg-muted rounded border-l-4 border-primary"
                  >
                    <div className="font-medium">
                      {task.template_code}: {task.title}
                    </div>
                    <div className="text-muted-foreground">
                      Category: {task.category} | Priority: {task.priority} |
                      Difficulty: {task.difficulty_level} | XP:{" "}
                      {task.base_xp_reward} | Points: {task.base_points_reward}
                      {task.tags && <span> | Tags: {task.tags}</span>}
                    </div>
                  </div>
                ))}
                {parsedTasks.length > 5 && (
                  <div className="text-sm text-muted-foreground text-center py-2">
                    ... and {parsedTasks.length - 5} more tasks
                  </div>
                )}
              </div>
            </div>
          )}

          {importResults.errors.length > 0 && (
            <div className="rounded-lg border border-destructive/20 p-4 space-y-2">
              <div className="font-medium text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Import Errors ({importResults.errors.length})
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {importResults.errors.map((error, index) => (
                  <div
                    key={index}
                    className="text-sm text-destructive bg-destructive/5 p-2 rounded"
                  >
                    {error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isProcessing || parsedTasks.length === 0}
          >
            {isProcessing
              ? `Importing... (${importResults.success}/${parsedTasks.length})`
              : `Import ${parsedTasks.length} Tasks`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
