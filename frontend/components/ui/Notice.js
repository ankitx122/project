import { AlertTriangle, Info, XCircle } from "lucide-react";

const TONES = {
  error: { cls: "border-red-500/25 bg-red-500/[0.06] text-red-200", Icon: XCircle, icon: "text-red-400" },
  warning: { cls: "border-amber-500/25 bg-amber-500/[0.06] text-amber-100", Icon: AlertTriangle, icon: "text-amber-400" },
  info: { cls: "border-zinc-800 bg-zinc-900/40 text-zinc-300", Icon: Info, icon: "text-zinc-500" },
};

export default function Notice({ tone = "warning", children }) {
  const { cls, Icon, icon } = TONES[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-[13px] leading-5 ${cls}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${icon}`} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
