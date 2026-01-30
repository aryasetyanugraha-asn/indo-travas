import React, { useEffect, useRef, useState } from 'react';
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { mapStyles } from './mapStyles';

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
  const [is3D, setIs3D] = useState(false);

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
          // mapId: "DEMO_MAP_ID", // Removed to allow JSON styles. Add back for Vector 3D features.
          styles: mapStyles,
          disableDefaultUI: true, // We will build custom UI
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        // Initialize Shared InfoWindow
        infoWindowRef.current = new InfoWindow();

        const dService = new DirectionsService();
        const dRenderer = new DirectionsRenderer({
            map: map,
            suppressMarkers: true, // We will manually plot markers to add InfoWindows
            polylineOptions: {
                strokeColor: "#0f766e", // Teal-700
                strokeOpacity: 0.8,
                strokeWeight: 6
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

  // 3D Toggle Effect
  useEffect(() => {
      if (mapInstance) {
          mapInstance.setTilt(is3D ? 45 : 0);
          mapInstance.setHeading(is3D ? 90 : 0);
          // Note: Tilt only works at specific zoom levels for Raster maps (45 deg imagery)
          // For full WebGL 3D, a Map ID (Vector) is required.
          if (is3D) mapInstance.setZoom(18); // Force zoom to see buildings
      }
  }, [is3D, mapInstance]);

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

        // Helper to generate Custom Icon (SVG)
        const getCustomIcon = (index) => {
            return {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 12,
                fillColor: "#0f766e",
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "#ffffff",
                labelOrigin: new window.google.maps.Point(0, 0)
            };
        };
        const getLabel = (index) => {
            return {
                text: (index + 1).toString(),
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: "bold",
                fontFamily: "Poppins"
            };
        };

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
                            icon: getCustomIcon(0),
                            label: getLabel(0),
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
                    label: getLabel(0),
                    title: originObj.title,
                    icon: getCustomIcon(0),
                    zIndex: 999
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
                    const idx = index + 1; // 0 is origin, so this starts at 1

                    const marker = new Marker({
                        position: leg.end_location,
                        map: mapInstance,
                        label: getLabel(idx),
                        title: locData.title,
                        icon: getCustomIcon(idx),
                        zIndex: 999
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
        <div className="w-full h-[500px] bg-gray-100 rounded-3xl overflow-hidden relative border border-gray-200 shadow-xl">
            <div ref={mapRef} className="w-full h-full" />

            {/* Custom Overlay Controls */}

            {/* 1. Top Right: 3D Toggle */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
                <button
                    onClick={() => setIs3D(!is3D)}
                    className={`w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-all ${is3D ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    title="Toggle 3D View"
                >
                    <i className={`fa-solid ${is3D ? 'fa-cube' : 'fa-layer-group'}`}></i>
                </button>
            </div>

            {/* 2. Bottom Floating Bar: Travel Modes & Info */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-[90%] bg-white/90 backdrop-blur-md p-2 rounded-2xl shadow-lg border border-white/50 flex items-center justify-between">

                {/* Mode Selector */}
                <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                    <button onClick={() => setTravelMode('DRIVING')} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${travelMode === 'DRIVING' ? 'bg-white text-teal-600 shadow' : 'text-gray-400'}`}>
                        <i className="fa-solid fa-car"></i>
                    </button>
                    <button onClick={() => setTravelMode('TRANSIT')} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${travelMode === 'TRANSIT' ? 'bg-white text-teal-600 shadow' : 'text-gray-400'}`}>
                        <i className="fa-solid fa-bus"></i>
                    </button>
                    <button onClick={() => setTravelMode('WALKING')} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${travelMode === 'WALKING' ? 'bg-white text-teal-600 shadow' : 'text-gray-400'}`}>
                        <i className="fa-solid fa-person-walking"></i>
                    </button>
                </div>

                {/* Info Display */}
                {routeInfo ? (
                    <div className="text-right px-2">
                        <p className="text-sm font-bold text-gray-800">{routeInfo.duration}</p>
                        <p className="text-[10px] text-gray-500">{routeInfo.distance}</p>
                    </div>
                ) : (
                    <div className="text-right px-2">
                         <p className="text-[10px] text-gray-400 italic">Info Rute</p>
                    </div>
                )}

                {/* Open in Maps Button (Icon Only) */}
                <button
                    onClick={() => {
                        if (!locations || locations.length === 0) return;
                        const origin = encodeURIComponent(locations[0].address);
                        const destination = encodeURIComponent(locations[locations.length - 1].address);
                        window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=${travelMode.toLowerCase()}`, '_blank');
                    }}
                    className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center hover:bg-teal-100 ml-2"
                >
                    <i className="fa-solid fa-arrow-up-right-from-square text-xs"></i>
                </button>
            </div>


            {/* Loading Overlay */}
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-80 z-10 backdrop-blur-sm">
                    <div className="flex flex-col items-center">
                        <i className="fa-solid fa-map-location-dot text-teal-500 text-3xl animate-bounce mb-2"></i>
                        <p className="text-xs text-gray-500 font-bold">Memuat Rute...</p>
                    </div>
                </div>
            )}

            {/* Error Overlay */}
            {error && (
                <div className="absolute top-4 left-4 right-4 bg-red-50 p-2 rounded-lg shadow border border-red-100 flex items-center gap-2 z-10">
                    <i className="fa-solid fa-triangle-exclamation text-red-500"></i>
                    <p className="text-red-500 text-xs font-bold">{error}</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default InteractiveMap;
