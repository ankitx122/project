import { Globe2, Minus, Plus, Scan } from "lucide-react";

function ControlButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-50"
    >
      {children}
    </button>
  );
}

export default function MapControls({ onZoomIn, onZoomOut, onReset, onWorld }) {
  return (
    <div className="absolute left-3 top-3 z-10 flex flex-col divide-y divide-zinc-800 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/90 shadow-lg shadow-black/30 backdrop-blur">
      <ControlButton label="Zoom in" onClick={onZoomIn}><Plus className="h-4 w-4" /></ControlButton>
      <ControlButton label="Zoom out" onClick={onZoomOut}><Minus className="h-4 w-4" /></ControlButton>
      <ControlButton label="Fit results" onClick={onReset}><Scan className="h-4 w-4" /></ControlButton>
      <ControlButton label="Show whole world" onClick={onWorld}><Globe2 className="h-4 w-4" /></ControlButton>
    </div>
  );
}
