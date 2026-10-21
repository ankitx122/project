import { FcGoogle } from "react-icons/fc";
import { googleSignInUrl } from "@/services/api";

const VARIANTS = {
  light: "h-11 rounded-lg bg-white text-zinc-900 hover:bg-zinc-200",
  dark: "h-12 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 hover:border-zinc-700 hover:bg-zinc-900",
};

export default function GoogleButton({ returnTo = "/profile", label = "Continue with Google", variant = "light" }) {
  return (
    <a
      href={googleSignInUrl(returnTo)}
      className={`flex w-full items-center justify-center gap-3 px-4 text-[14px] font-medium transition-colors ${VARIANTS[variant]}`}
    >
      <FcGoogle aria-hidden className="h-[18px] w-[18px] shrink-0" />
      {label}
    </a>
  );
}
