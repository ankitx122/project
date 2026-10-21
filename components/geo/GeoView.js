"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Earth, Map as MapIcon } from "lucide-react";

function Loading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-400" />
    </div>
  );
}

const VectorMap = dynamic(() => import("./VectorMap"), { ssr: false, loading: Loading });

const MODES = [
  { id: "map", label: "Map", hint: "Flat map with country and city names", projection: "mercator", Icon: MapIcon },
  { id: "earth", label: "Earth", hint: "3D earth that flattens as you zoom in", projection: "globe", Icon: Earth },
];

export default function GeoView({ markers, focusId, className = "" }) {
  const [mode, setMode] = useState("map");
  const { projection } = MODES.find((m) => m.id === mode);

  return (
    <div className={`relative overflow-hidden bg-zinc-950 ${className}`}>
      <VectorMap key={mode} markers={markers} focusId={focusId} projection={projection} />
      <div
        role="radiogroup"
        aria-label="Map view"
        className="absolute right-3 top-3 z-10 flex gap-0.5 rounded-lg border border-zinc-800 bg-zinc-900/90 p-0.5 shadow-lg shadow-black/30 backdrop-blur"
      >
        {MODES.map(({ id, label, hint, Icon }) => {
          const active = mode === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              title={hint}
              onClick={() => setMode(id)}
              className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition-colors ${
                active ? "bg-zinc-700/70 text-zinc-50" : "text-zinc-400 hover:text-zinc-100"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${active ? "text-emerald-400" : ""}`} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
