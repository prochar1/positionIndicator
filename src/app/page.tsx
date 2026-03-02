import MapComponent from "@/components/MapComponent";

export default function Home() {
  return (
    <main className="h-screen w-screen m-0 p-0 overflow-hidden relative">
      {/* Plovoucí ovládací panel (nenápadný nahoře vpravo) */}
      <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg pointer-events-none text-sm border border-gray-200">
        <h1 className="font-bold text-gray-800">Live Position</h1>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-gray-500 text-xs text-nowrap">
            Auto-updating (10s)
          </span>
        </div>
      </div>

      {/* Zajištění, že mapa zabere celý prostor okna (viewport) */}
      <div className="w-full h-full">
        <MapComponent />
      </div>
    </main>
  );
}
