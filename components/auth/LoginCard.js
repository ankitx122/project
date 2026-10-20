"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Radar } from "lucide-react";
import Notice from "@/components/ui/Notice";
import Avatar from "./Avatar";
import { useAuth } from "./AuthProvider";
import GoogleButton from "./GoogleButton";

const ERRORS = {
  access_denied: "Sign-in was cancelled.",
  state_mismatch: "Your sign-in attempt expired. Please try again.",
};

// Reads ?error= set by the API after a failed Google sign-in.
function SignInError() {
  const code = useSearchParams().get("error");
  if (!code) return null;
  return <Notice tone="error">{ERRORS[code] ?? "Google sign-in failed. Please try again."}</Notice>;
}

export default function LoginCard() {
  const { user, loading, error } = useAuth();

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="grid h-11 w-11 place-items-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
          <Radar className="h-5 w-5 text-emerald-400" />
        </span>
        <h1 className="mt-4 text-[20px] font-semibold tracking-tight text-zinc-50">Sign in to IP Intelligence</h1>
        <p className="mt-1.5 text-[13px] text-zinc-500">Keep a history of your lookups on your profile.</p>
      </div>

      <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
        <Suspense fallback={null}>
          <SignInError />
        </Suspense>
        {error && <Notice tone="error">{error}</Notice>}

        {loading ? (
          <div className="h-11 animate-pulse rounded-lg bg-zinc-800/70" />
        ) : user ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar user={user} size="md" />
              <div className="min-w-0">
                <div className="truncate text-[13px] text-zinc-100">{user.name}</div>
                <div className="truncate text-[12px] text-zinc-500">{user.email}</div>
              </div>
            </div>
            <Link
              href="/profile"
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 text-[14px] font-medium text-white hover:bg-emerald-500"
            >
              Go to your profile
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <GoogleButton />
        )}
      </div>

      <p className="mt-4 text-center text-[12px] leading-5 text-zinc-500">
        Only your name, email address and profile photo are read from Google.
      </p>
    </div>
  );
}
