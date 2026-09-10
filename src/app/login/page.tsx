import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";

const PILLARS = [
  { title: "My Journey", text: "Solo founder tasks, reviewed in minutes." },
  { title: "Team Journey", text: "Build with your team, ship, report weekly." },
  { title: "Peer review", text: "Judge other teams' work and earn for it." },
];

export default function LoginPage() {
  return (
    <div className="bg-background grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <section className="relative hidden overflow-hidden bg-[oklch(0.17_0.035_275)] text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="bg-primary/40 pointer-events-none absolute -top-40 -left-32 h-[34rem] w-[34rem] rounded-full blur-[120px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 bottom-0 h-72 w-72 rounded-full bg-[oklch(0.572_0.194_293.89)]/30 blur-[100px]"
        />

        <Image
          src="/images/startschool-logo.png"
          alt="StartSchool"
          width={132}
          height={34}
          className="relative h-8 w-auto object-contain"
          priority
        />

        <div className="relative max-w-md space-y-8">
          <h1 className="text-4xl leading-[1.1] font-semibold tracking-tight xl:text-5xl">
            Build something real, one task at a time.
          </h1>
          <ul className="space-y-4">
            {PILLARS.map((p) => (
              <li key={p.title} className="flex items-start gap-3">
                <span className="bg-primary mt-2 h-1.5 w-1.5 shrink-0 rounded-full" />
                <div>
                  <p className="text-sm font-medium">{p.title}</p>
                  <p className="text-sm text-white/60">{p.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">
          StartSchool · Tech Education Foundation
        </p>
      </section>

      {/* Form panel */}
      <section className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm space-y-8">
          <Image
            src="/images/startschool-logo.png"
            alt="StartSchool"
            width={132}
            height={34}
            className="h-8 w-auto object-contain lg:hidden"
            priority
          />
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="text-muted-foreground text-sm">
              Use the email you were invited with.
            </p>
          </div>

          <LoginForm />

          <p className="text-muted-foreground text-xs">
            No account? Invitations come from your programme lead. Ask them to
            send yours.
          </p>
        </div>
      </section>
    </div>
  );
}
