import RequireAuth from "@/components/auth/RequireAuth";

export const instant = false;

export default function AppLayout({ children }) {
  return <RequireAuth>{children}</RequireAuth>;
}
