import Image from "next/image";
import { BarChart3, Users, Zap } from "lucide-react";

/** Brand values, pinned: the sign-in page looks the same in both themes. */
export const SCREEN_BLUE = "#0106FF";
export const PLASTIC_PINK = "#FF78C8";

const FEATURES = [
  {
    icon: Zap,
    title: "Track your progress",
    text: "Complete tasks and earn XP",
  },
  {
    icon: Users,
    title: "Work with your team",
    text: "Collaborate, build and get feedback",
  },
  {
    icon: BarChart3,
    title: "See real results",
    text: "From ideas to working products",
  },
] as const;

function Headline({ compact = false }: { compact?: boolean }) {
  return (
    <h1
      className={
        compact
          ? "text-[2.5rem] leading-[0.92] font-bold tracking-tight uppercase"
          : "text-[clamp(3rem,6.5vw,6.5rem)] leading-[0.92] font-bold tracking-tight uppercase"
      }
      style={{ fontFamily: "var(--font-brand)" }}
    >
      Welcome
      <br />
      back,
      <br />
      <span className="relative mt-1 inline-block">
        <span
          className="inline-block -rotate-2 px-3 text-black"
          style={{ backgroundColor: PLASTIC_PINK }}
        >
          Founder.
        </span>
        {/* Hand-drawn underline, as in the brand illustrations. */}
        <svg
          aria-hidden
          viewBox="0 0 220 24"
          className="absolute right-0 -bottom-5 h-5 w-[70%] text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <path d="M4 18c40-10 90-14 140-8-30 0-60 4-80 10 50-6 100-8 152-4" />
        </svg>
      </span>
    </h1>
  );
}

function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/images/startschool-logo.png"
      alt="StartSchool"
      width={168}
      height={30}
      className={className}
      priority
    />
  );
}

/**
 * The blue brand column of the sign-in page (large screens). Startup House
 * sits in the background, anchored bottom-left; the copy lives above it.
 */
export function LoginBrandPanel() {
  return (
    <section
      className="relative hidden overflow-hidden text-white lg:flex lg:flex-col lg:p-10 xl:p-12"
      style={{ backgroundColor: SCREEN_BLUE }}
    >
      <Image
        src="/images/login/startup-house.png"
        alt=""
        aria-hidden
        width={941}
        height={1672}
        priority
        className="pointer-events-none absolute bottom-0 left-0 h-[70%] w-auto max-w-none select-none"
      />

      <div className="relative z-10 flex flex-1 flex-col">
        <Logo className="h-9 w-auto self-start" />

        <div className="mt-[8vh] max-w-lg space-y-6">
          <p
            className="text-xs font-semibold tracking-[0.35em] uppercase"
            style={{ color: PLASTIC_PINK }}
          >
            Startup Module
          </p>
          <Headline />
          <p className="max-w-sm pt-2 text-xl leading-snug text-white/90">
            Continue your startup journey, earn more XP and work with your team.
          </p>
        </div>

        {/* Bottom right, beside the house rather than over it. */}
        <ul className="mt-auto ml-auto w-full max-w-xs space-y-5 pt-10 pl-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-center gap-5">
              <Icon
                className="h-9 w-9 shrink-0"
                style={{ color: PLASTIC_PINK }}
                strokeWidth={2.25}
              />
              <div>
                <p className="text-lg leading-tight font-semibold">{title}</p>
                <p className="text-sm text-white/85">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Short blue band above the card on phones and tablets. */
export function LoginBrandBand() {
  return (
    <section
      className="px-6 pt-6 pb-10 text-white lg:hidden"
      style={{ backgroundColor: SCREEN_BLUE }}
    >
      <Logo className="h-8 w-auto self-start" />
      <p
        className="mt-8 text-[11px] font-semibold tracking-[0.35em] uppercase"
        style={{ color: PLASTIC_PINK }}
      >
        Startup Module
      </p>
      <div className="mt-3">
        <Headline compact />
      </div>
    </section>
  );
}
