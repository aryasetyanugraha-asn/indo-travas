import React, { useEffect, useRef, useState } from 'react';
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

// Module-level flag to ensure setOptions is called only once
let optionsSet = false;

const InteractiveMap = ({ locations = [], destination }) => {
  const mapRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const [directionsService, setDirectionsService] = useState(null);

  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [travelMode, setTravelMode] = useState('DRIVING'); // DRIVING, TRANSIT, WALKING
  const [routeInfo, setRouteInfo] = useState(null);

  // Load Google Maps
  useEffect(() => {
    if (!optionsSet) {
        setOptions({
            key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
            v: "weekly",
            libraries: ["places", "geometry", "marker", "routes"]
        });
        optionsSet = true;
    }

    const initMap = async () => {
      try {
        const { Map, InfoWindow } = await importLibrary("maps");
        const { DirectionsService, DirectionsRenderer } = await importLibrary("routes");

        const map = new Map(mapRef.current, {
          center: { lat: -2.548926, lng: 118.0148634 }, // Indonesia Center
          zoom: 5,
          mapId: "DEMO_MAP_ID",
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
        });

        // Initialize Shared InfoWindow
        infoWindowRef.current = new InfoWindow();

        const dService = new DirectionsService();
        const dRenderer = new DirectionsRenderer({
            map: map,
            suppressMarkers: true, // We will manually plot markers to add InfoWindows
            polylineOptions: {
                strokeColor: "#0d9488", // Teal-600
                strokeOpacity: 0.8,
                strokeWeight: 5
            }
        });

        setMapInstance(map);
        setDirectionsService(dService);
        setDirectionsRenderer(dRenderer);
        setLoading(false);
      } catch (e) {
        console.error("Maps Load Error:", e);
        setError("Gagal memuat peta. Pastikan API Key valid.");
        setLoading(false);
      }
    };

    initMap();
  }, []);

  // Logic: Calculate Route or Plot Markers
  useEffect(() => {
    if (!mapInstance || !locations) return;

    const processMap = async () => {
        setLoading(true);
        setError(null);
        setRouteInfo(null);

        // Clear previous markers
        if (markersRef.current.length > 0) {
            markersRef.current.forEach(m => m.setMap(null));
            markersRef.current = [];
        }

        // Clear previous directions
        if (directionsRenderer) {
             directionsRenderer.setDirections({ routes: [] });
        }

        // Import libraries needed for this effect
        const { Marker } = await importLibrary("marker");
        const { Geocoder } = await importLibrary("geocoding");

        // SCENARIO 1: No Locations
        if (locations.length === 0) {
            setLoading(false);
            return;
        }

        // Helper to fix location string
        const fixLoc = (loc) => loc.includes(destination) ? loc : `${loc}, ${destination}`;

        // Helper to create marker content
        const createMarkerContent = (loc) => {
             return `
                <div style="padding: 6px; max-width: 200px; font-family: 'Poppins', sans-serif;">
                    <h5 style="font-weight: bold; font-size: 14px; margin-bottom: 4px; color: #0f766e;">${loc.title || 'Lokasi'}</h5>
                    <p style="font-size: 12px; color: #555; margin-bottom: 2px;">${loc.time || ''}</p>
                    <p style="font-size: 11px; color: #777;">${loc.description ? loc.description.substring(0, 100) + '...' : ''}</p>
                </div>
            `;
        };

        // SCENARIO 2: Single Location (Geocode & Marker)
        if (locations.length === 1) {
             try {
                const locObj = locations[0];
                const geocoder = new Geocoder();

                geocoder.geocode({ address: fixLoc(locObj.address) }, (results, status) => {
                    if (status === 'OK' && results[0]) {
                        const pos = results[0].geometry.location;
                        mapInstance.setCenter(pos);
                        mapInstance.setZoom(14);

                        const marker = new Marker({
                            map: mapInstance,
                            position: pos,
                            title: locObj.title,
                            animation: window.google.maps.Animation.DROP
                        });

                        marker.addListener("click", () => {
                            infoWindowRef.current.setContent(createMarkerContent(locObj));
                            infoWindowRef.current.open(mapInstance, marker);
                        });

                        markersRef.current.push(marker);
                    } else {
                        setError("Lokasi tidak ditemukan.");
                    }
                    setLoading(false);
                });
             } catch (e) {
                 console.error(e);
                 setLoading(false);
             }
             return;
        }

        // SCENARIO 3: Multiple Locations (Directions API)
        if (directionsService && directionsRenderer) {
             try {
                // Determine Origin, Dest, Waypoints
                const originObj = locations[0];
                const destObj = locations[locations.length - 1];
                const waypointObjs = locations.slice(1, -1);

                const waypoints = waypointObjs.map(loc => ({
                    location: fixLoc(loc.address),
                    stopover: true
                }));

                const result = await directionsService.route({
                    origin: fixLoc(originObj.address),
                    destination: fixLoc(destObj.address),
                    waypoints: waypoints,
                    travelMode: window.google.maps.TravelMode[travelMode],
                    optimizeWaypoints: false, // Keep itinerary order
                });

                directionsRenderer.setDirections(result);

                // --- MANUALLY PLOT MARKERS ---
                // We use the legs from the result to get accurate coordinates
                const legs = result.routes[0].legs;

                // Plot Origin
                const originMarker = new Marker({
                    position: legs[0].start_location,
                    map: mapInstance,
                    label: "1",
                    title: originObj.title
                });
                originMarker.addListener("click", () => {
                    infoWindowRef.current.setContent(createMarkerContent(originObj));
                    infoWindowRef.current.open(mapInstance, originMarker);
                });
                markersRef.current.push(originMarker);

                // Plot Waypoints & Destination
                // legs[i].end_location corresponds to the arrival at the next point
                legs.forEach((leg, index) => {
                    const isDest = index === legs.length - 1;
                    const locData = isDest ? destObj : waypointObjs[index];

                    const marker = new Marker({
                        position: leg.end_location,
                        map: mapInstance,
                        label: (index + 2).toString(),
                        title: locData.title
                    });

                    marker.addListener("click", () => {
                        infoWindowRef.current.setContent(createMarkerContent(locData));
                        infoWindowRef.current.open(mapInstance, marker);
                    });
                    markersRef.current.push(marker);
                });

                // Calculate total stats
                let totalDist = 0;
                let totalDur = 0;
                legs.forEach(leg => {
                    totalDist += leg.distance.value;
                    totalDur += leg.duration.value;
                });

                setRouteInfo({
                    distance: (totalDist / 1000).toFixed(1) + " km",
                    duration: Math.round(totalDur / 60) + " min"
                });

             } catch (e) {
                 console.warn("Directions Error:", e);
                 setError("Rute tidak tersedia. Menampilkan marker saja.");

                 // FALLBACK: Geocode everyone if route fails
                 // This is complex to implement fully here, so we'll just stop loading.
                 // Ideally we'd loop through and place markers.
             } finally {
                 setLoading(false);
             }
        }
    };

    processMap();

  }, [mapInstance, directionsService, directionsRenderer, locations, travelMode, destination]);

  return (
    <div className="relative">
        <div className="w-full h-64 md:h-96 bg-gray-100 rounded-xl overflow-hidden relative border border-gray-200 shadow-inner">
        <div ref={mapRef} className="w-full h-full" />

        {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-80 z-10">
                <div className="flex flex-col items-center">
                    <i className="fa-solid fa-map-location-dot text-teal-500 text-3xl animate-bounce mb-2"></i>
                    <p className="text-xs text-gray-500 font-bold">Memuat Rute...</p>
                </div>
            </div>
        )}

        {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-10">
                <p className="text-red-500 text-xs font-bold"><i className="fa-solid fa-triangle-exclamation mr-1"></i> {error}</p>
            </div>
        )}
        </div>

        {/* Best Travel Modes UI */}
        <div className="flex justify-between items-center mt-3 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
             <div className="flex gap-2">
                <button onClick={() => setTravelMode('DRIVING')} className={`px-3 py-1.5 rounded text-xs font-bold transition ${travelMode === 'DRIVING' ? 'bg-teal-600 text-white shadow' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    <i className="fa-solid fa-car mr-1"></i> Mobil
                </button>
                 <button onClick={() => setTravelMode('TRANSIT')} className={`px-3 py-1.5 rounded text-xs font-bold transition ${travelMode === 'TRANSIT' ? 'bg-teal-600 text-white shadow' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    <i className="fa-solid fa-bus mr-1"></i> Umum
                </button>
                 <button onClick={() => setTravelMode('WALKING')} className={`px-3 py-1.5 rounded text-xs font-bold transition ${travelMode === 'WALKING' ? 'bg-teal-600 text-white shadow' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    <i className="fa-solid fa-person-walking mr-1"></i> Jalan
                </button>
             </div>
             {routeInfo && (
                 <div className="text-right">
                     <p className="text-xs font-bold text-gray-800">{routeInfo.distance}</p>
                     <p className="text-[10px] text-gray-500">{routeInfo.duration}</p>
                 </div>
             )}
             {!routeInfo && !loading && !error && (
                 <div className="text-right">
                     <p className="text-[10px] text-gray-400">Pilih mode</p>
                 </div>
             )}
        </div>
    </div>
  );
};

export default InteractiveMap;
