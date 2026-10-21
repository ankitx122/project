import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export function withMotion(animate, still) {
  const mm = gsap.matchMedia();
  mm.add({ motion: "(prefers-reduced-motion: no-preference)", reduce: "(prefers-reduced-motion: reduce)" }, (ctx) =>
    ctx.conditions.motion ? animate() : still?.(),
  );
  return mm;
}

export { gsap, useGSAP };
