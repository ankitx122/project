function Bar({ className }) {
  return <div className={`animate-pulse rounded bg-zinc-800/70 ${className}`} />;
}

export default function ResultSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading results">
      <div className="space-y-2.5">
        <Bar className="h-7 w-56" />
        <Bar className="h-4 w-80" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-3 rounded-lg border border-zinc-800 p-4">
            <Bar className="h-4 w-24" />
            <Bar className="h-3.5 w-full" />
            <Bar className="h-3.5 w-5/6" />
            <Bar className="h-3.5 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
