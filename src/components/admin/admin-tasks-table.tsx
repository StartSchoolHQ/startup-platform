"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Edit,
  Trash2,
  MoreHorizontal,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getAllTasks } from "@/lib/tasks";
import { deleteTask } from "@/lib/database";
import { AdminTaskItem } from "@/types/team-journey";
import { EditTaskDialog } from "./edit-task-dialog";

interface AdminTasksTableProps {
  activityType: "individual" | "team";
}

export function AdminTasksTable({ activityType }: AdminTasksTableProps) {
  const [tasks, setTasks] = useState<AdminTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<
    "created_at" | "title" | "priority" | "difficulty_level" | "category"
  >("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Edit and delete state
  const [editingTask, setEditingTask] = useState<AdminTaskItem | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllTasks(activityType, sortBy, sortOrder);
      setTasks(data);
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setLoading(false);
    }
  }, [activityType, sortBy, sortOrder]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const handleEdit = (task: AdminTaskItem) => {
    // Ensure any previous modal state is cleared
    setDeletingTaskId(null);
    setDeleting(false);
    setEditingTask(task);
  };

  const handleDelete = async (taskId: string) => {
    if (deleting) return; // Prevent double-clicks

    setDeleting(true);
    try {
      await deleteTask(taskId);
      // Close dialog and clear ALL modal states immediately
      setDeletingTaskId(null);
      setDeleting(false);
      setEditingTask(null); // Clear any editing task reference
      // Refresh the list
      await loadTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
      setDeleting(false);
      // TODO: Show error message to user
    }
  };

  const getSortIcon = (column: typeof sortBy) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="text-muted-foreground h-4 w-4" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="h-4 w-4 text-black dark:text-white" />
    ) : (
      <ArrowDown className="h-4 w-4 text-black dark:text-white" />
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "customer-acquisition":
        return "bg-teal-100 text-teal-800";
      case "product-foundation":
        return "bg-cyan-100 text-cyan-800";
      case "idea-validation":
        return "bg-lime-100 text-lime-800";
      case "repeatable-tasks":
        return "bg-amber-100 text-amber-800";
      case "team-growth":
        return "bg-emerald-100 text-emerald-800";
      case "legal-finance":
        return "bg-slate-100 text-slate-800";
      case "pitch":
        return "bg-pink-100 text-pink-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-lg border p-4"
          >
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="ml-auto h-5 w-8" />
          </div>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-muted-foreground mb-2">
          No {activityType} tasks found
        </div>
        <div className="text-muted-foreground text-sm">
          Create your first {activityType} task using the &quot;Add Task&quot;
          button above
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sorting Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-muted-foreground text-sm">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""} found
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Sort by:</span>
          <Select
            value={sortBy}
            onValueChange={(value: typeof sortBy) => handleSort(value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Date Created</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="category">Category</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="difficulty_level">Difficulty</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          >
            {getSortIcon(sortBy)}
            {sortOrder === "asc" ? "Ascending" : "Descending"}
          </Button>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-border border-b">
              <th
                className="text-muted-foreground hover:text-foreground cursor-pointer px-4 py-4 text-left font-medium"
                onClick={() => handleSort("title")}
              >
                <div className="flex items-center gap-2">
                  Task
                  {getSortIcon("title")}
                </div>
              </th>
              <th
                className="text-muted-foreground hover:text-foreground cursor-pointer px-4 py-4 text-left font-medium"
                onClick={() => handleSort("category")}
              >
                <div className="flex items-center gap-2">
                  Category
                  {getSortIcon("category")}
                </div>
              </th>
              <th
                className="text-muted-foreground hover:text-foreground cursor-pointer px-4 py-4 text-left font-medium"
                onClick={() => handleSort("priority")}
              >
                <div className="flex items-center gap-2">
                  Priority
                  {getSortIcon("priority")}
                </div>
              </th>
              <th
                className="text-muted-foreground hover:text-foreground cursor-pointer px-4 py-4 text-left font-medium"
                onClick={() => handleSort("difficulty_level")}
              >
                <div className="flex items-center gap-2">
                  Difficulty
                  {getSortIcon("difficulty_level")}
                </div>
              </th>
              <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                Rewards
              </th>
              <th
                className="text-muted-foreground hover:text-foreground cursor-pointer px-4 py-4 text-left font-medium"
                onClick={() => handleSort("created_at")}
              >
                <div className="flex items-center gap-2">
                  Created
                  {getSortIcon("created_at")}
                </div>
              </th>
              <th className="text-muted-foreground px-4 py-4 text-right font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, index) => (
              <tr
                key={task.id}
                className={`${
                  index < tasks.length - 1 ? "border-border border-b" : ""
                } hover:bg-muted/20 transition-colors ${
                  task.is_confidential ? "bg-red-50/50" : ""
                }`}
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-md">
                      <FileText className="h-4 w-4 text-black dark:text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <div className="text-sm font-medium">{task.title}</div>
                        {task.is_confidential && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="destructive"
                                  className="flex items-center gap-1 px-1.5 py-0.5 text-xs"
                                >
                                  <Lock className="h-2.5 w-2.5" />
                                  Confidential
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  This task can only be reviewed by admin users
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      {task.description && (
                        <div className="text-muted-foreground line-clamp-2 max-w-md text-xs">
                          {task.description}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getCategoryColor(
                      task.category || ""
                    )}`}
                  >
                    {task.category}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <Badge variant={getPriorityColor(task.priority || "medium")}>
                    {task.priority}
                  </Badge>
                </td>
                <td className="px-4 py-4">
                  <DifficultyBadge
                    level={
                      task.difficulty_level ||
                      (task.difficulty === "Easy"
                        ? 1
                        : task.difficulty === "Medium"
                          ? 2
                          : 3)
                    }
                  />
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm">
                    <div>{task.xp || 0} XP</div>
                    <div className="text-muted-foreground">
                      {task.points || 0} pts
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-muted-foreground text-sm">
                    {task.updated_at
                      ? new Date(task.updated_at).toLocaleDateString()
                      : "N/A"}
                  </div>
                </td>
                <td className="px-4 py-4 text-right">
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      onCloseAutoFocus={(e) => e.preventDefault()}
                    >
                      <DropdownMenuItem
                        onSelect={() => {
                          handleEdit(task);
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Task
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onSelect={() => {
                          setDeletingTaskId(task.id);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Task
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Task Dialog */}
      <EditTaskDialog
        task={editingTask}
        onTaskUpdated={async () => {
          setEditingTask(null);
          await loadTasks();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingTaskId}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeletingTaskId(null);
            setDeleting(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this task? This action cannot be
              undone and will remove the task template from the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={deleting}
              onClick={() => {
                setDeletingTaskId(null);
                setDeleting(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => {
                if (deletingTaskId) {
                  handleDelete(deletingTaskId);
                }
              }}
            >
              {deleting ? "Deleting..." : "Delete Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
