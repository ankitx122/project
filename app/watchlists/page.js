import Watchlists from "@/components/watchlists/Watchlists";

export const metadata = {
  title: "Watchlists · IP Intelligence",
};

export default function WatchlistsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-10 sm:px-6">
      <Watchlists />
    </main>
  );
}
