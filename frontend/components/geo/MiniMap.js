"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { buildMarkers } from "./markers";

const VectorMap = dynamic(() => import("./VectorMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-zinc-900/60" />,
});

export default function MiniMap({ data }) {
  const markers = useMemo(() => buildMarkers(data), [data]);
  if (!markers.length) return null;
  return <VectorMap markers={markers} interactive={false} />;
}
