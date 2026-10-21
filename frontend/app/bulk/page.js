import RequireAuth from "@/components/auth/RequireAuth";
import BulkLookup from "@/components/bulk/BulkLookup";

export const metadata = {
  title: "Bulk lookup · IP Intelligence",
};

export const instant = false;

export default function BulkPage() {
  return (
    <RequireAuth>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-10 sm:px-6">
        <BulkLookup />
      </main>
    </RequireAuth>
  );
}
