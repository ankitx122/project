import client, { API_URL } from "./client";

export const getMe = () => client.get("/api/me");

export const logout = () => client.post("/auth/logout");

export const googleSignInUrl = (returnTo = "/profile") =>
  `${API_URL}/auth/google?returnTo=${encodeURIComponent(returnTo)}`;

export const getHistory = (limit = 100) => client.get("/api/me/history", { params: { limit } });

export const clearHistory = () => client.delete("/api/me/history");
