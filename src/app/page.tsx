import MapComponent from "@/components/MapComponent";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24 bg-gray-50">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8 text-black">
          Position History
        </h1>
        <p className="text-center mb-12 text-gray-600">
          Tracking the last 100 locations sent to the{" "}
          <code className="bg-gray-200 px-2 py-1 rounded">/api/location</code>{" "}
          endpoint.
        </p>

        <div className="w-full bg-white p-4 rounded-xl shadow-lg">
          <MapComponent />
        </div>

        <div className="mt-8 text-center text-gray-500 text-xs">
          Auto-updates every 10 seconds.
        </div>
      </div>
    </main>
  );
}
