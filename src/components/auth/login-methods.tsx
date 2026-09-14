"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { GoogleSignInButton } from "./google-sign-in-button";
import { LoginForm } from "./login-form";
import { cn } from "@/lib/utils";

/**
 * Google first; the legacy email + password form stays reachable behind a
 * toggle until Phase 2 removes it (see docs/GoogleSSO).
 */
export function LoginMethods() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <GoogleSignInButton />

      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="text-muted-foreground hover:text-foreground mx-auto flex items-center gap-1 text-xs transition-colors">
          Use password instead
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform",
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
