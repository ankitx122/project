"use client";

import { useRef } from "react";
import { Bookmark, Layers, Radar, Search, UserRound } from "lucide-react";
import { gsap, useGSAP, withMotion } from "@/lib/gsap";

const STEPS = [
  { Icon: UserRound, title: "Create your account", text: "Sign in with Google in one click." },
  { Icon: Search, title: "Search any IP or network", text: "Location, owner, routing and WHOIS." },
  { Icon: Layers, title: "Look up in bulk", text: "Up to 500 IPs or a log file at once." },
  { Icon: Bookmark, title: "Save to watchlists", text: "Group IPs into lists, with your notes." },
];

const HIDDEN = { visibility: "hidden" };

export default function LoginShowcase() {
  const ref = useRef(null);

  useGSAP(
    () => {
      withMotion(
        () => {
          const intro = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.7 } });
          intro
            .fromTo("[data-anim=brand]", { autoAlpha: 0, y: -14, scale: 0.92 }, { autoAlpha: 1, y: 0, scale: 1 })
            .fromTo("[data-anim=heading]", { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, stagger: 0.1 }, "-=0.45")
            .fromTo(
              "[data-anim=line]",
              { autoAlpha: 1, scaleY: 0 },
              { scaleY: 1, transformOrigin: "top center", duration: 1, ease: "power2.inOut" },
              "-=0.3",
            )
            .fromTo("[data-anim=step]", { autoAlpha: 0, x: -28 }, { autoAlpha: 1, x: 0, stagger: 0.13 }, "<0.1")
            .fromTo(
              "[data-anim=dot]",
              { autoAlpha: 0, scale: 0 },
              { autoAlpha: 1, scale: 1, stagger: 0.13, duration: 0.5, ease: "back.out(2.2)" },
              "<",
            );

          const cycle = gsap.timeline({ repeat: -1, delay: intro.duration() + 0.4 });
          gsap.utils.toArray("[data-anim=step]", ref.current).forEach((step) => {
            const dot = step.querySelector("[data-anim=dot]");
            const card = step.querySelector("[data-anim=card]");
            cycle
              .to(dot, { backgroundColor: "#34d399", borderColor: "#34d399", color: "#052e1c", duration: 0.35 })
              .to(card, { borderColor: "rgba(52, 211, 153, 0.35)", duration: 0.35 }, "<")
              .to([dot, card], { clearProps: "backgroundColor,borderColor,color", duration: 0.35 }, "+=1.3");
          });

          gsap.to("[data-anim=glow]", { xPercent: 14, yPercent: 10, scale: 1.18, duration: 7, repeat: -1, yoyo: true, ease: "sine.inOut" });
        },
        () => gsap.set("[data-anim]", { autoAlpha: 1 }),
      );
    },
    { scope: ref },
  );

  return (
    <div
      ref={ref}
      className="relative isolate flex h-full flex-col items-center justify-center overflow-hidden rounded-[28px] border border-white/[0.06] bg-no-repeat bg-[radial-gradient(130%_75%_at_50%_0%,#4ade80_0%,#16a34a_22%,#14532d_44%,#0a0f0c_70%,#09090b_100%)] px-10 py-16 [@media(max-height:820px)]:py-8"
    >
      <div
        data-anim="glow"
        aria-hidden
        className="pointer-events-none absolute -top-40 left-[15%] -z-10 h-96 w-96 rounded-full bg-emerald-300/25 blur-3xl"
      />

      <div className="flex flex-col items-center text-center">
        <div data-anim="brand" style={HIDDEN} className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
            <Radar className="h-5 w-5 text-white" />
          </span>
          <span className="text-[22px] font-semibold tracking-tight text-white">IP Intelligence</span>
        </div>
        <h2
          data-anim="heading"
          style={HIDDEN}
          className="mt-5 text-[34px] font-semibold leading-tight tracking-tight text-white [@media(max-height:820px)]:mt-3 [@media(max-height:820px)]:text-[28px]"
        >
          Get started with us
        </h2>
        <p data-anim="heading" style={HIDDEN} className="mt-2 text-[14px] text-white/75">
          From sign-in to your first watchlist.
        </p>
      </div>

      <ol className="relative mt-12 w-full max-w-sm space-y-4 pl-10 [@media(max-height:820px)]:mt-7 [@media(max-height:820px)]:space-y-3">
        <span
          data-anim="line"
          aria-hidden
          style={HIDDEN}
          className="absolute bottom-6 left-[11px] top-6 w-px bg-gradient-to-b from-white/25 via-white/15 to-transparent"
        />
        {STEPS.map(({ Icon, title, text }, i) => (
          <li key={title} data-anim="step" style={HIDDEN} className="relative">
            <span
              data-anim="dot"
              aria-hidden
              className="absolute -left-10 top-1/2 grid h-[23px] w-[23px] -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-zinc-950 text-[11px] font-medium text-zinc-300"
            >
              {i + 1}
            </span>
            <div
              data-anim="card"
              className="rounded-2xl border border-white/[0.08] bg-zinc-950/70 px-4 py-3.5 backdrop-blur transition-transform duration-300 hover:-translate-y-0.5 [@media(max-height:820px)]:py-3"
            >
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
