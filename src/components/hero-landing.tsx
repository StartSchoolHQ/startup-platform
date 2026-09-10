import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  CreditCard,
  GraduationCap,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    phase: "Phase 1",
    title: "Solo preparation",
    text: "62 founder tasks across six phases: profile, mindset, customer discovery, building, business fundamentals, reading. Each submission is reviewed within minutes and paid out in XP and credits.",
  },
  {
    phase: "Phase 2",
    title: "Team Journey",
    text: "Form a team, ship a product and talk to real clients. Weekly reports, client meetings and team achievements drive the Team XP that counts toward graduation.",
  },
  {
    phase: "Ongoing",
    title: "Peer review",
    text: "Teams review each other's work against the same rubric they're judged on. Reviewers earn a share of the reward; submitters get honest feedback fast.",
  },
  {
    phase: "At the end",
    title: "Graduation",
    text: "Team XP, achievements and client work roll up into your diploma. Then the batch closes and the next cohort starts.",
  },
];

const EARN: { icon: LucideIcon; label: string; text: string }[] = [
  {
    icon: Zap,
    label: "XP",
    text: "Progress that ranks you on the leaderboard.",
  },
  {
    icon: CreditCard,
    label: "Credits",
    text: "Spendable balance for your team.",
  },
  {
    icon: Award,
    label: "Achievements",
    text: "One per phase, unlocked by finishing every task in it.",
  },
  {
    icon: GraduationCap,
    label: "Diploma",
    text: "Issued at batch close, backed by your record.",
  },
];

const CREATORS = [
  { name: "Eliass Baranovs", href: "https://linkedin.com/in/eliass-baranovs" },
  { name: "Davids Petuhovs", href: "https://linkedin.com/in/davids-petuhovs" },
];

/**
 * Public landing for startup.startschool.org: what the programme is and how
 * it runs, for someone who has an invitation and wants to know what they
 * are walking into. The login page itself stays minimal.
 */
export function HeroLanding() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[oklch(0.17_0.035_275)] text-white">
      <div
        aria-hidden
        className="bg-primary/35 pointer-events-none absolute -top-56 -left-40 h-[44rem] w-[44rem] rounded-full blur-[150px]"
      />

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Image
          src="/images/startschool-logo.png"
          alt="StartSchool"
          width={132}
          height={34}
          className="h-8 w-auto object-contain"
          priority
        />
        <Button
          asChild
          variant="outline"
          size="sm"
          className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
        >
          <Link href="/login">Sign in</Link>
        </Button>
      </header>

      <main className="relative mx-auto w-full max-w-6xl flex-1 px-6 pt-16 pb-20">
        <section className="max-w-3xl space-y-6">
          <p className="text-primary text-sm font-medium">
            The StartSchool startup programme
          </p>
          <h1 className="text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Build something real, one task at a time.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-white/65">
            From founder basics to a shipped product with real clients. Every
            step is reviewed, every step is rewarded, and the whole record
            becomes your diploma.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button asChild size="lg" className="group h-11 px-6">
              <Link href="/login">
                Sign in
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <p className="text-sm text-white/50">
              Invitation only. Your programme lead sends the link.
            </p>
          </div>
        </section>

        <section className="mt-24">
          <h2 className="text-sm font-medium text-white/50">How it runs</h2>
          <ol className="mt-6 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className="flex flex-col gap-3 bg-[oklch(0.17_0.035_275)] p-6"
              >
                <div className="flex items-center gap-3">
                  <span className="bg-primary/15 text-primary flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums">
                    {i + 1}
                  </span>
                  <span className="text-xs text-white/50">{s.phase}</span>
                </div>
                <p className="text-base font-semibold">{s.title}</p>
                <p className="text-sm leading-relaxed text-white/60">
                  {s.text}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-16">
          <h2 className="text-sm font-medium text-white/50">What you earn</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {EARN.map(({ icon: Icon, label, text }) => (
              <li key={label} className="flex items-start gap-3">
                <span className="bg-primary/15 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="mt-0.5 text-sm text-white/60">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="relative mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-white/40">
        <span>StartSchool · Tech Education Foundation</span>
        <span className="flex items-center gap-3">
          Built by
          {CREATORS.map((c) => (
            <a
              key={c.name}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 transition-colors hover:text-white"
            >
              {c.name}
            </a>
          ))}
        </span>
      </footer>
    </div>
  );
}
