import BulkLookup from "@/components/bulk/BulkLookup";

export const metadata = {
  title: "Bulk lookup · IP Intelligence",
};

export default function BulkPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-10 sm:px-6">
      <BulkLookup />
    </main>
  );
}
