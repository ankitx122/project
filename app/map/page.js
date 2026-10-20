import MapExplorer from "@/components/geo/MapExplorer";

export const metadata = {
  title: "Map · IP Intelligence",
};

export default function MapPage() {
  return (
    <main className="flex-1">
      <h1 className="sr-only">Map</h1>
      <MapExplorer />
    </main>
  );
}
