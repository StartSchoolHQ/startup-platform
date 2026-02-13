"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "../../../components/ui/avatar";
import { Button } from "../../../components/ui/button";
import { PasswordInput } from "../../../components/ui/password-input";
import posthog from "posthog-js";

export default function ProfileSetupPage() {
  const [name, setName] = useState("");
  const [isNamePrefilled, setIsNamePrefilled] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const router = useRouter();

  // Validate access to this page
  useEffect(() => {
    const validateAccess = async () => {
      const supabase = createClient();

      // If there's a hash token in URL (password reset/recovery), let Supabase process it first
      if (
        typeof window !== "undefined" &&
        window.location.hash.includes("access_token")
      ) {
        // Wait for Supabase client to process the hash token
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Check if user is authenticated
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        // Only redirect if there's no hash token (otherwise Supabase is still processing it)
        if (
          typeof window === "undefined" ||
          !window.location.hash.includes("access_token")
        ) {
          router.push("/login");
        }
        return;
      }

      // Check if user has pre-filled name from invitation
      const metadata = user.user_metadata || {};
      if (metadata.first_name && metadata.last_name) {
        const fullName = `${metadata.first_name} ${metadata.last_name}`;
        setName(fullName);
        setIsNamePrefilled(true);
      }

      setIsValidating(false);
    };

    validateAccess();
  }, [router]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB");
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }

      setError(null);
      setAvatarFile(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Full name is required");
      return;
    }

    if (!avatarFile) {
      setError("Profile picture is required");
      return;
    }

    if (!password.trim()) {
      setError("Password is required");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        setError("Authentication error. Please try logging in again.");
        return;
      }

      // Skip existing profile check to avoid RLS issues
      // Just proceed with profile creation/update

      // Upload avatar to Supabase Storage with user folder structure
      const fileExtension = avatarFile.name.split(".").pop();
      const avatarFileName = `${user.id}/avatar-${Date.now()}.${fileExtension}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(avatarFileName, avatarFile, {
          cacheControl: "3600",
          upsert: true, // Allow overwriting existing files
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        setError(`Failed to upload profile picture: ${uploadError.message}`);
        return;
      }

      // Get public URL for the uploaded avatar
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(uploadData.path);

      // Update user password in Supabase Auth
      const { error: passwordError } = await supabase.auth.updateUser({
        password: password,
      });

      if (passwordError) {
        setError(
          passwordError.message || "Failed to set password. Please try again."
        );
        return;
      }

      // Create or update user profile via API route
      const response = await fetch("/api/profile/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          avatarUrl: publicUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(
          errorData.error || "Failed to save profile. Please try again."
        );
        return;
      }

      // Track successful profile setup
      posthog.capture("user_profile_setup_completed", {
        has_avatar: true,
        name_prefilled: isNamePrefilled,
      });

      // Redirect to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Show loading while validating access
  if (isValidating) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Validating access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="text-foreground mt-6 text-center text-3xl font-extrabold">
            Complete Your Profile
          </h2>
          <p className="text-muted-foreground mt-2 text-center text-sm">
            Please provide your details to get started
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-destructive/10 border-destructive/20 text-destructive relative rounded border px-4 py-3">
              {error}
            </div>
          )}

          {/* Avatar Upload */}
          <div className="space-y-2">
            <label className="text-foreground block text-sm font-medium">
              Profile Picture *
            </label>
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                {avatarPreview ? (
                  <AvatarImage
                    src={avatarPreview}
                    alt="Profile preview"
                    className="object-cover"
                  />
                ) : (
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                    No image
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="text-muted-foreground file:bg-primary/10 file:text-primary hover:file:bg-primary/20 block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:px-4 file:py-2 file:text-sm file:font-semibold"
                  disabled={loading}
                  required
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  JPG, PNG or GIF (max 5MB)
                </p>
              </div>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label
              htmlFor="name"
              className="text-foreground block text-sm font-medium"
            >
              Full Name *
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              disabled={loading || isNamePrefilled}
              className={`border-input placeholder:text-muted-foreground bg-background text-foreground focus:ring-ring focus:border-ring mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:ring-2 focus:outline-none ${
                isNamePrefilled ? "bg-muted cursor-not-allowed" : ""
              }`}
            />
            {isNamePrefilled && (
              <p className="text-muted-foreground mt-1 text-xs">
                ✓ Name pre-filled from invitation
              </p>
            )}
          </div>

          {/* Password */}
          <PasswordInput
            password={password}
            confirmPassword={confirmPassword}
            onPasswordChange={setPassword}
            onConfirmPasswordChange={setConfirmPassword}
            disabled={loading}
          />

          <div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Setting up your profile..." : "Complete Setup"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
