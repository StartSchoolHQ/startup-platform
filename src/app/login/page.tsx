import { Space_Grotesk } from "next/font/google";
import {
  LoginBrandBand,
  LoginBrandPanel,
} from "@/components/auth/login-brand-panel";
import { LoginMethods } from "@/components/auth/login-methods";

/** Brand display face, used for the headline only. */
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-brand",
});

/** Faint pencil scribbles on the canvas, as in the brand mockups. */
function Scribbles() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 400 800"
      className="pointer-events-none absolute inset-0 h-full w-full text-neutral-400/50"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      preserveAspectRatio="xMaxYMid slice"
    >
      <path d="M300 60c20 30 40-40 60 10s30-30 40 10" />
      <path d="M280 120c30 20 50-50 80 0s20-20 40 20" />
      <path d="M220 680c30-40 40 30 70-20s30 40 60-10" />
      <path d="M250 740c20-30 30 20 60-10s30 30 50 0" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <div
      className={`${spaceGrotesk.variable} grid min-h-screen bg-[#F5F4F0] text-neutral-900 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]`}
    >
      <LoginBrandPanel />

      <div className="flex flex-col">
        <LoginBrandBand />

        <section className="relative flex flex-1 items-start justify-center px-5 py-10 sm:px-10 lg:items-center">
          <Scribbles />

          <div className="relative w-full max-w-[26rem] space-y-6 rounded-2xl border border-neutral-200 bg-white p-7 shadow-[0_8px_30px_rgba(0,0,0,0.06)] sm:p-9">
            <div className="space-y-1.5 text-center">
              <h2 className="text-3xl font-semibold tracking-tight">Sign in</h2>
              <p className="text-sm leading-relaxed text-neutral-500">
                Use your StartSchool account
                <br />
                to continue to the Startup Module.
              </p>
            </div>

            <LoginMethods />

            <p className="text-center text-sm leading-relaxed text-neutral-500">
              Members only. If you don&apos;t have access,
              <br />
              contact the StartSchool team.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
