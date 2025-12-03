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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
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
      case "development":
        return "bg-blue-100 text-blue-800";
      case "design":
        return "bg-purple-100 text-purple-800";
      case "marketing":
        return "bg-green-100 text-green-800";
      case "business":
        return "bg-orange-100 text-orange-800";
      case "onboarding":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading tasks...</div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center p-8">
        <div className="text-muted-foreground mb-2">
          No {activityType} tasks found
        </div>
        <div className="text-sm text-muted-foreground">
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
          <div className="text-sm text-muted-foreground">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""} found
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
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
            <tr className="border-b border-border">
              <th
                className="text-left py-4 px-4 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => handleSort("title")}
              >
                <div className="flex items-center gap-2">
                  Task
                  {getSortIcon("title")}
                </div>
              </th>
              <th
                className="text-left py-4 px-4 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => handleSort("category")}
              >
                <div className="flex items-center gap-2">
                  Category
                  {getSortIcon("category")}
                </div>
              </th>
              <th
                className="text-left py-4 px-4 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => handleSort("priority")}
              >
                <div className="flex items-center gap-2">
                  Priority
                  {getSortIcon("priority")}
                </div>
              </th>
              <th
                className="text-left py-4 px-4 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => handleSort("difficulty_level")}
              >
                <div className="flex items-center gap-2">
                  Difficulty
                  {getSortIcon("difficulty_level")}
                </div>
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                Rewards
              </th>
              <th
                className="text-left py-4 px-4 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => handleSort("created_at")}
              >
                <div className="flex items-center gap-2">
                  Created
                  {getSortIcon("created_at")}
                </div>
              </th>
              <th className="text-right py-4 px-4 font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, index) => (
              <tr
                key={task.id}
                className={`${
                  index < tasks.length - 1 ? "border-b border-border" : ""
                } hover:bg-muted/20 transition-colors`}
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                      <FileText className="h-4 w-4 text-black dark:text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{task.title}</div>
                      {task.description && (
                        <div className="text-xs text-muted-foreground line-clamp-2 max-w-md">
                          {task.description}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getCategoryColor(
                      task.category || ""
                    )}`}
                  >
                    {task.category}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <Badge variant={getPriorityColor(task.priority || "medium")}>
                    {task.priority}
                  </Badge>
                </td>
                <td className="py-4 px-4">
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
                <td className="py-4 px-4">
                  <div className="text-sm">
                    <div>{task.xp || 0} XP</div>
                    <div className="text-muted-foreground">
                      {task.points || 0} pts
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="text-sm text-muted-foreground">
                    {task.updated_at
                      ? new Date(task.updated_at).toLocaleDateString()
                      : "N/A"}
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
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
