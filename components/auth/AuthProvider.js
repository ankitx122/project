"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getMe, logout } from "@/services/api";

const AuthContext = createContext({ user: null, loading: true, refresh: async () => {}, signOut: async () => {} });

export default function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, loading: true, error: null });

  const loadMe = () =>
    getMe().then(
      (data) => ({ user: data.user, loading: false, error: null }),
      (e) => ({ user: null, loading: false, error: e.message }),
    );

  const refresh = useCallback(() => loadMe().then(setState), []);

  const signOut = useCallback(async () => {
    try {
      await logout();
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
