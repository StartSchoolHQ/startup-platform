"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Lightbulb, Link2, Target } from "lucide-react";
import type { TeamTask } from "@/types/team-journey";
import { parseResources, parseStringList } from "@/lib/task-content";
import { TaskMarkdown } from "@/components/tasks/task-markdown";
import {
  TaskObjectivesList,
  TaskResourceList,
  TaskSectionTitle,
} from "@/components/tasks/task-content-lists";

interface TaskDetailTabsProps {
  task: TeamTask;
  onSuggestEdits: () => void;
}

/**
 * Main column of the solo task page: the task itself, and a Tips tab with
 * mentor tips and resources. Both share the same quiet section styling.
 */
export function TaskDetailTabs({ task, onSuggestEdits }: TaskDetailTabsProps) {
  const objectives = parseStringList(task.learning_objectives);
  const resources = parseResources(task.resources);
  const tips = Array.isArray(task.tips_content) ? task.tips_content : [];

  const suggestEdits = (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
      onClick={onSuggestEdits}
    >
      Suggest edits
    </Button>
  );

  return (
    <Tabs defaultValue="task" className="w-full">
      <TabsList className="h-9">
        <TabsTrigger value="task" className="gap-2 px-4">
          <FileText className="h-3.5 w-3.5" />
          Task
        </TabsTrigger>
        <TabsTrigger value="tips" className="gap-2 px-4">
          <Lightbulb className="h-3.5 w-3.5" />
          Tips
          {tips.length + resources.length > 0 && (
            <span className="bg-primary/10 text-primary rounded-full px-1.5 text-[10px] font-semibold tabular-nums">
              {tips.length + resources.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="task" className="mt-4">
        <Card className="gap-0 py-0">
          <div className="flex flex-col gap-6 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <TaskSectionTitle icon={FileText}>Instructions</TaskSectionTitle>
              {suggestEdits}
            </div>

            {task.detailed_instructions ? (
              <TaskMarkdown className="-mt-4">
                {task.detailed_instructions}
              </TaskMarkdown>
            ) : (
              <p className="-mt-4 text-sm leading-relaxed">
                {task.description ||
                  "No detailed instructions have been added for this task yet."}
              </p>
            )}

            {objectives.length > 0 && (
              <section>
                <TaskSectionTitle icon={Target}>
                  What you will learn
                </TaskSectionTitle>
                <TaskObjectivesList items={objectives} />
              </section>
            )}
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="tips" className="mt-4">
        <Card className="gap-0 py-0">
          <div className="flex flex-col gap-6 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <TaskSectionTitle icon={Lightbulb}>Tips</TaskSectionTitle>
              {suggestEdits}
            </div>

            {tips.length > 0 ? (
              <ol className="-mt-4 space-y-3">
                {tips.map((tip, index) => (
                  <li key={index} className="border-primary/40 border-l-2 pl-4">
                    <p className="text-sm font-medium">{tip.title}</p>
                    <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                      {tip.content}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-muted-foreground -mt-4 text-sm leading-relaxed">
                No tips yet for this task. Ask your mentor if you get stuck.
              </p>
            )}

            {resources.length > 0 && (
              <section>
                <TaskSectionTitle icon={Link2}>Resources</TaskSectionTitle>
                <TaskResourceList items={resources} />
              </section>
            )}
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
