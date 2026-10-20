"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

const HISTORY_KEY = "geoip-history";

// Search state shared by the lookup and map pages; the query is mirrored into ?q= so
// results can be shared and carried between pages.
export default function useLookup() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [searched, setSearched] = useState("");
  // Each search (or clear) gets a new id, so a slow response can't overwrite a newer state.
  const requestId = useRef(0);

  function loadHistory() {
    try { setHistory(JSON.parse(localStorage.getItem(HISTORY_KEY)) ?? []); } catch {}
  }

  function clear() {
    requestId.current++;
    setData(null);
    setError(null);
    setLoading(false);
    setSearched("");
    window.history.replaceState(null, "", window.location.pathname);
  }

  // Emptying the search box clears the previous result too.
  function updateQuery(value) {
    setQuery(value);
    if (!value.trim()) clear();
  }

  async function run(q) {
    q = q.trim();
    if (!q) return;
    const id = ++requestId.current;
    setQuery(q);
    setLoading(true);
    setError(null);
    try {
      const result = await api(`/api/lookup?q=${encodeURIComponent(q)}`);
      if (id !== requestId.current) return;
      setData(result);
      setSearched(q);
      setHistory((prev) => {
        const next = [q, ...prev.filter((h) => h !== q)].slice(0, 8);
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
        return next;
      });
      window.history.replaceState(null, "", `?q=${encodeURIComponent(q)}`);
    } catch (e) {
      if (id !== requestId.current) return;
      setData(null);
      setError(e.message);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  useEffect(() => {
    // localStorage only exists on the client, so it has to be read after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHistory();
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) run(q);
  }, []);

  return { query, setQuery: updateQuery, clear, data, error, loading, history, run, searched };
}
