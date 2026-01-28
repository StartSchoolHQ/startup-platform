"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { Input } from "./input";
import { Button } from "./button";

interface PasswordStrength {
  score: number; // 0-3
  label: string;
  color: string;
}

interface PasswordInputProps {
  password: string;
  confirmPassword?: string;
  onPasswordChange: (password: string) => void;
  onConfirmPasswordChange?: (confirmPassword: string) => void;
  showConfirmPassword?: boolean;
  disabled?: boolean;
}

export function PasswordInput({
  password,
  confirmPassword = "",
  onPasswordChange,
  onConfirmPasswordChange,
  showConfirmPassword = true,
  disabled = false,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [strength, setStrength] = useState<PasswordStrength>({
    score: 0,
    label: "",
    color: "",
  });

  // Calculate password strength
  useEffect(() => {
    if (!password) {
      setStrength({ score: 0, label: "", color: "" });
      return;
    }

    let score = 0;
    const hasLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password);
    const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);

    // Scoring logic
    if (hasLength) score++;
    if (hasNumber && hasLetter) score++;
    if (hasSpecial) score++;
    if (hasMixedCase && password.length >= 12) score++;

    // Map score to strength
    if (score === 0 || !hasLength) {
      setStrength({ score: 0, label: "Too weak", color: "text-red-600" });
    } else if (score === 1) {
      setStrength({ score: 1, label: "Weak", color: "text-orange-600" });
    } else if (score === 2) {
      setStrength({ score: 2, label: "Good", color: "text-yellow-600" });
    } else {
      setStrength({ score: 3, label: "Strong", color: "text-green-600" });
    }
  }, [password]);

  const meetsMinLength = password.length >= 8;
  const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password);
  const passwordsMatch =
    showConfirmPassword && confirmPassword && password === confirmPassword;
  const passwordsDontMatch =
    showConfirmPassword && confirmPassword && password !== confirmPassword;

  return (
    <div className="space-y-4">
      {/* Password Field */}
      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium">
          Password *
        </label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="Enter your password"
            disabled={disabled}
            required
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>

        {/* Requirements & Strength Indicator */}
        {password && (
          <div className="space-y-2 text-sm">
            {/* Strength Meter */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    strength.score === 0
                      ? "w-0"
                      : strength.score === 1
                      ? "w-1/3 bg-orange-600"
                      : strength.score === 2
                      ? "w-2/3 bg-yellow-600"
                      : "w-full bg-green-600"
                  }`}
                />
              </div>
              {strength.label && (
                <span className={`text-xs font-medium ${strength.color}`}>
                  {strength.label}
                </span>
              )}
            </div>

            {/* Requirements Checklist */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {meetsMinLength ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <X className="h-4 w-4 text-red-600" />
                )}
                <span
                  className={
                    meetsMinLength ? "text-green-600" : "text-muted-foreground"
                  }
                >
                  At least 8 characters
                </span>
              </div>
              <div className="flex items-center gap-2">
                {hasSpecialChar ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <X className="h-4 w-4 text-red-600" />
                )}
                <span
                  className={
                    hasSpecialChar ? "text-green-600" : "text-muted-foreground"
                  }
                >
                  At least one special character (!@#$%^&*...)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Password Field */}
      {showConfirmPassword && onConfirmPasswordChange && (
        <div className="space-y-2">
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium"
          >
            Confirm Password *
          </label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => onConfirmPasswordChange(e.target.value)}
              placeholder="Confirm your password"
              disabled={disabled}
              required
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowConfirm(!showConfirm)}
            >
              {showConfirm ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>

          {/* Passwords Match Indicator */}
          {confirmPassword && (
            <div className="flex items-center gap-2 text-sm">
              {passwordsMatch ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">Passwords match</span>
                </>
              ) : passwordsDontMatch ? (
                <>
                  <X className="h-4 w-4 text-red-600" />
                  <span className="text-red-600">Passwords do not match</span>
                </>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
