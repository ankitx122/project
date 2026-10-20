"use client";

import { useEffect, useState } from "react";
import { api } from "./api";

// The data sources the backend is configured with (from its .env), for credits in the UI.
// Fetched once and shared by every component that asks.
let request;

export function useSources() {
  const [sources, setSources] = useState([]);
  useEffect(() => {
    let active = true;
    request ??= api("/api/sources").catch(() => {
      request = undefined; // retry on the next mount
      return [];
    });
    request.then((list) => active && setSources(list));
    return () => {
      active = false;
    };
  }, []);
  return sources;
}
