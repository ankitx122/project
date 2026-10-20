export default function Section({ title, actions, children, className = "", bodyClassName = "px-4 py-2" }) {
  return (
    <section className={`overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40 ${className}`}>
      {title && (
        <header className="flex min-h-10 items-center justify-between gap-3 border-b border-zinc-800 px-4 py-2">
          <h3 className="text-[13px] font-medium text-zinc-200">{title}</h3>
          {actions}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
