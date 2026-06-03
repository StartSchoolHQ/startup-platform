"use client";

import { Button } from "@/components/ui/button";

/**
 * Quick-launch buttons for the Dokobit integration-review demo. Each
 * button opens the public agreement form with a `?mock=<scenario>`
 * query param that drives `src/lib/dokobit/identity.ts` mock branch
 * to return the corresponding Dokobit error code (or success).
 *
 * On prod without DOKOBIT_IDENTITY_MOCK=true these buttons just open
 * the form normally — the mock branch isn't entered and the user
 * goes through real Dokobit auth. So the panel is safe to leave
 * visible; it only adds value when the env flag is on.
 */
interface Scenario {
  label: string;
  description: string;
  href: string;
  badge: string;
}

// Mock identity scenarios — bypasses the Dokobit Identity Gateway and
// returns a canned response. The Documents Gateway side (PDF upload,
// signing session, addSigner, archive) is fully real either way, so
// Dokobit reviewers still see real traffic in their logs on the happy
// path. Mock only covers identity errors for predictable demoing.
//
// Labels correspond 1:1 with the 6 documented Dokobit error codes plus
// the happy path. Source for error codes:
//   https://dokobit.support.signicat.com/.../error-handling-...
const SCENARIOS: Scenario[] = [
  {
    label: "Happy path",
    description:
      "Returns OK TEST, full pipeline runs through real Dokobit signing",
    href: "/full-scholarship-agreement?mock=ok",
    badge: "OK",
  },
  {
    label: "User refused",
    description: "Student cancelled at Dokobit",
    href: "/full-scholarship-agreement?mock=cancelled",
    badge: "7023",
  },
  {
    label: "Session expired",
    description: "Auth session timed out",
    href: "/full-scholarship-agreement?mock=expired",
    badge: "6005",
  },
  {
    label: "No Smart-ID",
    description: "User has no Smart-ID account",
    href: "/full-scholarship-agreement?mock=no_smartid",
    badge: "6006",
  },
  {
    label: "Smart-ID Basic only",
    description: "Account too low-level for signing",
    href: "/full-scholarship-agreement?mock=basic_account",
    badge: "6007",
  },
  {
    label: "Verify Smart-ID app",
    description: "User must open Smart-ID app",
    href: "/full-scholarship-agreement?mock=view_app",
    badge: "6008",
  },
  {
    label: "No Mobile-ID",
    description: "Phone not registered for Mobile-ID",
    href: "/full-scholarship-agreement?mock=no_mobile_id",
    badge: "6001",
  },
];

function ScenarioButton({ scenario }: { scenario: Scenario }) {
  return (
    <a href={scenario.href} target="_blank" rel="noopener noreferrer">
      <Button
        variant="outline"
        size="sm"
        className="h-auto w-full flex-col items-start gap-0.5 border-amber-300 bg-white py-2 text-left whitespace-normal hover:bg-amber-50 dark:border-amber-800 dark:bg-zinc-900 dark:hover:bg-amber-950/40"
      >
        <span className="font-medium">
          {scenario.label}{" "}
          <span className="ml-1 font-mono text-xs text-zinc-500">
            ({scenario.badge})
          </span>
        </span>
        <span className="text-xs font-normal text-zinc-500">
          {scenario.description}
        </span>
      </Button>
    </a>
  );
}

export function DokobitDemoPanel() {
  // Gated on a public env var so prod stays clean. Set to "true" on
  // Vercel Preview (and/or Production while preparing the integration
  // review); remove after the review to hide the panel.
  if (process.env.NEXT_PUBLIC_DOKOBIT_DEMO_PANEL !== "true") return null;

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-amber-400 bg-amber-50/50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
      <div>
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
          Demo scenarios
        </p>
        <p className="text-xs text-amber-800/80 dark:text-amber-400/80">
          Pick a scenario to walk through the agreement flow. Each one uses SK
          ID Solutions test accounts to simulate the outcome.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
        {SCENARIOS.map((s) => (
          <ScenarioButton key={s.href} scenario={s} />
        ))}
      </div>
    </div>
  );
}
