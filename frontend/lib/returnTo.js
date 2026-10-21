export function safeReturnTo(value, fallback = "/") {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/login")
    ? value
    : fallback;
}

export const loginPath = (returnTo) =>
  returnTo && returnTo !== "/" ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login";
