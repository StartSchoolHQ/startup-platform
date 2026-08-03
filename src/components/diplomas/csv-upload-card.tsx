"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CsvUploadCardProps {
  title: string;
  description: string;
  /** Parse the raw CSV text; return an error string or a row count + upload fn. */
  onFile: (text: string) => { error?: string; summary?: string } | void;
  isPending: boolean;
  resultNote?: string | null;
}

export function CsvUploadCard({
  title,
  description,
  onFile,
  isPending,
  resultNote,
}: CsvUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setParseError(null);
      setSummary(null);
      const result = onFile(text);
      if (result?.error) setParseError(result.error);
      else if (result?.summary) setSummary(result.summary);
    };
    reader.readAsText(file);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          {isPending ? "Uploading…" : "Choose CSV file"}
        </Button>
        {parseError && <p className="text-destructive text-sm">{parseError}</p>}
        {summary && <p className="text-muted-foreground text-sm">{summary}</p>}
        {resultNote && (
          <p className="text-muted-foreground text-sm">{resultNote}</p>
        )}
      </CardContent>
    </Card>
  );
}
