"use client";

import { StudentDiplomaCard } from "@/components/diplomas/student-diploma-card";
import { ProfileCard } from "@/components/account/profile-card";
import { PasswordCard } from "@/components/account/password-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
}

export default function AccountPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const router = useRouter();

  const loadUserProfile = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !authUser) {
        router.push("/login");
        return;
      }

      const { data: userProfile, error: profileError } = await supabase
        .from("users")
        .select("id, name, email, avatar_url")
        .eq("id", authUser.id)
        .single();

      if (profileError || !userProfile) {
        toast.error("Failed to load user profile");
        return;
      }

      setUser(userProfile);
      setName(userProfile.name || "");
      setAvatarPreview(userProfile.avatar_url);
    } catch (error) {
      console.error("Error loading user profile:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setProfileError("That image is over 5MB. Pick a smaller one.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setProfileError("That file isn't an image. Use JPG, PNG or GIF.");
      return;
    }
    setProfileError(null);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setProfileError("Your name can't be empty.");
      return;
    }

    setSaving(true);
    setProfileError(null);
    try {
      const supabase = createClient();
      let avatarUrl = user?.avatar_url;

      if (avatarFile && user) {
        const fileExtension = avatarFile.name.split(".").pop();
        const avatarFileName = `${user.id}/avatar-${Date.now()}.${fileExtension}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(avatarFileName, avatarFile, {
            cacheControl: "3600",
            upsert: true,
          });
        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error(
            `Failed to upload profile picture: ${uploadError.message}`
          );
          return;
        }
        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(uploadData.path);
        avatarUrl = publicUrl;
      }

      type UpdateProfileResponse = { success: boolean; error?: string };
      const { data: rpcData, error: updateError } = (await supabase.rpc(
        "update_user_profile",
        { p_name: name.trim(), p_avatar_url: avatarUrl ?? undefined }
      )) as {
        data: UpdateProfileResponse | null;
        error: PostgrestError | null;
      };

      if (updateError || !rpcData?.success) {
        toast.error(
          rpcData?.error || "Failed to save profile. Please try again."
        );
        return;
      }

      toast.success("Profile saved");
      setAvatarFile(null);
      await loadUserProfile();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError("The two passwords don't match.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Use at least 8 characters.");
      return;
    }

    setSaving(true);
    setPasswordError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Password updated");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
          </div>
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="border-red-500/20">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <AlertCircle className="text-muted-foreground mb-3 h-10 w-10" />
          <p className="text-muted-foreground mb-4 text-sm">
            Couldn&apos;t load your profile.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true);
              loadUserProfile();
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Account
        </h1>
        <p className="text-muted-foreground text-sm">
          Your photo, name and password.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ProfileCard
            email={user.email}
            name={name}
            onNameChange={(v) => {
              setName(v);
              if (profileError) setProfileError(null);
            }}
            avatarPreview={avatarPreview}
            onAvatarChange={handleAvatarChange}
            hasPendingAvatar={!!avatarFile}
            saving={saving}
            error={profileError}
            onSubmit={handleProfileUpdate}
          />
          <PasswordCard
            password={newPassword}
            confirmPassword={confirmPassword}
            onPasswordChange={(v) => {
              setNewPassword(v);
              if (passwordError) setPasswordError(null);
            }}
            onConfirmPasswordChange={(v) => {
              setConfirmPassword(v);
              if (passwordError) setPasswordError(null);
            }}
            saving={saving}
            error={passwordError}
            onSubmit={handlePasswordUpdate}
          />
        </div>
        <div className="self-start">
          <StudentDiplomaCard userId={user.id} />
        </div>
      </div>
    </div>
  );
}
