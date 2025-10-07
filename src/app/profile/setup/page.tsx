"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "../../../components/ui/avatar";
import { Button } from "../../../components/ui/button";

export default function ProfileSetupPage() {
  const [name, setName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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

      // Update user profile in our users table
      const { error: updateError } = await supabase
        .from("users")
        .update({
          name: name.trim(),
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        setError("Failed to save profile. Please try again.");
        return;
      }

      // Redirect to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
            Complete Your Profile
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Please provide your details to get started
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded relative">
              {error}
            </div>
          )}

          {/* Avatar Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Profile Picture *
            </label>
            <div className="flex items-center space-x-4">
              <Avatar className="w-20 h-20">
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
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  disabled={loading}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG or GIF (max 5MB)
                </p>
              </div>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-foreground"
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
              className="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm placeholder:text-muted-foreground bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              disabled={loading}
            />
          </div>

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
