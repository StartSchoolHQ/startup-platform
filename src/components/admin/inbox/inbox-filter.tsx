"use client";

import { Button } from "@/components/ui/button";

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** Same look as the existing suggestions filter: small buttons, default = active. */
export function InboxFilter<T extends string>({
  options,
  value,
  onChange,
}: Props<T>) {
  return (
    <div className="flex gap-2">
      {options.map((option) => (
        <Button
          key={option.value}
          variant={option.value === value ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
