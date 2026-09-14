import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Sign-in didn't work — StartSchool",
  robots: { index: false, follow: false },
};

const DOMAIN_REJECTED = /@startschool\.org/i;

/**
 * Landing page for every failed sign-in: OAuth errors forwarded by
 * /auth/callback (?error=…), hook rejections, cancelled consent, and the
 * "profile row missing" edge case. Server component — the message comes
 * from the query string.
 */
export default async function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const domainRejected = !!error && DOMAIN_REJECTED.test(error);

  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="bg-destructive/10 text-destructive mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full">
            <AlertCircle className="h-5 w-5" />
          </div>
          <CardTitle className="text-2xl">
            {domainRejected
              ? "This account can't sign in"
              : "Sign-in didn't work"}
          </CardTitle>
          <CardDescription className="mt-2">
            {error ??
              "We couldn't complete your sign-in. Please try again from the login page."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            StartSchool uses Google sign-in with your{" "}
            <strong className="text-foreground">@startschool.org</strong>{" "}
            account. If you are in the programme and don&apos;t have one, email{" "}
            <a
              className="underline underline-offset-4"
              href="mailto:start@startschool.org"
            >
              start@startschool.org
            </a>
            .
          </p>
          <Button asChild className="w-full">
            <Link href="/login">Back to login</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
