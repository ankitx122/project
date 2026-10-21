"use client";

import { useState } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import Notice from "@/components/ui/Notice";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

const INPUT =
  "h-12 w-full rounded-xl border border-transparent bg-zinc-900 px-4 text-[14px] text-zinc-100 outline-none transition placeholder:text-zinc-600 hover:bg-zinc-900/80 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 aria-[invalid=true]:border-red-500/50";

function Field({ id, label, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[13px] text-zinc-300">{label}</label>
      <div className="relative">{children}</div>
      {error && <p id={`${id}-error`} className="mt-1.5 text-[12px] text-red-300">{error}</p>}
    </div>
  );
}

// Email sign-in / sign-up form. The API only supports Google for now, so a valid submit
// explains that instead of sending anything.
export default function EmailForm({ mode }) {
  const signUp = mode === "signup";
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null);

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setErrors((err) => ({ ...err, [key]: undefined }));
    setNotice(null);
  };

  function onSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!EMAIL_RE.test(values.email.trim())) next.email = "Enter a valid email address.";
    if (values.password.length < (signUp ? MIN_PASSWORD : 1)) {
      next.password = signUp ? `Use at least ${MIN_PASSWORD} characters.` : "Enter your password.";
    }
    setErrors(next);
    setNotice(Object.keys(next).length ? null : "Email sign-in isn't available yet. Use Google above for now.");
  }

  const invalid = (key) => ({ "aria-invalid": !!errors[key], "aria-describedby": errors[key] ? `${key}-error` : undefined });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {signUp && (
        <Field id="name" label="Full name">
          <input id="name" autoComplete="name" value={values.name} onChange={set("name")} placeholder="Your name" className={INPUT} />
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
          {...invalid("email")}
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
          placeholder={signUp ? `At least ${MIN_PASSWORD} characters` : "Enter your password"}
          {...invalid("password")}
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

      {!signUp && (
        <div className="flex items-center justify-between text-[13px]">
          <label className="flex cursor-pointer items-center gap-2.5 text-zinc-300">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="peer sr-only" />
            <span className="grid h-[18px] w-[18px] place-items-center rounded-full border border-zinc-700 text-zinc-950 transition-colors peer-checked:border-emerald-400 peer-checked:bg-emerald-400 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500/40">
              {remember && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            Remember me
          </label>
          <button
            type="button"
            onClick={() => setNotice("Password reset isn't available yet. Use Google above for now.")}
            className="text-zinc-400 transition-colors hover:text-zinc-100"
          >
            Forgot password?
          </button>
        </div>
      )}

      {notice && <Notice tone="info">{notice}</Notice>}

      <button
        type="submit"
        className="h-12 w-full rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 text-[14px] font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_8px_24px_-8px_rgb(16_185_129/0.6)] transition hover:from-emerald-400 hover:to-emerald-600"
      >
        {signUp ? "Create account" : "Sign in"}
      </button>
    </form>
  );
}
