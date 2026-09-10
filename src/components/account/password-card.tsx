"use client";

import { AlertCircle, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { SectionLabel } from "@/components/dashboard/my-journey/section-label";

interface PasswordCardProps {
  password: string;
  confirmPassword: string;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  saving: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
}

export function PasswordCard({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  saving,
  error,
  onSubmit,
}: PasswordCardProps) {
  return (
    <Card className="gap-0 py-0">
      <form onSubmit={onSubmit} className="flex flex-col gap-6 p-5 sm:p-6">
        <SectionLabel icon={KeyRound} title="Password" />

        <PasswordInput
          password={password}
          confirmPassword={confirmPassword}
          onPasswordChange={onPasswordChange}
          onConfirmPasswordChange={onConfirmPasswordChange}
          disabled={saving}
        />

        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-red-500/5 px-3 py-2 text-sm text-red-700 dark:text-red-400"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <div className="flex justify-end border-t pt-5">
          <Button type="submit" variant="outline" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Updating…" : "Update password"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
