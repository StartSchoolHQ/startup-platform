"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AgreementFormProps {
  agreementType: "full" | "partial";
  /** Override for unit tests / Storybook. Defaults to the real API call. */
  onSubmitOverride?: (
    input: SubmitFormInput
  ) => Promise<{ redirect_url: string }>;
}

interface SubmitFormInput {
  agreement_type: "full" | "partial";
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

const FIELD_LABELS: Record<keyof Omit<FieldErrors, "global">, string> = {
  email: "email",
  confirm_email: "confirm_email",
  phone: "phone",
  address: "address",
};

async function defaultSubmit(input: SubmitFormInput) {
  const res = await fetch("/api/agreements/submit-form", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const fieldErrors: FieldErrors = {};
    if (body?.details?.fieldErrors) {
      for (const field of Object.keys(FIELD_LABELS)) {
        const issues = body.details.fieldErrors[field] as string[] | undefined;
        if (issues?.[0]) {
          fieldErrors[field as keyof typeof FIELD_LABELS] = issues[0];
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
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Continuing…" : "Continue to identity check"}
      </Button>
      <p className="text-center text-xs text-zinc-500">
        You&apos;ll be redirected to Dokobit to confirm your identity with
        Smart-ID, eParaksts Mobile, or your ID card.
      </p>
    </form>
  );
}

interface FormFieldProps {
  id: keyof Omit<FieldErrors, "global">;
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
