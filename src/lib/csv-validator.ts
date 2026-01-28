import { csvParse } from "d3-dsv";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[\p{L}\s'-]{2,50}$/u;

export interface CSVRow {
  email: string;
  first_name: string;
  last_name: string;
}

export interface ValidationError {
  row: number;
  field: string;
  error: string;
}

export function validateCSVRow(
  row: CSVRow,
  rowIndex: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate email
  if (!row.email || !row.email.trim()) {
    errors.push({
      row: rowIndex,
      field: "email",
      error: "Email is required",
    });
  } else if (!EMAIL_REGEX.test(row.email.trim())) {
    errors.push({
      row: rowIndex,
      field: "email",
      error: "Invalid email format",
    });
  }

  // Validate first_name
  if (!row.first_name || !row.first_name.trim()) {
    errors.push({
      row: rowIndex,
      field: "first_name",
      error: "First name is required",
    });
  } else if (!NAME_REGEX.test(row.first_name.trim())) {
    errors.push({
      row: rowIndex,
      field: "first_name",
      error: "First name must be 2-50 characters, letters/spaces/hyphens only",
    });
  }

  // Validate last_name
  if (!row.last_name || !row.last_name.trim()) {
    errors.push({
      row: rowIndex,
      field: "last_name",
      error: "Last name is required",
    });
  } else if (!NAME_REGEX.test(row.last_name.trim())) {
    errors.push({
      row: rowIndex,
      field: "last_name",
      error: "Last name must be 2-50 characters, letters/spaces/hyphens only",
    });
  }

  return errors;
}

export function validateCSV(rows: CSVRow[]): ValidationError[] {
  const allErrors: ValidationError[] = [];

  rows.forEach((row, index) => {
    const errors = validateCSVRow(row, index + 1);
    allErrors.push(...errors);
  });

  return allErrors;
}

export function parseCSV(csvText: string): { data: CSVRow[]; error?: string } {
  try {
    // Parse CSV with proper quote/escape handling using d3-dsv
    const parsed = csvParse(csvText.trim());

    // Validate that we have data
    if (parsed.length === 0) {
      return {
        data: [],
        error: "CSV must contain header row and at least one data row",
      };
    }

    // Check for required columns (case-insensitive)
    const firstRow = parsed[0];
    const columns = Object.keys(firstRow).map((k) => k.toLowerCase());
    const requiredColumns = ["email", "first_name", "last_name"];
    const missingColumns = requiredColumns.filter(
      (col) => !columns.includes(col)
    );

    if (missingColumns.length > 0) {
      return {
        data: [],
        error: `Missing required columns: ${missingColumns.join(", ")}`,
      };
    }

    // Map to CSVRow format (handle case-insensitive column names)
    const data: CSVRow[] = parsed
      .map((row) => {
        // Create case-insensitive lookup
        const lowerRow: Record<string, string> = {};
        Object.keys(row).forEach((key) => {
          lowerRow[key.toLowerCase()] = row[key] || "";
        });

        return {
          email: lowerRow.email?.trim() || "",
          first_name: lowerRow.first_name?.trim() || "",
          last_name: lowerRow.last_name?.trim() || "",
        };
      })
      .filter((row) => row.email || row.first_name || row.last_name); // Skip completely empty rows

    return { data };
  } catch (error) {
    return {
      data: [],
      error: `Failed to parse CSV: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}
