import { isEmpty } from "@/lib/format";

export function FieldList({ children }) {
  return <dl className="divide-y divide-zinc-800/70">{children}</dl>;
}

export default function Field({ label, value, mono }) {
  if (isEmpty(value)) return null;
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 py-2 text-[13px] leading-5">
      <dt className="text-zinc-500">{label}</dt>
      <dd className={`min-w-0 break-words text-zinc-100 ${mono ? "font-mono text-[12.5px]" : ""}`}>{value}</dd>
    </div>
  );
}
