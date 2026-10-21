import Notice from "@/components/ui/Notice";

export default function Notices({ error, data }) {
  const warnings = data?.warnings ?? data?.results?.[0]?.warnings ?? [];
  if (!error && !warnings.length) return null;
  return (
    <div className="space-y-2">
      {error && <Notice tone="error">{error}</Notice>}
      {warnings.map((w) => <Notice key={w}>{w}</Notice>)}
    </div>
  );
}
