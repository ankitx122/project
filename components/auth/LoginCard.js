"use client";

import Link from "next/link";
import { Suspense, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import Notice from "@/components/ui/Notice";
import { gsap, useGSAP, withMotion } from "@/lib/gsap";
import Avatar from "./Avatar";
import { useAuth } from "./AuthProvider";
import EmailForm from "./EmailForm";
import GoogleButton from "./GoogleButton";

const ERRORS = {
  access_denied: "Sign-in was cancelled.",
  state_mismatch: "Your sign-in attempt expired. Please try again.",
};

const COPY = {
  signin: { title: "Sign in to IP Intelligence", text: "Enter your details to sign in to your account." },
  signup: { title: "Create your account", text: "Save lookups to watchlists and keep your history." },
};

function SignInError() {
  const code = useSearchParams().get("error");
  if (!code) return null;
  return <Notice tone="error">{ERRORS[code] ?? "Google sign-in failed. Please try again."}</Notice>;
}

function Divider() {
  return (
    <div data-anim="card-item" className="flex items-center gap-4 text-[12.5px] text-zinc-500">
      <span className="h-px flex-1 bg-zinc-800" />
      Or
      <span className="h-px flex-1 bg-zinc-800" />
    </div>
  );
}

function SignedIn({ user }) {
  return (
    <div data-anim="card-item" className="space-y-5">
      <div className="flex items-center gap-3 rounded-xl bg-zinc-900 p-4">
        <Avatar user={user} size="md" />
        <div className="min-w-0">
          <div className="truncate text-[14px] text-zinc-100">{user.name}</div>
          <div className="truncate text-[12.5px] text-zinc-500">{user.email}</div>
        </div>
      </div>
      <Link
        href="/profile"
        className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 text-[14px] font-medium text-white transition hover:from-emerald-400 hover:to-emerald-600"
      >
        Go to your profile
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default function LoginCard() {
  const { user, loading, error } = useAuth();
  const [mode, setMode] = useState("signin");
  const [switched, setSwitched] = useState(false);
  const ref = useRef(null);
  const copy = user ? { title: "You're signed in", text: "Pick up where you left off." } : COPY[mode];
  const signIn = mode === "signin";

  useGSAP(
    () => {
      withMotion(() =>
        gsap.fromTo(
          "[data-anim=card-head] > *",
          { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08, ease: "power3.out" },
        ),
      );
    },
    { scope: ref, dependencies: [mode, Boolean(user)] },
  );

  useGSAP(
    () => {
      if (loading) return;
      withMotion(() =>
        gsap.fromTo(
          "[data-anim=card-item]",
          { autoAlpha: 0, y: 14 },
          { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.08, delay: 0.1, ease: "power3.out" },
        ),
      );
    },
    { scope: ref, dependencies: [loading] },
  );

  return (
    <div ref={ref} className="w-full max-w-[400px]">
      <div data-anim="card-head" className="mb-9 text-center">
        <h1 className="text-[28px] font-semibold tracking-tight text-zinc-50">{copy.title}</h1>
        <p className="mt-2 text-[14px] text-zinc-400">{copy.text}</p>
      </div>

      <div className="space-y-6">
        <Suspense fallback={null}>
          <SignInError />
        </Suspense>
        {error && <Notice tone="error">{error}</Notice>}

        {loading ? (
          <div className="space-y-4" aria-busy="true">
            <div className="h-12 animate-pulse rounded-xl bg-zinc-900" />
            <div className="h-12 animate-pulse rounded-xl bg-zinc-900/70" />
          </div>
        ) : user ? (
          <SignedIn user={user} />
        ) : (
          <>
            <div data-anim="card-item">
              <GoogleButton label={signIn ? "Sign in with Google" : "Sign up with Google"} variant="dark" />
            </div>
            <Divider />
            <EmailForm key={mode} mode={mode} introDelay={switched ? 0 : 0.3} />
            <p data-anim="card-item" className="text-center text-[13px] text-zinc-500">
              {signIn ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => {
                  setMode(signIn ? "signup" : "signin");
                  setSwitched(true);
                }}
                className="font-medium text-zinc-100 transition-colors hover:text-emerald-300"
              >
                {signIn ? "Sign up" : "Sign in"}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
