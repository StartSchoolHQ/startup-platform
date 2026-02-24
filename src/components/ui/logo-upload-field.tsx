"use client";

import { useRef, useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X } from "lucide-react";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

interface LogoUploadFieldProps {
  currentLogoUrl?: string | null;
  teamName: string;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
}

export function LogoUploadField({
  currentLogoUrl,
  teamName,
  onFileSelect,
  disabled = false,
}: LogoUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (preview && !preview.startsWith("http")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError("");

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (PNG, JPG, etc.)");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Image must be under 2MB");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    onFileSelect(file);
  };

  const handleRemove = () => {
    if (preview && !preview.startsWith("http")) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const displayUrl = preview || currentLogoUrl;

  return (
    <div className="space-y-2">
      <Label>Team Logo (optional)</Label>
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16 shrink-0 rounded-lg">
          {displayUrl ? (
            <AvatarImage
              src={displayUrl}
              alt={teamName}
              className="rounded-lg object-cover"
            />
          ) : null}
          <AvatarFallback className="rounded-lg bg-[#ff78c8]/10 text-2xl font-bold text-[#ff78c8]">
            {teamName ? teamName.charAt(0).toUpperCase() : "?"}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
              className="gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" />
              {displayUrl ? "Change" : "Upload Logo"}
            </Button>
            {(preview || currentLogoUrl) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={handleRemove}
                className="text-muted-foreground gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Remove
              </Button>
            )}
          </div>
          <p className="text-muted-foreground text-xs">PNG, JPG up to 2MB</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
