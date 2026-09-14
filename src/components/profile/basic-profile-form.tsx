"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import posthog from "posthog-js";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { SETUP_INPUT_CLASS, SETUP_SUBMIT_CLASS } from "./setup-shell";

interface BasicProfileFormProps {
  initialName: string;
  namePrefilled: boolean;
  onError: (message: string | null) => void;
  onDone: () => void;
}

/** Step 1 of profile setup: display name + mandatory avatar upload. */
export function BasicProfileForm({
  initialName,
  namePrefilled,
  onError,
  onDone,
}: BasicProfileFormProps) {
  const [name, setName] = useState(initialName);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      onError("File too large — maximum is 5MB. Choose a smaller image.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      onError("Please select an image file (JPG, PNG or GIF).");
      return;
    }
    onError(null);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return onError("Full name is required");
    if (!avatarFile) return onError("Profile picture is required");

    setLoading(true);
    onError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        onError("Authentication error. Please sign in again.");
        return;
      }

      const ext = avatarFile.name.split(".").pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { data: upload, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { cacheControl: "3600", upsert: true });
      if (uploadError) {
        onError(`Failed to upload profile picture: ${uploadError.message}`);
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(upload.path);

      const response = await fetch("/api/profile/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), avatarUrl: publicUrl }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        onError(body.error || "Failed to save profile. Please try again.");
        return;
      }

      posthog.capture("user_profile_setup_completed", {
        has_avatar: true,
        name_prefilled: namePrefilled,
      });
      onDone();
    } catch {
      onError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-zinc-100">
          Profile Picture *
        </Label>
        <div className="flex items-center space-x-4">
          <Avatar className="h-20 w-20 border-2 border-zinc-700">
            {avatarPreview ? (
              <AvatarImage
                src={avatarPreview}
                alt="Profile preview"
                className="object-cover"
              />
            ) : (
              <AvatarFallback className="bg-zinc-800 text-xs text-zinc-500">
                No image
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              disabled={loading}
              required
              className="block w-full text-sm text-zinc-400 file:mr-4 file:rounded-full file:border-0 file:bg-[#ff78c8]/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#ff78c8] hover:file:bg-[#ff78c8]/20"
            />
            <p className="mt-1 text-xs text-zinc-500">
              JPG, PNG or GIF (max 5MB)
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium text-zinc-100">
          Full Name *
        </Label>
        <Input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your full name"
          disabled={loading}
          className={SETUP_INPUT_CLASS}
        />
        {namePrefilled && (
          <p className="text-xs text-zinc-500">
            Pre-filled from your account — you can edit it
          </p>
        )}
      </div>

      <Button type="submit" disabled={loading} className={SETUP_SUBMIT_CLASS}>
        <span className="relative z-10 flex items-center justify-center gap-2">
          {loading && <Loader2 className="h-5 w-5 animate-spin" />}
          {loading ? "Saving…" : "Continue"}
        </span>
      </Button>
    </form>
  );
}
