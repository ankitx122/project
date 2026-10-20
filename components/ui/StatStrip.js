export default function StatStrip({ items }) {
  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-lg border border-zinc-800 sm:grid-cols-5">
      {items.map(({ label, value }, i) => (
        <div
          key={label}
          className={`border-zinc-800 px-4 py-3 ${i > 0 ? "sm:border-l" : ""} ${i > 1 ? "border-t sm:border-t-0" : ""} ${i % 2 ? "border-l" : ""}`}
        >
          <dt className="text-[12px] text-zinc-500">{label}</dt>
          <dd className="mt-1 truncate font-mono text-[15px] tabular-nums text-zinc-100" title={value}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
