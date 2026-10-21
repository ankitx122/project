"use client";

import { useRef, useState } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import { googleOnlyToast } from "@/components/ui/AppToaster";
import { gsap, useGSAP, withMotion } from "@/lib/gsap";
import { PASSWORD_MIN, PASSWORD_RULES, signInSchema, signUpSchema, validate } from "@/lib/validation/auth";

const INPUT =
  "h-12 w-full rounded-xl border border-transparent bg-zinc-900 px-4 text-[14px] text-zinc-100 outline-none transition placeholder:text-zinc-600 hover:bg-zinc-900/80 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 aria-[invalid=true]:border-red-500/50";

function Field({ id, label, error, children }) {
  return (
    <div data-anim="field" data-field={id}>
      <label htmlFor={id} className="mb-2 block text-[13px] text-zinc-300">{label}</label>
      <div className="relative">{children}</div>
      {error && <p id={`${id}-error`} className="mt-1.5 text-[12px] text-red-300">{error}</p>}
    </div>
  );
}

function PasswordRules({ password }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
      {PASSWORD_RULES.map(({ label, test }) => {
        const ok = test(password);
        return (
          <li key={label} className={`inline-flex items-center gap-1.5 transition-colors ${ok ? "text-emerald-300" : "text-zinc-500"}`}>
            <span className={`grid h-3.5 w-3.5 place-items-center rounded-full border ${ok ? "border-emerald-400 bg-emerald-400 text-zinc-950" : "border-zinc-700"}`}>
              {ok && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
            </span>
            {label}
          </li>
        );
      })}
    </ul>
  );
}

function shake(form, fields) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const targets = fields.map((f) => form.querySelector(`[data-field="${f}"] > .relative`)).filter(Boolean);
  gsap.fromTo(targets, { x: 0 }, { keyframes: { x: [-7, 6, -4, 3, 0] }, duration: 0.42, ease: "power1.inOut", clearProps: "x" });
}

export default function EmailForm({ mode, introDelay = 0 }) {
  const signUp = mode === "signup";
  const schema = signUp ? signUpSchema : signInSchema;
  const ref = useRef(null);
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});
  const [attempted, setAttempted] = useState(false);

  useGSAP(
    () => {
      withMotion(() =>
        gsap.fromTo("[data-anim=field], [data-anim=form-extra]", { autoAlpha: 0, y: 14 }, {
          autoAlpha: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.07,
          delay: introDelay,
          ease: "power3.out",
        }),
      );
    },
    { scope: ref },
  );

  const set = (key) => (e) => {
    const next = { ...values, [key]: e.target.value };
    setValues(next);
    if (attempted) setErrors(validate(schema, next).errors);
    else setErrors((err) => ({ ...err, [key]: undefined }));
  };

  function onSubmit(e) {
    e.preventDefault();
    setAttempted(true);
    const { errors: next } = validate(schema, values);
    setErrors(next);
    const invalid = Object.keys(next);
    if (invalid.length) {
      shake(e.currentTarget, invalid);
      e.currentTarget.querySelector(`#${invalid[0]}`)?.focus();
      return;
    }
    googleOnlyToast(signUp ? "Email sign-up isn't available." : "Email sign-in isn't available.");
  }

  const invalidProps = (key) => ({ "aria-invalid": !!errors[key], "aria-describedby": errors[key] ? `${key}-error` : undefined });

  return (
    <form ref={ref} onSubmit={onSubmit} noValidate className="space-y-5">
      {signUp && (
        <Field id="name" label="Full name" error={errors.name}>
          <input
            id="name"
            autoComplete="name"
            value={values.name}
            onChange={set("name")}
            placeholder="Your name"
            {...invalidProps("name")}
            className={INPUT}
          />
        </Field>
      )}

      <Field id="email" label="Email address" error={errors.email}>
        <input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          value={values.email}
          onChange={set("email")}
          placeholder="you@company.com"
          {...invalidProps("email")}
          className={INPUT}
        />
      </Field>

      <Field id="password" label="Password" error={errors.password}>
        <input
          id="password"
          type={showPassword ? "text" : "password"}
          autoComplete={signUp ? "new-password" : "current-password"}
          value={values.password}
          onChange={set("password")}
          placeholder={signUp ? `At least ${PASSWORD_MIN} characters` : "Enter your password"}
          {...invalidProps("password")}
          className={`${INPUT} pr-12`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((s) => !s)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-zinc-500 transition-colors hover:text-zinc-200"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </Field>
      {signUp && (
        <div data-anim="form-extra" className="-mt-3">
          <PasswordRules password={values.password} />
        </div>
      )}

      {!signUp && (
        <div data-anim="form-extra" className="flex items-center justify-between text-[13px]">
          <label className="flex cursor-pointer items-center gap-2.5 text-zinc-300">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="peer sr-only" />
            <span className="grid h-[18px] w-[18px] place-items-center rounded-full border border-zinc-700 text-zinc-950 transition-colors peer-checked:border-emerald-400 peer-checked:bg-emerald-400 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500/40">
              {remember && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            Remember me
          </label>
          <button
            type="button"
            onClick={() => googleOnlyToast("Password reset isn't available.")}
            className="text-zinc-400 transition-colors hover:text-zinc-100"
          >
            Forgot password?
          </button>
        </div>
      )}

      <button
        type="submit"
        data-anim="form-extra"
        className="h-12 w-full rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 text-[14px] font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_8px_24px_-8px_rgb(16_185_129/0.6)] transition hover:from-emerald-400 hover:to-emerald-600 active:scale-[0.99]"
      >
        {signUp ? "Create account" : "Sign in"}
      </button>
    </form>
  );
}
