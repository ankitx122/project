const TONES = {
  neutral: "border-zinc-700/80 text-zinc-300",
  accent: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  danger: "border-red-500/30 bg-red-500/10 text-red-300",
};

export default function Badge({ tone = "neutral", children }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-[3px] text-[11px] font-medium leading-none ${TONES[tone]}`}>
      {children}
    </span>
  );
}
