"use client";

import { useState } from "react";
import { ChevronDown, Mail } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { GoogleSignInButton } from "./google-sign-in-button";
import { LoginForm } from "./login-form";
import { cn } from "@/lib/utils";

/**
 * Google first. The legacy email + password form stays reachable behind the
 * "Sign in with email" button, which opens it in place (see
 * docs/internal/GoogleSSO for the phase-2 removal).
 */
export function LoginMethods() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <GoogleSignInButton />

      <div className="flex items-center gap-3 text-xs text-neutral-400">
        <span className="h-px flex-1 bg-neutral-200" />
        or
        <span className="h-px flex-1 bg-neutral-200" />
      </div>

      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger
          className={cn(
            "flex h-12 w-full items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-medium text-neutral-900 transition-colors",
            "hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-[#FF78C8] focus-visible:outline-none",
            open && "bg-white"
          )}
        >
          <Mail className="h-4 w-4 text-neutral-500" />
          <span className="flex-1 text-center">Sign in with email</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-neutral-500 transition-transform",
              open && "rotate-180"
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-5">
          <LoginForm />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
