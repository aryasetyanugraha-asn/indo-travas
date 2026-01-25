import React, { useEffect, useRef, useState } from 'react';
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

// Module-level flag to ensure setOptions is called only once
let optionsSet = false;

const InteractiveMap = ({ locations = [], destination }) => {
  const mapRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load Google Maps
  useEffect(() => {
    if (!optionsSet) {
        setOptions({
            key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
            v: "weekly",
            libraries: ["places", "geometry", "marker"]
        });
        optionsSet = true;
    }

    const initMap = async () => {
      try {
        const { Map } = await importLibrary("maps");

        const map = new Map(mapRef.current, {
          center: { lat: -2.548926, lng: 118.0148634 }, // Indonesia Center
          zoom: 5,
          mapId: "DEMO_MAP_ID", // Required for Advanced Markers (optional)
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
        });

        setMapInstance(map);
        setLoading(false);
      } catch (e) {
        console.error("Maps Load Error:", e);
        setError("Gagal memuat peta. Pastikan API Key valid.");
        setLoading(false);
      }
    };

    initMap();
  }, []);

  // Plot Markers when map & locations are ready
  useEffect(() => {
    if (!mapInstance || !locations || locations.length === 0) return;

    const plotLocations = async () => {
      const { Geocoder } = await importLibrary("geocoding");
      const { Marker } = await importLibrary("marker");
      const { LatLngBounds } = await importLibrary("core");
      const { Polyline } = await importLibrary("maps");

      const geocoder = new Geocoder();
      const bounds = new LatLngBounds();
      const pathCoordinates = [];

      // Helper to geocode with delay to avoid RATE_LIMIT
      const geocodeAddress = (address, delay) => new Promise((resolve) => {
        setTimeout(() => {
            // Append destination context if needed
            const query = address.includes(destination) ? address : `${address}, ${destination}`;

            geocoder.geocode({ address: query }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    resolve(results[0].geometry.location);
                } else {
                    console.warn(`Geocode failed for ${address}: ${status}`);
                    resolve(null);
                }
            });
        }, delay);
      });

      // Process locations sequentially to be safe with rate limits
      for (let i = 0; i < locations.length; i++) {
        const locationName = locations[i];
        const position = await geocodeAddress(locationName, i * 300); // 300ms delay stagger

        if (position) {
            new Marker({
                map: mapInstance,
                position: position,
                title: locationName,
                label: {
                    text: `${i + 1}`,
                    color: "white",
                    fontWeight: "bold"
                }
            });

            bounds.extend(position);
            pathCoordinates.push(position);
        }
      }

      // Draw Polyline
      if (pathCoordinates.length > 1) {
          const line = new Polyline({
              path: pathCoordinates,
              geodesic: true,
              strokeColor: "#0d9488", // Teal-600
              strokeOpacity: 1.0,
              strokeWeight: 2,
          });
          line.setMap(mapInstance);
      }

      // Fit bounds
      if (!bounds.isEmpty()) {
          mapInstance.fitBounds(bounds);
      }
    };

    plotLocations();

  }, [mapInstance, locations, destination]);

  return (
    <div className="w-full h-64 md:h-96 bg-gray-100 rounded-xl overflow-hidden relative border border-gray-200 shadow-inner">
      <div ref={mapRef} className="w-full h-full" />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-80 z-10">
            <div className="flex flex-col items-center">
                <i className="fa-solid fa-map-location-dot text-teal-500 text-3xl animate-bounce mb-2"></i>
                <p className="text-xs text-gray-500 font-bold">Memuat Peta...</p>
            </div>
        </div>
      )}

      {error && (
         <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-10">
            <p className="text-red-500 text-xs font-bold"><i className="fa-solid fa-triangle-exclamation mr-1"></i> {error}</p>
        </div>
      )}
    </div>
  );
};

export default InteractiveMap;
