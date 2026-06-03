"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SupportedEidMethods } from "./SupportedEidMethods";

type AgreementType = "full" | "partial";

interface AgreementFormProps {
  agreementType: AgreementType;
  /** Override for unit tests / Storybook. Defaults to the real API call. */
  onSubmitOverride?: (
    input: SubmitFormInput
  ) => Promise<{ redirect_url: string }>;
}

interface SubmitFormInput {
  agreement_type: AgreementType;
  email: string;
  confirm_email: string;
  phone: string;
  address: string;
  language: "en";
}

interface FieldErrors {
  email?: string;
  confirm_email?: string;
  phone?: string;
  address?: string;
  global?: string;
}

const TEXT_FIELDS = ["email", "confirm_email", "phone", "address"] as const;
type TextFieldId = (typeof TEXT_FIELDS)[number];

async function defaultSubmit(input: SubmitFormInput) {
  // Forward the current URL's query string to the API so dev-mode
  // `?mock=<scenario>` reaches the route. No-op in prod (the route
  // only reads `mock` when DOKOBIT_IDENTITY_MOCK=true).
  const qs = typeof window !== "undefined" ? window.location.search : "";
  const res = await fetch(`/api/agreements/submit-form${qs}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const fieldErrors: FieldErrors = {};
    if (body?.details?.fieldErrors) {
      for (const field of TEXT_FIELDS) {
        const issues = body.details.fieldErrors[field] as string[] | undefined;
        if (issues?.[0]) {
          fieldErrors[field] = issues[0];
        }
      }
    }
    throw Object.assign(new Error(body?.error ?? "submit_failed"), {
      fieldErrors,
    });
  }
  return res.json() as Promise<{ redirect_url: string }>;
}

/**
 * Public-facing scholarship form. Captures email (typed twice to catch
 * typos), phone, and address — the only contact data not provided by
 * Dokobit eID. On submit, posts to /api/agreements/submit-form, then
 * navigates the browser to the Dokobit hosted-auth URL.
 */
export function AgreementForm({
  agreementType,
  onSubmitOverride,
}: AgreementFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  function clearError(field: keyof FieldErrors) {
    if (errors[field]) {
      setErrors((cur) => {
        const next = { ...cur };
        delete next[field];
        return next;
      });
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const confirm_email = String(fd.get("confirm_email") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const address = String(fd.get("address") ?? "").trim();

    if (email !== confirm_email) {
      setErrors({ confirm_email: "Emails do not match" });
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const submitter = onSubmitOverride ?? defaultSubmit;
      const { redirect_url } = await submitter({
        agreement_type: agreementType,
        email,
        confirm_email,
        phone,
        address,
        language: "en",
      });
      window.location.href = redirect_url;
    } catch (err) {
      const fieldErrors = (err as { fieldErrors?: FieldErrors }).fieldErrors;
      if (fieldErrors && Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
      } else {
        toast.error(
          err instanceof Error ? err.message : "Failed to submit the form"
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <FormField
        id="email"
        label="Email address"
        type="email"
        autoComplete="email"
        required
        error={errors.email}
        onChange={() => clearError("email")}
      />
      <FormField
        id="confirm_email"
        label="Confirm email"
        type="email"
        autoComplete="email"
        required
        error={errors.confirm_email}
        onChange={() => clearError("confirm_email")}
      />
      <FormField
        id="phone"
        label="Phone number"
        type="tel"
        placeholder="+371 20000000"
        autoComplete="tel"
        required
        error={errors.phone}
        onChange={() => clearError("phone")}
      />
      <FormField
        id="address"
        label="Address"
        type="text"
        placeholder="Brīvības iela 1, Rīga, LV-1010"
        autoComplete="street-address"
        required
        error={errors.address}
        onChange={() => clearError("address")}
      />
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        By continuing you confirm that you have read the{" "}
        <a
          href="/privacy/scholarship-agreement"
          className="underline underline-offset-4"
        >
          Scholarship Privacy Notice
        </a>{" "}
        and understand that StartSchool will process your contact details and
        the identity data returned by Dokobit to form this agreement.
      </p>
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Continuing…" : "Continue to identity check"}
      </Button>
      <SupportedEidMethods />
    </form>
  );
}

interface FormFieldProps {
  id: TextFieldId;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
  onChange?: () => void;
}

function FormField({
  id,
  label,
  type,
  required,
  placeholder,
  autoComplete,
  error,
  onChange,
}: FormFieldProps) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          "mt-1",
          error && "border-rose-500 focus-visible:ring-rose-500/30"
        )}
        onChange={onChange}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
