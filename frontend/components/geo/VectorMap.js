"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import MapControls from "./MapControls";
import MarkerTooltip from "./MarkerTooltip";
import { tooltipStyle } from "./markers";
import { THEME } from "./theme";

const STYLE_URL = "https://tiles.openfreemap.org/styles/dark";
const TILE_SIZE = 512;

const ENGLISH_NAME = ["coalesce", ["get", "name:en"], ["get", "name_en"], ["get", "name:latin"], ["get", "name"]];

const fitWorldZoom = (el) => Math.max(0, Math.log2(Math.max(el.clientWidth, el.clientHeight) / TILE_SIZE));

const GLOBE_PERSPECTIVE = 0.755;
const globeMinZoom = (el) =>
  Math.max(0, Math.log2((Math.min(el.clientWidth, el.clientHeight) * 0.6 * Math.PI) / (TILE_SIZE * GLOBE_PERSPECTIVE)));
const WORLD_LAT = 30;

const worldView = (projection, el) =>
  projection === "globe"
    ? { center: [40, WORLD_LAT], zoom: globeMinZoom(el) + Math.log2(Math.cos((WORLD_LAT * Math.PI) / 180)) }
    : { center: [0, 25], zoom: fitWorldZoom(el) };
const minZoomFor = (projection, el) => (projection === "globe" ? globeMinZoom(el) : fitWorldZoom(el));

const SKY = { "atmosphere-blend": 0 };

const COUNTRY_TEXT_SIZE = {
  place_country_major: ["interpolate", ["linear"], ["zoom"], 0, 9.5, 3, 11, 5, 13],
  place_country_minor: ["interpolate", ["linear"], ["zoom"], 0, 8.5, 4, 10, 7, 12],
  place_country_other: ["interpolate", ["linear"], ["zoom"], 0, 8.5, 4, 10, 7, 12],
};

const WATER = { mercator: "#050807", globe: "#111413" };

function applyTheme(map, projection) {
  const set = (id, prop, value) => {
    try {
      map.setPaintProperty(id, prop, value);
    } catch {}
  };
  for (const layer of map.getStyle().layers) {
    const { id, type } = layer;
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

function moveTo(map, camera, animate) {
  const opts = { duration: animate ? 700 : 0, essential: true };
  if (camera.bounds) map.fitBounds(camera.bounds, { ...FIT, ...opts });
  else map.easeTo({ ...camera, ...opts });
}

function createPin(map, marker, setTooltip) {
  const [lat, lng] = marker.location;
  const el = document.createElement("div");
  el.className = "map-pin";
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
  const [map, setMap] = useState(null);
  const [supported] = useState(hasWebGL);
  const [tooltip, setTooltip] = useState(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    latest.current = { markers, focusId };
  });

  useEffect(() => {
    if (!supported) return;
    const container = containerRef.current;
    const flat = projection === "mercator";
    const { markers: initialMarkers, focusId: initialFocus } = latest.current;
    const camera = cameraFor(initialMarkers, initialFocus, projection, container);
    const instance = new maplibregl.Map({
      container,
      style: STYLE_URL,
      ...(camera.bounds ? { bounds: camera.bounds, fitBoundsOptions: FIT } : camera),
      maxZoom: 16.5,
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
      if (!flat) {
        instance.setProjection({ type: "globe" });
        instance.setSky(SKY);
        moveTo(instance, camera, false);
      }
      applyTheme(instance, projection);
      setMap(instance);
    });
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

  useEffect(() => {
    if (!map) return;
    const pins = markers.map((m) => createPin(map, m, setTooltip).addTo(map));
    return () => pins.forEach((pin) => pin.remove());
  }, [map, markers]);

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
