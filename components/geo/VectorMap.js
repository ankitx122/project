"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import MapControls from "./MapControls";
import MarkerTooltip from "./MarkerTooltip";
import { tooltipStyle } from "./markers";
import { THEME } from "./theme";

// Vector-tile map (MapLibre + OpenFreeMap tiles) used for both views:
//  - "mercator": flat world map with country / city labels that zooms down to street level
//  - "globe": 3D earth (as on remjobs.works) that flattens into the same street map when zoomed in
const STYLE_URL = "https://tiles.openfreemap.org/styles/dark";
const TILE_SIZE = 512;

// One labels-only-in-English expression; bilingual two-line labels (e.g. "INDIA / भारत")
// are big enough to collide with their neighbours and get dropped at world zoom.
const ENGLISH_NAME = ["coalesce", ["get", "name:en"], ["get", "name_en"], ["get", "name:latin"], ["get", "name"]];

// Zoom at which the flat world exactly fills the container (no empty space, no repeats).
const fitWorldZoom = (el) => Math.max(0, Math.log2(Math.max(el.clientWidth, el.clientHeight) / TILE_SIZE));

// Smallest the globe can get: its visible disc fills ~60% of the container's shorter side,
// leaving space around it so it reads as a sphere.
// MapLibre's globe radius is (512 * 2^z) / 2π at the equator, and perspective shows ~75% of that
// as the visible disc (measured). MapLibre applies minZoom in these equator terms itself, so the
// zoomed-out globe stays this size wherever it's turned.
const GLOBE_PERSPECTIVE = 0.755;
const globeMinZoom = (el) =>
  Math.max(0, Math.log2((Math.min(el.clientWidth, el.clientHeight) * 0.6 * Math.PI) / (TILE_SIZE * GLOBE_PERSPECTIVE)));
const WORLD_LAT = 30;

// Whole-world framing, which is also the furthest either view can zoom out: the flat map fills its
// container; the globe is a fixed size that fills the view, facing Europe / Asia.
const worldView = (projection, el) =>
  projection === "globe"
    ? // At latitude φ the same globe size is reached at zoom + log2(cos φ).
      { center: [40, WORLD_LAT], zoom: globeMinZoom(el) + Math.log2(Math.cos((WORLD_LAT * Math.PI) / 180)) }
    : { center: [0, 25], zoom: fitWorldZoom(el) };
const minZoomFor = (projection, el) => (projection === "globe" ? globeMinZoom(el) : fitWorldZoom(el));

// No atmosphere haze around the globe; it read as a shadow along the top edge.
const SKY = { "atmosphere-blend": 0 };

// Compact country names (smaller than the basemap's 10–14px defaults).
const COUNTRY_TEXT_SIZE = {
  place_country_major: ["interpolate", ["linear"], ["zoom"], 0, 9.5, 3, 11, 5, 13],
  place_country_minor: ["interpolate", ["linear"], ["zoom"], 0, 8.5, 4, 10, 7, 12],
  place_country_other: ["interpolate", ["linear"], ["zoom"], 0, 8.5, 4, 10, 7, 12],
};

// Oceans: near-black on the flat map; on the globe a slightly lighter black so the sphere stands out
// from the page background instead of blending into it.
const WATER = { mercator: "#050807", globe: "#111413" };

// Recolour OpenFreeMap's dark basemap into the app's zinc + emerald palette.
function applyTheme(map, projection) {
  const set = (id, prop, value) => {
    try {
      map.setPaintProperty(id, prop, value);
    } catch {}
  };
  for (const layer of map.getStyle().layers) {
    const { id, type } = layer;
    // Land is the background layer; a faint green tint keeps continents readable against the water.
    if (type === "background") set(id, "background-color", "#17201b");
    else if (type === "fill" && id === "water") set(id, "fill-color", WATER[projection] ?? WATER.mercator);
    else if (type === "fill") set(id, "fill-color", id.startsWith("building") ? "#232b26" : "#1a231e");
    else if (type === "line" && id.startsWith("boundary_country")) {
      set(id, "line-color", THEME.accent);
      set(id, "line-opacity", 0.45);
    } else if (type === "line" && id.startsWith("boundary")) {
      set(id, "line-color", THEME.accentDeep);
    } else if (type === "line" && id === "waterway") set(id, "line-color", "#0a1f18");
    else if (type === "line") set(id, "line-color", "#2a2a2f");
    else if (type === "symbol") {
      set(id, "text-color", id.startsWith("place_country") ? THEME.accentLight : THEME.label);
      set(id, "text-halo-color", THEME.ink);
      if (map.getLayoutProperty(id, "text-field")) map.setLayoutProperty(id, "text-field", ENGLISH_NAME);
      if (COUNTRY_TEXT_SIZE[id]) map.setLayoutProperty(id, "text-size", COUNTRY_TEXT_SIZE[id]);
    }
  }
}

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const FIT = { padding: 80, maxZoom: 5 };

// Camera that frames the results (or the focused one); with no results, the whole world.
function cameraFor(markers, focusId, projection, el) {
  const focused = markers.find((m) => m.id === focusId);
  const targets = focused ? [focused] : markers;
  if (!targets.length) return worldView(projection, el);
  if (targets.length === 1) {
    const [lat, lng] = targets[0].location;
    return { center: [lng, lat], zoom: focused ? 6 : 4 };
  }
  const bounds = new maplibregl.LngLatBounds();
  targets.forEach(({ location: [lat, lng] }) => bounds.extend([lng, lat]));
  return { bounds };
}

// Go straight to a camera: instantly, or as a short direct glide. Never flyTo, whose
// zoom-out-then-in arc is what made searches look like a double zoom.
function moveTo(map, camera, animate) {
  const opts = { duration: animate ? 700 : 0, essential: true };
  if (camera.bounds) map.fitBounds(camera.bounds, { ...FIT, ...opts });
  else map.easeTo({ ...camera, ...opts });
}

function createPin(map, marker, setTooltip) {
  const [lat, lng] = marker.location;
  const el = document.createElement("div");
  el.className = "map-pin";
  // Sized inline so a pin can never render at 0×0 if the stylesheet is missing or stale;
  // globals.css only adds the pulse animation.
  el.style.cssText = "width:18px;height:18px;cursor:pointer";
  el.innerHTML =
    `<span class="map-pin-ring" style="position:absolute;inset:-8px;border-radius:9999px;border:2px solid ${THEME.accentLight};pointer-events:none"></span>` +
    `<span class="map-pin-dot" style="position:absolute;inset:2px;border-radius:9999px;background:${THEME.accentLight};border:2.5px solid ${THEME.ink};box-shadow:0 0 0 1.5px ${THEME.accentLight},0 0 14px 2px ${THEME.accent}"></span>`;
  el.addEventListener("mouseenter", () => {
    const p = map.project([lng, lat]);
    setTooltip({ marker, x: p.x, y: p.y - 8 });
  });
  el.addEventListener("mouseleave", () => setTooltip(null));
  return new maplibregl.Marker({ element: el, anchor: "center", opacityWhenCovered: "0" }).setLngLat([lng, lat]);
}

export default function VectorMap({ markers, focusId, projection = "mercator", interactive = true }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const latest = useRef({ markers, focusId });
  const framed = useRef(null);
  const [map, setMap] = useState(null); // set once the style has loaded
  const [supported] = useState(hasWebGL);
  const [tooltip, setTooltip] = useState(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    latest.current = { markers, focusId };
  });

  // One map per projection; it stays mounted across searches so the view never blinks.
  useEffect(() => {
    if (!supported) return;
    const container = containerRef.current;
    const flat = projection === "mercator";
    const { markers: initialMarkers, focusId: initialFocus } = latest.current;
    const camera = cameraFor(initialMarkers, initialFocus, projection, container);
    const instance = new maplibregl.Map({
      container,
      style: STYLE_URL,
      // Open directly on the results.
      ...(camera.bounds ? { bounds: camera.bounds, fitBoundsOptions: FIT } : camera),
      maxZoom: 16.5,
      // Neither view zooms out past its whole-world size; the flat map also shows the world only once.
      minZoom: minZoomFor(projection, container),
      ...(flat && { renderWorldCopies: false }),
      interactive,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: { compact: true },
    });
    mapRef.current = instance;
    framed.current = { map: instance, markers: initialMarkers, focusId: initialFocus };
    instance.touchZoomRotate?.disableRotation();

    instance.on("style.load", () => {
      // Only switch for the globe: mercator is the default, and swapping the transform to it again
      // makes MapLibre 5 throw on the next view constraint (seen in Safari).
      if (!flat) {
        instance.setProjection({ type: "globe" });
        instance.setSky(SKY);
        // Re-apply the opening view: the constructor clamped it to minZoom in flat terms, before the
        // globe (which applies minZoom per latitude) was switched on.
        moveTo(instance, camera, false);
      }
      applyTheme(instance, projection);
      setMap(instance);
    });
    // Small previews keep the credits collapsed behind the (i) button.
    if (!interactive) {
      instance.once("load", () => container.querySelector(".maplibregl-compact-show")?.classList.remove("maplibregl-compact-show"));
    }
    instance.on("movestart", () => setTooltip(null));

    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      instance.resize();
      instance.setMinZoom(minZoomFor(projection, container));
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      setMap(null);
      instance.remove();
      mapRef.current = null;
    };
  }, [projection, interactive, supported]);

  // Swap the pins in place when the results change.
  useEffect(() => {
    if (!map) return;
    const pins = markers.map((m) => createPin(map, m, setTooltip).addTo(map));
    return () => pins.forEach((pin) => pin.remove());
  }, [map, markers]);

  // New results: jump straight to them. Focusing a listed location: a short direct glide.
  useEffect(() => {
    if (!map) return;
    const prev = framed.current;
    if (prev?.map === map && prev.markers === markers && prev.focusId === focusId) return;
    framed.current = { map, markers, focusId };
    const sameResults = prev?.map === map && prev.markers === markers;
    moveTo(map, cameraFor(markers, focusId, projection, map.getContainer()), sameResults);
  }, [map, markers, focusId, projection]);

  if (!supported) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-[13px] text-zinc-500">
        This browser can&apos;t run WebGL, which the map needs.
      </div>
    );
  }

  const fitResults = () => map && moveTo(map, cameraFor(markers, focusId, projection, map.getContainer()), true);
  const showWorld = () => map && moveTo(map, worldView(projection, map.getContainer()), true);

  return (
    <div className="vector-map relative h-full w-full overflow-hidden">
      {/* MapLibre forces position: relative on its container, so size it explicitly. */}
      <div ref={containerRef} className="h-full w-full" />
      {interactive && (
        <MapControls
          onZoomIn={() => mapRef.current?.zoomIn()}
          onZoomOut={() => mapRef.current?.zoomOut()}
          onReset={fitResults}
          onWorld={showWorld}
        />
      )}
      {tooltip && (
        <MarkerTooltip marker={tooltip.marker} style={tooltipStyle(tooltip.x, tooltip.y, size.width, size.height)} />
      )}
    </div>
  );
}
