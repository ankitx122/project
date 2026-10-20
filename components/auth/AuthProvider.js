"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext({ user: null, loading: true, refresh: async () => {}, signOut: async () => {} });

// Holds the signed-in user (from the API's session cookie) for the whole app.
export default function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, loading: true, error: null });

  const loadMe = () =>
    api("/api/me").then(
      (data) => ({ user: data.user, loading: false, error: null }),
      (e) => ({ user: null, loading: false, error: e.message }),
    );

  const refresh = useCallback(() => loadMe().then(setState), []);

  const signOut = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      setState({ user: null, loading: false, error: null });
    }
  }, []);

  useEffect(() => {
    let active = true;
    loadMe().then((next) => active && setState(next));
    return () => {
      active = false;
    };
  }, []);

  return <AuthContext value={{ ...state, refresh, signOut }}>{children}</AuthContext>;
}

export const useAuth = () => useContext(AuthContext);
