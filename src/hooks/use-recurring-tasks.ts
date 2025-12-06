import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface RecurringTaskStatus {
  task_id: string;
  template_code: string;
  title: string;
  is_recurring: boolean;
  cooldown_days: number;
  last_completion: string | null;
  next_available: string | null;
  latest_progress_id: string | null;
  recurring_status: "never_completed" | "available" | "cooldown";
  has_active_instance: boolean;
}

interface UseRecurringTasksProps {
  teamId: string;
  enabled?: boolean;
}

export function useRecurringTasks({
  teamId,
  enabled = true,
}: UseRecurringTasksProps) {
  const [recurringTasks, setRecurringTasks] = useState<RecurringTaskStatus[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRecurringTasks = async () => {
    if (!teamId || !enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      // Use the proper RPC function to get recurring task status
      const { data, error: rpcError } = await supabase.rpc(
        "get_recurring_task_status",
        { team_id_param: teamId }
      );

      if (rpcError) throw rpcError;

      // Map RPC result to our interface with validation
      const recurringTasksData: RecurringTaskStatus[] = (data || [])
        .filter((task: any) => {
          // Validate required fields
          const isValid =
            task.task_id && task.title && task.is_recurring !== undefined;
          if (!isValid) {
            console.warn("Invalid recurring task data:", task);
          }
          return isValid;
        })
        .map((task: any) => ({
          task_id: task.task_id,
          template_code: task.template_code,
          title: task.title,
          is_recurring: task.is_recurring,
          cooldown_days: task.cooldown_days || 7, // Default cooldown
          last_completion: task.last_completion,
          next_available: task.next_available,
          latest_progress_id: task.latest_progress_id,
          recurring_status: task.recurring_status as
            | "never_completed"
            | "available"
            | "cooldown",
          has_active_instance: task.has_active_instance,
        }));

      setRecurringTasks(recurringTasksData);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to fetch recurring tasks")
      );
      setRecurringTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const startRecurringTask = async (taskId: string, userId: string) => {
    try {
      const supabase = createClient();

      // Use the proper RPC function with validation and cooldown checking
      const { data, error: rpcError } = await supabase.rpc(
        "start_recurring_task",
        {
          task_id_param: taskId,
          team_id_param: teamId,
          user_id_param: userId,
        }
      );

      if (rpcError) throw new Error(rpcError.message);

      // Refresh the recurring tasks list
      await fetchRecurringTasks();

      // Return the result from the RPC function
      return (
        data?.[0] || { progress_id: null, message: "Task started successfully" }
      );
    } catch (err) {
      throw err instanceof Error
        ? err
        : new Error("Failed to start recurring task");
    }
  };

  useEffect(() => {
    fetchRecurringTasks();
  }, [teamId, enabled]);

  return {
    recurringTasks,
    loading,
    error,
    refetch: fetchRecurringTasks,
    startRecurringTask,
  };
}
