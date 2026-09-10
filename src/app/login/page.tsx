import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";

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

        <div className="relative max-w-md space-y-4">
          <h1 className="text-4xl leading-[1.1] font-semibold tracking-tight xl:text-5xl">
            Good to see you again.
          </h1>
          <p className="text-lg text-white/60">
            Your tasks, team and rewards are right where you left them.
          </p>
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
