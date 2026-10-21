import CopyButton from "@/components/ui/CopyButton";

export default function ResultHeader({ title, copy, meta, badges, actions, as: Heading = "h2" }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <Heading className="truncate font-mono text-[22px] font-medium tracking-tight text-zinc-50">{title}</Heading>
          {copy && <CopyButton value={copy} label="Copy" />}
        </div>
        {meta && <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-zinc-400">{meta}</div>}
        {badges && <div className="mt-2.5 flex flex-wrap gap-1.5">{badges}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

export const Dot = () => <span aria-hidden className="h-1 w-1 rounded-full bg-zinc-700" />;

export function ActionLink({ as: As = "a", children, ...props }) {
  return (
    <As
      {...props}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/60 px-2.5 text-[13px] text-zinc-200 transition-colors hover:border-zinc-700 hover:bg-zinc-800/70"
    >
      {children}
    </As>
  );
}
