import { Bookmark, Layers, Radar, Search, UserRound } from "lucide-react";

const STEPS = [
  { Icon: UserRound, title: "Create your account", text: "Sign in with Google in one click." },
  { Icon: Search, title: "Search any IP or network", text: "Location, owner, routing and WHOIS." },
  { Icon: Layers, title: "Look up in bulk", text: "Up to 500 IPs or a log file at once." },
  { Icon: Bookmark, title: "Save to watchlists", text: "Group IPs into lists, with your notes." },
];

// Left panel of the sign-in page: brand on a green glow, then a short "how it works" timeline.
export default function LoginShowcase() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden rounded-[28px] border border-white/[0.06] bg-no-repeat bg-[radial-gradient(130%_75%_at_50%_0%,#4ade80_0%,#16a34a_22%,#14532d_44%,#0a0f0c_70%,#09090b_100%)] px-10 py-16 [@media(max-height:820px)]:py-8">
      <div className="flex flex-col items-center text-center">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
            <Radar className="h-5 w-5 text-white" />
          </span>
          <span className="text-[22px] font-semibold tracking-tight text-white">IP Intelligence</span>
        </div>
        <h2 className="mt-5 text-[34px] font-semibold leading-tight tracking-tight text-white [@media(max-height:820px)]:mt-3 [@media(max-height:820px)]:text-[28px]">Get started with us</h2>
        <p className="mt-2 text-[14px] text-white/75">From sign-in to your first watchlist.</p>
      </div>

      <ol className="relative mt-12 w-full max-w-sm space-y-4 pl-10 [@media(max-height:820px)]:mt-7 [@media(max-height:820px)]:space-y-3">
        <span aria-hidden className="absolute bottom-6 left-[11px] top-6 w-px bg-gradient-to-b from-white/25 via-white/15 to-transparent" />
        {STEPS.map(({ Icon, title, text }, i) => (
          <li key={title} className="relative">
            <span
              aria-hidden
              className="absolute -left-10 top-1/2 grid h-[23px] w-[23px] -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-zinc-950 text-[11px] font-medium text-zinc-300"
            >
              {i + 1}
            </span>
            <div className="rounded-2xl border border-white/[0.08] bg-zinc-950/70 px-4 py-3.5 backdrop-blur [@media(max-height:820px)]:py-3">
              <div className="flex items-center gap-2 text-[14.5px] font-medium text-zinc-50">
                <Icon className="h-4 w-4 text-emerald-400" />
                {title}
              </div>
              <p className="mt-1 text-[12.5px] leading-5 text-zinc-400">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
