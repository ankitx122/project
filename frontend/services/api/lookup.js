import client from "./client";

export const lookup = (q) => client.get("/api/lookup", { params: { q } });

export const whois = (q) => client.get("/api/whois", { params: { q } });

export const bulkLookup = (items) => client.post("/api/bulk", { items });

export const getSources = () => client.get("/api/sources");
