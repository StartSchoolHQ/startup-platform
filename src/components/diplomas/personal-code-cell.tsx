"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useUpdateStudent } from "./use-diplomas";

export function PersonalCodeCell({
  userId,
  value,
}: {
  userId: string;
  value: string | null;
}) {
  const updateStudent = useUpdateStudent();
  const [draft, setDraft] = useState(value ?? "");

  function save() {
    const trimmed = draft.trim();
    if (trimmed === (value ?? "")) return;
    updateStudent.mutate({
      user_id: userId,
      personal_code: trimmed === "" ? null : trimmed,
    });
  }

  return (
    <Input
      value={draft}
      placeholder="ddmmyy-xxxxx"
      className="h-8 w-32 text-xs"
      disabled={updateStudent.isPending}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}
