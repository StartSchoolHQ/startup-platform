"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import {
  createTeam,
  updateTeamDetailsV2,
  uploadTeamLogo,
} from "@/lib/database";
import { useAppContext } from "@/contexts/app-context";
import { Loader2, Wallet } from "lucide-react";
import { LogoUploadField } from "@/components/ui/logo-upload-field";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import posthog from "posthog-js";

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The RPC refuses a second team; say so before the form is filled. */
  alreadyInTeam?: boolean;
  onTeamCreated?: () => void;
}

const TEAM_CREATION_COST = 100;
// Name minimum dropped from 5 to 2 on 2026-10-12 (Sasha: "why not 4?").
const MIN_NAME = 2;
const MIN_DESCRIPTION = 20;
const MAX_DESCRIPTION = 100;

type Field = "name" | "description" | "website";
type FieldErrors = Partial<Record<Field, string>>;

function validate(name: string, description: string): FieldErrors {
  const errors: FieldErrors = {};
  if (name.trim().length < MIN_NAME) {
    errors.name = `Team name needs at least ${MIN_NAME} characters.`;
  }
  const d = description.trim().length;
  if (d < MIN_DESCRIPTION) {
    errors.description = `Description needs at least ${MIN_DESCRIPTION} characters (${d} so far).`;
  } else if (d > MAX_DESCRIPTION) {
    errors.description = `Description can be at most ${MAX_DESCRIPTION} characters (${d} now).`;
  }
  return errors;
}

/** Supabase errors are plain objects, not Error instances — read both. */
function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  return "Something went wrong on the server. Try again, or contact support if it keeps failing.";
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-destructive text-xs">
      {message}
    </p>
  );
}

export function CreateTeamDialog({
  open,
  onOpenChange,
  alreadyInTeam = false,
  onTeamCreated,
}: CreateTeamDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const { user, refreshUserData } = useAppContext();

  const balance = user?.team_points ?? 0;
  const canAfford = balance >= TEAM_CREATION_COST;
  const blocked = alreadyInTeam
    ? "You are already in a team. Leave it first to create another one."
    : !canAfford
      ? `Creating a team costs ${TEAM_CREATION_COST} Team Points and you have ${balance}.`
      : null;

  const clearError = (field: Field) =>
    setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));

  const reset = () => {
    setName("");
    setDescription("");
    setWebsite("");
    setLogoFile(null);
    setErrors({});
    setFormError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || blocked) return;
    setFormError("");

    const fieldErrors = validate(name, description);
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      const result = await createTeam(user.id, name.trim(), description.trim());

      const teamId = result?.id;
      if (teamId && (logoFile || website.trim())) {
        let logoUrl: string | undefined;
        if (logoFile) logoUrl = await uploadTeamLogo(teamId, logoFile);
        await updateTeamDetailsV2(teamId, user.id, {
          ...(logoUrl ? { logo_url: logoUrl } : {}),
          ...(website.trim() ? { website: website.trim() } : {}),
        });
      }

      posthog.capture("team_created", {
        team_name: name,
        description_length: description.length,
        cost: TEAM_CREATION_COST,
        user_points_before: user.total_points,
        has_logo: !!logoFile,
      });

      toast.success(`Team "${name.trim()}" created`, {
        description: `${TEAM_CREATION_COST} Team Points spent.`,
      });
      reset();
      onOpenChange(false);
      refreshUserData();
      onTeamCreated?.();
    } catch (error) {
      console.error("Error creating team:", error);
      posthog.capture("team_creation_failed", {
        error_message: errorMessage(error),
        team_name: name,
      });
      setFormError(errorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Create a team</DialogTitle>
          <DialogDescription>
            Start a product team and invite others to build with you. It costs{" "}
            {TEAM_CREATION_COST} Team Points.
          </DialogDescription>
        </DialogHeader>

        {(blocked || formError) && (
          <div
            role="alert"
            className="bg-destructive/10 border-destructive/20 text-destructive rounded-lg border p-3 text-sm"
          >
            {blocked ?? formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="teamName">Team name</Label>
            <Input
              id="teamName"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearError("name");
              }}
              placeholder="What is the team called?"
              disabled={isLoading || !!blocked}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "teamName-error" : undefined}
              className={cn(errors.name && "border-destructive")}
            />
            <FieldError id="teamName-error" message={errors.name} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Description</Label>
              <span className="text-muted-foreground text-xs tabular-nums">
                {description.trim().length}/{MAX_DESCRIPTION}
              </span>
            </div>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                clearError("description");
              }}
              placeholder="One or two sentences on the product idea or the team's mission."
              rows={3}
              disabled={isLoading || !!blocked}
              aria-invalid={!!errors.description}
              aria-describedby={
                errors.description ? "description-error" : undefined
              }
              className={cn(errors.description && "border-destructive")}
            />
            <FieldError id="description-error" message={errors.description} />
          </div>

          <LogoUploadField
            teamName={name}
            onFileSelect={setLogoFile}
            disabled={isLoading || !!blocked}
          />

          <div className="space-y-2">
            <Label htmlFor="website">Website (optional)</Label>
            <Input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="example.com"
              disabled={isLoading || !!blocked}
            />
          </div>

          <div className="bg-muted/40 flex items-center justify-between rounded-lg px-3 py-2 text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <Wallet className="text-primary h-4 w-4" />
              Your balance
            </span>
            <span
              className={cn(
                "font-semibold tabular-nums",
                !canAfford && "text-destructive"
              )}
            >
              {balance.toLocaleString()} Team Points
            </span>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !!blocked}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating
                </>
              ) : (
                `Create team for ${TEAM_CREATION_COST} Team Points`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
