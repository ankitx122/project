import RequireAuth from "@/components/auth/RequireAuth";
import Lookup from "@/components/lookup/Lookup";

export const instant = false;

export default function Home() {
  return (
    <RequireAuth>
      <main className="flex-1">
        <Lookup />
      </main>
    </RequireAuth>
  );
}
