"use client";

import { useEffect, useState } from "react";
import { getSources } from "@/services/api";

let request;

export function useSources() {
  const [sources, setSources] = useState([]);
  useEffect(() => {
    let active = true;
    request ??= getSources().catch(() => {
      request = undefined;
      return [];
    });
    request.then((list) => active && setSources(list));
    return () => {
      active = false;
    };
  }, []);
  return sources;
}
