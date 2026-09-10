"use client";

import { AlertCircle, Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionLabel } from "@/components/dashboard/my-journey/section-label";
import { UserRound } from "lucide-react";

function initials(name: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface ProfileCardProps {
  email: string;
  name: string;
  onNameChange: (value: string) => void;
  avatarPreview: string | null;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hasPendingAvatar: boolean;
  saving: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
}

/** Avatar + display name. Email is shown but changed elsewhere. */
export function ProfileCard({
  email,
  name,
  onNameChange,
  avatarPreview,
  onAvatarChange,
  hasPendingAvatar,
  saving,
  error,
  onSubmit,
}: ProfileCardProps) {
  return (
    <Card className="relative gap-0 overflow-hidden py-0">
      <div
        aria-hidden
        className="bg-primary/15 pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full blur-3xl"
      />
      <form
        onSubmit={onSubmit}
        className="relative flex flex-col gap-6 p-5 sm:p-6"
      >
        <SectionLabel icon={UserRound} title="Profile" />

        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={avatarPreview || undefined}
                alt={name || "You"}
                className="object-cover"
              />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {initials(name)}
              </AvatarFallback>
            </Avatar>
            <label
              htmlFor="avatar-upload"
              className="bg-primary text-primary-foreground hover:bg-primary/90 absolute -right-1 -bottom-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full shadow-sm transition-colors"
              aria-label="Change photo"
            >
              <Camera className="h-4 w-4" />
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={onAvatarChange}
              className="hidden"
              disabled={saving}
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{name || "—"}</p>
            <p className="text-muted-foreground truncate text-sm">{email}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {hasPendingAvatar
                ? "New photo selected — save to apply."
                : "JPG, PNG or GIF, up to 5MB."}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Your name"
              disabled={saving}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} disabled />
            <p className="text-muted-foreground text-xs">
              Changed through the team, not here.
            </p>
          </div>
        </div>

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
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
