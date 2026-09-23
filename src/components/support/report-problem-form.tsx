"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Send } from "lucide-react";
import { PriorityPicker } from "@/components/support/priority-picker";
import { AttachmentsField } from "@/components/support/attachments-field";
import { useReportProblemForm } from "@/components/support/use-report-problem-form";

const CATEGORIES = [
  "Bug Report",
  "Feature Request",
  "Technical Issue",
  "Account Problem",
  "Performance Issue",
  "UI/UX Issue",
  "Other",
];

export function ReportProblemForm() {
  const {
    ticket,
    update,
    addFiles,
    removeAttachment,
    handleSubmit,
    isSubmitting,
    formError,
  } = useReportProblemForm();

  return (
    <Card className="gap-0 py-0 lg:col-span-2">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Priority</Label>
            <PriorityPicker
              value={ticket.priority}
              onChange={(v) => update("priority", v)}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={ticket.category}
              onValueChange={(v) => update("category", v)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="category" className="w-full">
                <SelectValue placeholder="Pick one" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="title">Title</Label>
            <span className="text-muted-foreground text-xs tabular-nums">
              {ticket.title.length}/100
            </span>
          </div>
          <Input
            id="title"
            value={ticket.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="One line: what's wrong?"
            maxLength={100}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="description">Description</Label>
            <span className="text-muted-foreground text-xs tabular-nums">
              {ticket.description.length}/1000
            </span>
          </div>
          <Textarea
            id="description"
            value={ticket.description}
            onChange={(e) => {
              if (e.target.value.length <= 1000) {
                update("description", e.target.value);
              }
            }}
            placeholder="What happened, where, and what you expected instead."
            className="min-h-[160px] resize-y"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Attachments</Label>
          <AttachmentsField
            files={ticket.attachments}
            onAdd={addFiles}
            onRemove={removeAttachment}
            disabled={isSubmitting}
          />
        </div>

        {formError && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-red-500/5 px-3 py-2 text-sm text-red-700 dark:text-red-400"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {formError}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 border-t pt-5">
          <Button type="submit" disabled={isSubmitting}>
            <Send className="h-4 w-4" />
            {isSubmitting ? "Sending…" : "Send ticket"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
