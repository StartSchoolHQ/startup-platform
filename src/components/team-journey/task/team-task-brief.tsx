import { FileText, Lightbulb, Link2, ListChecks, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TaskMarkdown } from "@/components/tasks/task-markdown";
import {
  TaskObjectivesList,
  TaskResourceList,
  TaskSectionTitle,
} from "@/components/tasks/task-content-lists";
import { parseResources, parseStringList } from "@/lib/task-content";
import type { TeamTask } from "@/types/team-journey";

export function SuggestEditsButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
      onClick={onClick}
    >
      Suggest edits
    </Button>
  );
}

/** The Task tab: Markdown brief, what you will learn, deliverables. */
export function TeamTaskBrief({
  task,
  onSuggestEdits,
}: {
  task: TeamTask;
  onSuggestEdits: () => void;
}) {
  const objectives = parseStringList(task.learning_objectives);
  const deliverables = parseStringList(task.deliverables);
  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-6 p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <TaskSectionTitle icon={FileText}>Instructions</TaskSectionTitle>
          <SuggestEditsButton onClick={onSuggestEdits} />
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

        {deliverables.length > 0 && (
          <section>
            <TaskSectionTitle icon={ListChecks}>Deliverables</TaskSectionTitle>
            <TaskObjectivesList items={deliverables} />
          </section>
        )}
      </div>
    </Card>
  );
}

/** The Tips tab: mentor tips and resources, same as the solo task page. */
export function TeamTaskTips({
  task,
  onSuggestEdits,
}: {
  task: TeamTask;
  onSuggestEdits: () => void;
}) {
  const tips = Array.isArray(task.tips_content) ? task.tips_content : [];
  const resources = parseResources(task.resources);
  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-6 p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <TaskSectionTitle icon={Lightbulb}>Tips</TaskSectionTitle>
          <SuggestEditsButton onClick={onSuggestEdits} />
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
  );
}

export function tipsCount(task: TeamTask): number {
  const tips = Array.isArray(task.tips_content) ? task.tips_content.length : 0;
  return tips + parseResources(task.resources).length;
}
