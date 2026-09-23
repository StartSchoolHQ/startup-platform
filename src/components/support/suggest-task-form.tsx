"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskSuggestionSchema } from "@/lib/validation-schemas";
import {
  SUGGESTION_DESCRIPTION_MAX,
  SUGGESTION_TITLE_MAX,
  mapSuggestTaskError,
} from "@/lib/task-suggestions";
import {
  useMyJourneyPhases,
  useSuggestTask,
} from "@/hooks/use-task-suggestion";

type Field = "achievementId" | "title" | "description";
type Errors = Partial<Record<Field, string>>;

const EMPTY = { achievementId: "", title: "", description: "" };

export function SuggestTaskForm() {
  const phases = useMyJourneyPhases();
  const suggest = useSuggestTask();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Errors>({});

  const update = (key: Field, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = TaskSuggestionSchema.safeParse(form);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as Field;
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    suggest.mutate(parsed.data, {
      onSuccess: () => {
        setForm(EMPTY);
        toast.success("Suggestion sent", {
          description: "We'll review it and add it to the library if it fits.",
        });
      },
      onError: (error) => {
        toast.error("Suggestion not sent", {
          description: mapSuggestTaskError(error),
        });
      },
    });
  };

  const busy = suggest.isPending;

  return (
    <Card className="gap-0 py-0 lg:col-span-2">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-5 sm:p-6">
        <div className="space-y-2">
          <Label htmlFor="phase">
            Phase you&apos;re suggesting for this task
          </Label>
          <Select
            value={form.achievementId}
            onValueChange={(v) => update("achievementId", v)}
            disabled={busy || phases.isLoading}
          >
            <SelectTrigger
              id="phase"
              className="w-full"
              aria-invalid={!!errors.achievementId}
            >
              <SelectValue
                placeholder={phases.isLoading ? "Loading…" : "Pick a phase"}
              />
            </SelectTrigger>
            <SelectContent>
              {(phases.data ?? []).map((phase) => (
                <SelectItem key={phase.id} value={phase.id}>
                  {phase.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.achievementId} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="suggest-title">Task title</Label>
            <span className="text-muted-foreground text-xs tabular-nums">
              {form.title.length}/{SUGGESTION_TITLE_MAX}
            </span>
          </div>
          <Input
            id="suggest-title"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="Read The Mom Test book"
            maxLength={SUGGESTION_TITLE_MAX}
            disabled={busy}
            aria-invalid={!!errors.title}
          />
          <p className="text-muted-foreground text-xs">
            Start with a verb and keep it under ten words.
          </p>
          <FieldError message={errors.title} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="suggest-description">Short description</Label>
            <span className="text-muted-foreground text-xs tabular-nums">
              {form.description.length}/{SUGGESTION_DESCRIPTION_MAX}
            </span>
          </div>
          <Textarea
            id="suggest-description"
            value={form.description}
            onChange={(e) => {
              if (e.target.value.length <= SUGGESTION_DESCRIPTION_MAX)
                update("description", e.target.value);
            }}
            className="min-h-[120px] resize-y"
            disabled={busy}
            aria-invalid={!!errors.description}
          />
          <p className="text-muted-foreground text-xs">
            1–2 sentences. This is what appears on the task card. Say what the
            student does and why it matters.
          </p>
          <FieldError message={errors.description} />
        </div>

        <div className="flex items-center justify-end gap-3 border-t pt-5">
          <Button type="submit" disabled={busy || phases.isError}>
            <Send className="h-4 w-4" />
            {busy ? "Sending…" : "Send suggestion"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-center gap-1.5 text-xs text-red-600">
      <AlertCircle className="h-3.5 w-3.5" />
      {message}
    </p>
  );
}
