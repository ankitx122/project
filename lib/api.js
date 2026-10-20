// Client for the separate backend API (osint-backend). Cookies are sent so the session works.
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

export async function api(path, init = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { credentials: "include", ...init });
  } catch {
    throw new Error(`Can't reach the API at ${API_URL}. Is the backend running?`);
  }
  if (res.status === 204) return null;
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.message !== "success") throw new Error(json?.data?.error ?? `Request failed (${res.status})`);
  return json.data;
}

// Full-page navigation to the API, which redirects on to Google and back.
export const googleSignInUrl = (returnTo = "/profile") =>
  `${API_URL}/auth/google?returnTo=${encodeURIComponent(returnTo)}`;
