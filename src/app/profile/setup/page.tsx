"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "../../../lib/supabase/client";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "../../../components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { PasswordInput } from "../../../components/ui/password-input";
import { AlertCircle, Loader2, X } from "lucide-react";
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
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0000dd] p-4">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="relative z-10 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#ff78c8]/30 border-t-[#ff78c8]"></div>
          <p className="mt-4 text-sm font-medium text-white/70">
            Validating access...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0000dd] p-4">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[size:24px_24px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="border-zinc-800/50 bg-zinc-900/80 shadow-2xl backdrop-blur-xl">
          <CardHeader className="pb-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <CardTitle className="text-2xl font-bold text-[#ff78c8]">
                Complete Your Profile
              </CardTitle>
              <CardDescription className="mt-2 text-zinc-400">
                Please provide your details to get started
              </CardDescription>
            </motion.div>
          </CardHeader>

          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: 0 }}
                  animate={{
                    opacity: 1,
                    x: [0, -10, 10, -10, 10, 0],
                  }}
                  transition={{
                    x: { duration: 0.4, times: [0, 0.2, 0.4, 0.6, 0.8, 1] },
                    opacity: { duration: 0.2 },
                  }}
                  className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/20 px-4 py-3 text-sm text-red-400"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                  <span className="flex-1">{error}</span>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="mt-0.5 flex-shrink-0 text-red-400 transition-colors hover:text-red-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              )}

              {/* Avatar Upload */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="space-y-2"
              >
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
                      className="block w-full text-sm text-zinc-400 file:mr-4 file:rounded-full file:border-0 file:bg-[#ff78c8]/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#ff78c8] hover:file:bg-[#ff78c8]/20"
                      disabled={loading}
                      required
                    />
                    <p className="mt-1 text-xs text-zinc-500">
                      JPG, PNG or GIF (max 5MB)
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Full Name */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="space-y-2"
              >
                <Label
                  htmlFor="name"
                  className="text-sm font-medium text-zinc-100"
                >
                  Full Name *
                </Label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  disabled={loading || isNamePrefilled}
                  className={`border-zinc-600 bg-zinc-800 text-zinc-100 transition-all duration-200 placeholder:text-zinc-400 focus:border-[#ff78c8] focus:bg-zinc-700/50 focus:ring-[#ff78c8]/30 ${
                    isNamePrefilled ? "cursor-not-allowed opacity-60" : ""
                  }`}
                />
                {isNamePrefilled && (
                  <p className="text-xs text-zinc-500">
                    Name pre-filled from invitation
                  </p>
                )}
              </motion.div>

              {/* Password */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
              >
                <PasswordInput
                  password={password}
                  confirmPassword={confirmPassword}
                  onPasswordChange={setPassword}
                  onConfirmPasswordChange={setConfirmPassword}
                  disabled={loading}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <Button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full overflow-hidden rounded-lg bg-[#ff78c8] py-6 text-base font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:bg-[#ff60b8] hover:shadow-xl hover:shadow-[#ff78c8]/25 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                    {loading ? "Setting up your profile..." : "Complete Setup"}
                  </span>
                </Button>
              </motion.div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
