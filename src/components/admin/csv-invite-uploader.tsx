"use client";

import posthog from "posthog-js";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  parseCSV,
  validateCSV,
  type CSVRow,
  type ValidationError,
} from "@/lib/csv-validator";
import { Upload, X, AlertCircle, CheckCircle2 } from "lucide-react";

interface InvitationResult {
  email: string;
  success: boolean;
  message: string;
  error?: string;
}

export function CSVInviteUploader() {
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<InvitationResult[] | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { data, error } = parseCSV(text);

      if (error) {
        toast.error(error);
        return;
      }

      setCsvData(data);
      const errors = validateCSV(data);
      setValidationErrors(errors);

      if (errors.length === 0) {
        toast.success(`${data.length} rows ready to send`);
      } else {
        toast.error(`Found ${errors.length} errors. Fix them before sending.`);
      }
    };

    reader.readAsText(file);
  };

  const handleSendInvitations = async () => {
    if (validationErrors.length > 0) {
      toast.error("Fix validation errors first");
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const response = await fetch("/api/admin/bulk-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitations: csvData }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send invitations");
      }

      setResults(data.results);

      posthog.capture("bulk_invitations_sent", {
        total_invitations: csvData.length,
        succeeded: data.summary.succeeded,
        failed: data.summary.failed,
      });

      toast.success(
        `${data.summary.succeeded} succeeded, ${data.summary.failed} failed`
      );

      if (data.summary.succeeded > 0) {
        setCsvData([]);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send invitations"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setCsvData([]);
    setValidationErrors([]);
    setResults(null);
  };

  return (
    <div className="space-y-4">
      {/* File Upload */}
      {csvData.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div className="mt-4">
            <label htmlFor="csv-upload" className="cursor-pointer">
              <span className="text-primary hover:text-primary/80 text-sm font-medium">
                Upload CSV file
              </span>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
            <p className="text-muted-foreground mt-2 text-xs">
              CSV must have columns: email, first_name, last_name
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Preview Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">
                {csvData.length} {csvData.length === 1 ? "user" : "users"} ready
              </h3>
              {validationErrors.length > 0 && (
                <p className="text-destructive flex items-center gap-1 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {validationErrors.length} validation errors
                </p>
              )}
              {validationErrors.length === 0 && (
                <p className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  All rows valid
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleClear}>
              <X className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-destructive/10 border-destructive/20 rounded-lg border p-4">
              <h4 className="mb-2 text-sm font-semibold">Validation Errors:</h4>
              <ul className="space-y-1 text-sm">
                {validationErrors.slice(0, 10).map((err, idx) => (
                  <li key={idx} className="text-destructive">
                    Row {err.row}: {err.field} - {err.error}
                  </li>
                ))}
                {validationErrors.length > 10 && (
                  <li className="text-muted-foreground">
                    ... and {validationErrors.length - 10} more errors
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Preview Table */}
          <div className="overflow-hidden rounded-lg border">
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">#</th>
                    <th className="px-4 py-2 text-left font-medium">Email</th>
                    <th className="px-4 py-2 text-left font-medium">
                      First Name
                    </th>
                    <th className="px-4 py-2 text-left font-medium">
                      Last Name
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {csvData.map((row, idx) => {
                    const rowErrors = validationErrors.filter(
                      (e) => e.row === idx + 1
                    );
                    return (
                      <tr
                        key={idx}
                        className={
                          rowErrors.length > 0 ? "bg-destructive/10" : ""
                        }
                      >
                        <td className="border-t px-4 py-2">{idx + 1}</td>
                        <td className="border-t px-4 py-2">{row.email}</td>
                        <td className="border-t px-4 py-2">{row.first_name}</td>
                        <td className="border-t px-4 py-2">{row.last_name}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="text-muted-foreground py-4 text-center text-sm">
              Sending invitations...
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="space-y-3">
              {/* Success Summary */}
              {results.some((r) => r.success) && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <p className="mb-2 text-sm font-semibold text-green-800">
                    <CheckCircle2 className="mr-1 inline h-4 w-4" />
                    Successfully invited (
                    {results.filter((r) => r.success).length})
                  </p>
                  <ul className="space-y-1 text-sm text-green-700">
                    {results
                      .filter((r) => r.success)
                      .map((result, idx) => (
                        <li key={idx}>✓ {result.email}</li>
                      ))}
                  </ul>
                </div>
              )}

              {/* Failed Summary */}
              {results.some((r) => !r.success) && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="mb-2 text-sm font-semibold text-red-800">
                    <AlertCircle className="mr-1 inline h-4 w-4" />
                    Failed to invite ({results.filter((r) => !r.success).length}
                    )
                  </p>
                  <ul className="space-y-1 text-sm text-red-700">
                    {results
                      .filter((r) => !r.success)
                      .map((result, idx) => (
                        <li key={idx}>
                          ✗ {result.email}:{" "}
                          <span className="font-medium">{result.error}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Send Button */}
          <Button
            onClick={handleSendInvitations}
            disabled={loading || validationErrors.length > 0}
            className="w-full"
          >
            {loading ? "Sending..." : `Send ${csvData.length} Invitations`}
          </Button>
        </>
      )}
    </div>
  );
}
