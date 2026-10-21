import client from "./client";

export const getWatchlists = (q) => client.get("/api/watchlists", { params: q ? { q } : undefined });

export const createWatchlist = ({ name, description }) => client.post("/api/watchlists", { name, description });

export const getWatchlist = (id) => client.get(`/api/watchlists/${encodeURIComponent(id)}`);

export const updateWatchlist = (id, { name, description }) =>
  client.patch(`/api/watchlists/${encodeURIComponent(id)}`, { name, description });

export const deleteWatchlist = (id) => client.delete(`/api/watchlists/${encodeURIComponent(id)}`);

export const addWatchlistItems = (id, items) => client.post(`/api/watchlists/${encodeURIComponent(id)}/items`, { items });

export const updateWatchlistItem = (id, itemId, { note }) =>
  client.patch(`/api/watchlists/${encodeURIComponent(id)}/items/${encodeURIComponent(itemId)}`, { note });

export const removeWatchlistItem = (id, itemId) =>
  client.delete(`/api/watchlists/${encodeURIComponent(id)}/items/${encodeURIComponent(itemId)}`);
