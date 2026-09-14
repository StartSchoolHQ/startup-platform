"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hasFounderCard, isProfileComplete } from "@/lib/profile-utils";
import { BasicProfileForm } from "@/components/profile/basic-profile-form";
import { FounderCardForm } from "@/components/profile/founder-card-form";
import { SetupLoading, SetupShell } from "@/components/profile/setup-shell";

type Step = "validating" | "basics" | "card";

/**
 * /profile/setup — two steps after the first Google sign-in:
 *   1. name + avatar (public.users)          2. founder card (founder_profiles)
 * Both must exist before /dashboard lets the user in (see dashboard/layout.tsx
 * and /auth/callback). A user who already has both is sent straight on.
 */
export default function ProfileSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("validating");
  const [initialName, setInitialName] = useState("");
  const [namePrefilled, setNamePrefilled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validateAccess = async () => {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push("/login");
        return;
      }

      const [{ data: profile }, cardDone] = await Promise.all([
        supabase
          .from("users")
          .select("name, avatar_url")
          .eq("id", user.id)
          .maybeSingle(),
        hasFounderCard(supabase, user.id),
      ]);
      const basicsDone = isProfileComplete(profile);

      if (basicsDone && cardDone) {
        router.replace("/dashboard");
        return;
      }
      if (basicsDone) {
        setStep("card");
        return;
      }

      // Pre-fill the name: legacy invite metadata first, then Google's.
      const metadata = user.user_metadata || {};
      const prefilled =
        [metadata.first_name, metadata.last_name].filter(Boolean).join(" ") ||
        metadata.full_name ||
        metadata.name ||
        "";
      setInitialName(prefilled);
      setNamePrefilled(!!prefilled);
      setStep("basics");
    };
    validateAccess();
  }, [router]);

  if (step === "validating") return <SetupLoading />;

  if (step === "basics") {
    return (
      <SetupShell
        step={1}
        title="Complete Your Profile"
        description="Add a profile photo so your team can recognise you"
        error={error}
        onDismissError={() => setError(null)}
      >
        <BasicProfileForm
          initialName={initialName}
          namePrefilled={namePrefilled}
          onError={setError}
          onDone={() => {
            setError(null);
            setStep("card");
          }}
        />
      </SetupShell>
    );
  }

  return (
    <SetupShell
      step={2}
      title="Your Founder Card"
      description="An honest snapshot to help you find teammates who complement you"
      error={error}
      onDismissError={() => setError(null)}
    >
      <FounderCardForm
        onError={setError}
        onDone={() => {
          router.push("/dashboard");
          router.refresh();
        }}
      />
    </SetupShell>
  );
}
