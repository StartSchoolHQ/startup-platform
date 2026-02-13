"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import { ArrowLeft, Camera, Save } from "lucide-react";
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
  const [validationError, setValidationError] = useState<string | null>(null);

  // Profile form state
  const [name, setName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Password form state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const router = useRouter();

  const loadUserProfile = useCallback(async () => {
    try {
      const supabase = createClient();

      // Get current authenticated user
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !authUser) {
        router.push("/login");
        return;
      }

      // Get user profile from our users table
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
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setValidationError("File size must be less than 5MB");
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setValidationError("Please select an image file");
        return;
      }

      setValidationError(null);
      setAvatarFile(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setValidationError("Full name is required");
      return;
    }

    setSaving(true);
    setValidationError(null);

    try {
      const supabase = createClient();

      let avatarUrl = user?.avatar_url;

      // Upload new avatar if selected
      if (avatarFile && user) {
        const fileExtension = avatarFile.name.split(".").pop();
        const avatarFileName = `${
          user.id
        }/avatar-${Date.now()}.${fileExtension}`;

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

        // Get public URL for the uploaded avatar
        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(uploadData.path);

        avatarUrl = publicUrl;
      }

      // Update user profile via secure RPC function
      type UpdateProfileResponse = { success: boolean; error?: string };
      const { data: rpcData, error: updateError } =
        // @ts-expect-error - RPC function not in auto-generated types
        (await supabase.rpc("update_user_profile", {
          p_name: name.trim(),
          p_avatar_url: avatarUrl,
        })) as {
          data: UpdateProfileResponse | null;
          error: PostgrestError | null;
        };

      if (updateError || !rpcData?.success) {
        toast.error(
          rpcData?.error || "Failed to save profile. Please try again."
        );
        return;
      }

      toast.success("Profile updated successfully!");
      setAvatarFile(null);

      // Reload user profile to get updated data
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
      setValidationError("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setValidationError("New password must be at least 8 characters long");
      return;
    }

    setSaving(true);
    setValidationError(null);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <div className="text-lg text-red-600">
            Failed to load user profile
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4 text-black dark:text-white" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      {validationError && (
        <div className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {validationError}
        </div>
      )}

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your profile picture and personal information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                {/* Avatar Section */}
                <div className="space-y-4">
                  <label className="block text-sm font-medium">
                    Profile Picture
                  </label>
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage
                        src={avatarPreview || undefined}
                        alt={user.name || "User"}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-lg">
                        {getInitials(user.name || "User")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <label htmlFor="avatar-upload" className="cursor-pointer">
                        <div className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800">
                          <Camera className="h-4 w-4 text-black dark:text-white" />
                          <span>Change photo</span>
                        </div>
                      </label>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                        disabled={saving}
                      />
                      <p className="text-muted-foreground mt-1 text-xs">
                        JPG, PNG or GIF (max 5MB)
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Name Section */}
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-sm font-medium">
                    Full Name
                  </label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    disabled={saving}
                    required
                  />
                </div>

                {/* Email Section (Read-only) */}
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={user.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-muted-foreground text-xs">
                    Email cannot be changed from this page
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="bg-[#ff78c8] text-white hover:bg-[#ff78c8]/90"
                  >
                    <Save className="mr-2 h-4 w-4 text-white" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <PasswordInput
                  password={newPassword}
                  confirmPassword={confirmPassword}
                  onPasswordChange={setNewPassword}
                  onConfirmPasswordChange={setConfirmPassword}
                  disabled={saving}
                />

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="bg-[#ff78c8] text-white hover:bg-[#ff78c8]/90"
                  >
                    <Save className="mr-2 h-4 w-4 text-white" />
                    {saving ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
