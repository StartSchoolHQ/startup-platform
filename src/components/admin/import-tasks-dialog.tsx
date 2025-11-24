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

    if (
      !selectedFile.name.endsWith(".xlsx") &&
      !selectedFile.name.endsWith(".xls")
    ) {
      setError("Please select an Excel file (.xlsx or .xls)");
      return;
    }

    setFile(selectedFile);
    setError("");
    setParsedTasks([]);

    try {
      const tasks = await parseTasksFromExcel(selectedFile);
      setParsedTasks(tasks);
      if (tasks.length === 0) {
        setError("No valid tasks found in the Excel file");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to parse Excel file"
      );
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
      // Process tasks one by one to handle individual failures
      for (let i = 0; i < parsedTasks.length; i++) {
        const task = parsedTasks[i];
        try {
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

          const result = await createTask({
            templateCode: task.template_code,
            title: task.title,
            description: task.description,
            detailedInstructions: task.detailed_instructions,
            category: task.category,
            priority: task.priority,
            difficultyLevel: task.difficulty_level,
            estimatedHours: task.estimated_hours,
            baseXpReward: task.base_xp_reward,
            basePointsReward: task.base_points_reward,
            requiresReview: task.requires_review,
            autoAssignToNewTeams: task.auto_assign_to_new_teams,
            taskContext: "team", // Default to team for Excel imports
            learningObjectives,
            deliverables,
            reviewInstructions: task.review_instructions,
            tags,
          });

          // Parse the JSON response from the database function
          const response =
            typeof result === "string" ? JSON.parse(result) : result;

          if (response?.success) {
            results.success++;
          } else {
            results.errors.push(
              `Row ${i + 2} (${task.template_code}): ${
                response?.error || "Unknown error"
              }`
            );
          }
        } catch (err) {
          results.errors.push(
            `Row ${i + 2} (${task.template_code}): ${
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
          Import from Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Tasks from Excel</DialogTitle>
          <DialogDescription>
            Upload an Excel file to bulk import multiple tasks. All tasks will
            be assigned to existing active teams.
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
            <Label htmlFor="excel-file">Select Excel File</Label>
            <Input
              id="excel-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              disabled={isProcessing}
              ref={fileInputRef}
            />
            <p className="text-xs text-muted-foreground">
              Supported formats: .xlsx, .xls
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
