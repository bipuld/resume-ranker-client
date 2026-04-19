import { useEffect, useRef, useState } from "react";
import { Loader2, Search, LocateFixed } from "lucide-react";

type LocationPickerProps = {
  latitude: string;
  longitude: string;
  onLocationChange: (lat: string, lng: string) => void;
  onError?: (error: string) => void;
};

// Extend Window type for Leaflet
declare global {
  interface Window {
    L: any;
  }
}

export default function LocationPicker({
  latitude,
  longitude,
  onLocationChange,
  onError,
}: LocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const marker = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<
    Array<{ display_name: string; lat: string; lon: string }>
  >([]);

  useEffect(() => {
    // Load Leaflet from CDN
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

    document.head.appendChild(link);
    document.head.appendChild(script);

    script.onload = () => {
      initializeMap();
      setIsLoading(false);
    };

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();

    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsSearching(true);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        const results = await response.json();
        setSuggestions(Array.isArray(results) ? results : []);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [searchQuery]);

  const initializeMap = () => {
    if (!mapContainer.current || !window.L) return;

    const LAT = latitude ? parseFloat(latitude) : 27.7172;
    const LNG = longitude ? parseFloat(longitude) : 85.324;

    map.current = (window.L as any).map(mapContainer.current).setView([LAT, LNG], 13);

    // Add OpenStreetMap tiles
    (window.L as any).tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map.current);

    // Add marker if coordinates exist
    if (latitude && longitude) {
      addMarker(LAT, LNG);
    }

    // Handle map clicks for location selection
    map.current.on("click", (e: any) => {
      const lat = e.latlng.lat.toFixed(6);
      const lng = e.latlng.lng.toFixed(6);
      addMarker(parseFloat(lat), parseFloat(lng));
      onLocationChange(lat, lng);
    });
  };

  const addMarker = (lat: number, lng: number) => {
    if (!window.L) return;

    if (marker.current) {
      map.current.removeLayer(marker.current);
    }

    marker.current = (window.L as any).marker([lat, lng], {
      icon: (window.L as any).icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
    })
      .bindPopup(`<strong>Selected Location</strong><br/>Lat: ${lat}<br/>Lng: ${lng}`)
      .addTo(map.current)
      .openPopup();

    map.current.setView([lat, lng], 13);
  };

  const handleGetCurrentLocation = () => {
    setIsLoading(true);
    if (!navigator.geolocation) {
      onError?.("Geolocation is not supported by your browser");
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        const latStr = lat.toFixed(6);
        const lngStr = lng.toFixed(6);
        onLocationChange(latStr, lngStr);
        addMarker(lat, lng);
        setIsLoading(false);
      },
      (err) => {
        onError?.(`Failed to get location: ${err.message}`);
        setIsLoading(false);
      }
    );
  };

  const handleSearchAddress = async () => {
    const address = searchQuery.trim();
    if (!address) {
      onError?.("Enter a place to search");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
      );
      const results = await response.json();

      if (results.length === 0) {
        onError?.("Address not found");
        setIsLoading(false);
        return;
      }

      const { lat, lon } = results[0];
      const latStr = parseFloat(lat).toFixed(6);
      const lngStr = parseFloat(lon).toFixed(6);
      onLocationChange(latStr, lngStr);
      addMarker(parseFloat(latStr), parseFloat(lngStr));
      setSearchQuery(results[0].display_name || address);
      setSuggestions([]);
    } catch (err) {
      onError?.("Failed to search address");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSuggestion = (suggestion: { display_name: string; lat: string; lon: string }) => {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);
    const latStr = lat.toFixed(6);
    const lngStr = lng.toFixed(6);

    setSearchQuery(suggestion.display_name);
    setSuggestions([]);
    onLocationChange(latStr, lngStr);
    addMarker(lat, lng);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/70">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-cyan-700 dark:text-cyan-300">Pin your office</p>
          <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">Select a precise location on the map</h3>
        </div>
        <span className="rounded-full border border-cyan-300 bg-cyan-50 px-2 py-1 text-[11px] font-semibold text-cyan-700 dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-300">Interactive</span>
      </div>

      <div className="relative h-72 w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700" ref={mapContainer}>
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/85 text-slate-700 dark:bg-slate-900/85 dark:text-slate-200">
            <Loader2 size={32} className="animate-spin" />
            <p className="text-sm font-medium">Loading map...</p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900">
              <Search size={16} className="text-slate-500 dark:text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearchAddress();
                  }
                }}
                placeholder="Search place, city, or landmark"
                autoComplete="off"
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              {isSearching && <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Searching</span>}
            </div>

            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900" role="listbox">
                {suggestions.map((suggestion) => (
                  <button
                    key={`${suggestion.lat}-${suggestion.lon}-${suggestion.display_name}`}
                    type="button"
                    className="block w-full rounded-lg px-2 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => handleSelectSuggestion(suggestion)}
                  >
                    <span className="block text-xs font-medium text-slate-800 dark:text-slate-100">{suggestion.display_name}</span>
                    <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">
                      {parseFloat(suggestion.lat).toFixed(4)}, {parseFloat(suggestion.lon).toFixed(4)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-blue-700 disabled:opacity-60"
            onClick={handleSearchAddress}
            disabled={isLoading}
          >
            Search
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">Latitude</label>
            <input
              type="text"
              value={latitude}
              readOnly
              placeholder="Click on map or use options below"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">Longitude</label>
            <input type="text" value={longitude} readOnly placeholder="" className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" />
          </div>
        </div>

        <div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-300 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100 disabled:opacity-60 dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-300 dark:hover:bg-cyan-500/20"
            onClick={handleGetCurrentLocation}
            disabled={isLoading}
          >
            <LocateFixed size={14} />
            Current Location
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Click anywhere on the map, or use the buttons above to set a precise location.
        </p>
      </div>
    </div>
  );
}
