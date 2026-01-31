import React, { useEffect, useRef, useState } from 'react';
import { importLibrary } from "@googlemaps/js-api-loader";
import { initGoogleMaps } from '../utils/googleMapsLoader';

const InteractiveMap = ({ locations = [], destination }) => {
  const mapRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const [directionsService, setDirectionsService] = useState(null);

  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);
  const boundsRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [travelMode, setTravelMode] = useState('DRIVING'); // DRIVING, TRANSIT, WALKING
  const [routeInfo, setRouteInfo] = useState(null);
  const [is3D, setIs3D] = useState(false);

  // Load Google Maps
  useEffect(() => {
    initGoogleMaps();

    const initMap = async () => {
      try {
        const { Map, InfoWindow } = await importLibrary("maps");
        const { DirectionsService, DirectionsRenderer } = await importLibrary("routes");

        const map = new Map(mapRef.current, {
          center: { lat: -2.548926, lng: 118.0148634 }, // Indonesia Center
          zoom: 5,
          mapId: "DEMO_MAP_ID", // Required for AdvancedMarkerElement
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
        const { AdvancedMarkerElement } = await importLibrary("marker");
        const { Geocoder } = await importLibrary("geocoding");

        // Helper to create custom marker element (Teal Pin)
        const createMarkerElement = (index) => {
            const div = document.createElement('div');
            div.innerHTML = `
                <div style="
                    background-color: #0f766e;
                    color: white;
                    width: 32px;
                    height: 32px;
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                    border: 2px solid white;
                    cursor: pointer;
                    transition: transform 0.2s;
                ">
                    <span style="transform: rotate(45deg); font-weight: bold; font-size: 14px; font-family: 'Poppins', sans-serif;">${index + 1}</span>
                </div>
            `;
            // Add hover effect
            div.addEventListener('mouseenter', () => {
                div.firstElementChild.style.transform = 'rotate(-45deg) scale(1.1)';
            });
            div.addEventListener('mouseleave', () => {
                div.firstElementChild.style.transform = 'rotate(-45deg) scale(1.0)';
            });
            return div;
        };

        // SCENARIO 1: No Locations
        if (locations.length === 0) {
            setLoading(false);
            return;
        }

        // Helper to fix location string
        const cleanDestination = destination ? destination.split('(')[0].trim() : '';
        const fixLoc = (loc) => {
             if (!cleanDestination) return loc;
             return loc.toLowerCase().includes(cleanDestination.toLowerCase()) ? loc : `${loc}, ${cleanDestination}`;
        };

        // Helper to create marker content (Enhanced InfoWindow)
        const createMarkerContent = (loc) => {
             return `
                <div style="padding: 0px; max-width: 240px; font-family: 'Poppins', sans-serif;">
                    <div style="background: #f0fdfa; padding: 10px; border-bottom: 1px solid #ccfbf1; display: flex; align-items: center; gap: 8px;">
                        <div style="background: #0f766e; color: white; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 10px; border-radius: 50%;">
                            <i class="fa-solid fa-location-dot"></i>
                        </div>
                        <h5 style="font-weight: bold; font-size: 14px; color: #0f766e; margin: 0;">${loc.title || 'Lokasi'}</h5>
                    </div>
                    <div style="padding: 10px;">
                        <p style="font-size: 12px; color: #555; margin-bottom: 6px; display: flex; items-center; gap: 4px;">
                            <i class="fa-regular fa-clock" style="color: #0f766e;"></i> ${loc.time || '-'}
                        </p>
                        <p style="font-size: 12px; color: #666; line-height: 1.4; margin-bottom: 10px;">
                            ${loc.description ? (loc.description.length > 80 ? loc.description.substring(0, 80) + '...' : loc.description) : ''}
                        </p>
                        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}" target="_blank" style="display: block; text-align: center; background: #0f766e; color: white; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 11px; font-weight: bold; transition: background 0.2s;">
                            <i class="fa-solid fa-map-location-dot"></i> Lihat di Google Maps
                        </a>
                    </div>
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

                        const marker = new AdvancedMarkerElement({
                            map: mapInstance,
                            position: pos,
                            title: locObj.title,
                            content: createMarkerElement(0)
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
                const bounds = new window.google.maps.LatLngBounds();

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
                bounds.extend(legs[0].start_location);
                const originMarker = new AdvancedMarkerElement({
                    position: legs[0].start_location,
                    map: mapInstance,
                    title: originObj.title,
                    content: createMarkerElement(0),
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
                    bounds.extend(leg.end_location);
                    const isDest = index === legs.length - 1;
                    const locData = isDest ? destObj : waypointObjs[index];
                    const idx = index + 1; // 0 is origin, so this starts at 1

                    const marker = new AdvancedMarkerElement({
                        position: leg.end_location,
                        map: mapInstance,
                        title: locData.title,
                        content: createMarkerElement(idx),
                        zIndex: 999
                    });

                    marker.addListener("click", () => {
                        infoWindowRef.current.setContent(createMarkerContent(locData));
                        infoWindowRef.current.open(mapInstance, marker);
                    });
                    markersRef.current.push(marker);
                });

                boundsRef.current = bounds;

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
                 setError("Rute visual tidak tersedia. Menampilkan lokasi saja.");

                 // FALLBACK: Geocode individual locations
                 const geocoder = new Geocoder();
                 const bounds = new window.google.maps.LatLngBounds();

                 // Use sequential loop to avoid Rate Limit (OVER_QUERY_LIMIT)
                 for (const [index, locObj] of locations.entries()) {
                     await new Promise((resolve) => {
                         geocoder.geocode({ address: fixLoc(locObj.address) }, (results, status) => {
                            if (status === 'OK' && results[0]) {
                                const pos = results[0].geometry.location;
                                bounds.extend(pos);

                                const marker = new AdvancedMarkerElement({
                                    map: mapInstance,
                                    position: pos,
                                    title: locObj.title,
                                    content: createMarkerElement(index)
                                });

                                marker.addListener("click", () => {
                                    infoWindowRef.current.setContent(createMarkerContent(locObj));
                                    infoWindowRef.current.open(mapInstance, marker);
                                });

                                markersRef.current.push(marker);
                            }
                            resolve();
                         });
                     });
                 }

                 // Fit bounds once after all markers are placed
                 if (!bounds.isEmpty()) {
                     mapInstance.fitBounds(bounds);
                 }
             } finally {
                 setLoading(false);
             }
        }
    };

    processMap();

  }, [mapInstance, directionsService, directionsRenderer, locations, travelMode, destination]);

  const handleMyLocation = async () => {
      if (navigator.geolocation && mapInstance) {
          try {
             const { AdvancedMarkerElement, PinElement } = await importLibrary("marker");
             navigator.geolocation.getCurrentPosition((position) => {
                  const pos = {
                      lat: position.coords.latitude,
                      lng: position.coords.longitude
                  };
                  mapInstance.panTo(pos);
                  mapInstance.setZoom(15);
                  new AdvancedMarkerElement({
                      position: pos,
                      map: mapInstance,
                      title: "Lokasi Saya",
                      content: new PinElement({
                          background: "#3b82f6",
                          borderColor: "#1d4ed8",
                          glyphColor: "white",
                          scale: 0.8
                      }).element
                  });
              }, (e) => {
                  console.warn(e);
                  setError("Gagal mendeteksi lokasi. Pastikan GPS aktif.");
              });
          } catch (e) {
              console.error(e);
          }
      } else {
          setError("Browser tidak mendukung geolokasi.");
      }
  };

  const handleFitBounds = () => {
      if (boundsRef.current && mapInstance) {
          mapInstance.fitBounds(boundsRef.current);
      }
  };

  return (
    <div className="relative">
        <div className="w-full h-[500px] bg-gray-100 rounded-3xl overflow-hidden relative border border-gray-200 shadow-xl">
            <div ref={mapRef} className="w-full h-full" />

            {/* Custom Overlay Controls */}

            {/* 1. Top Right: Map Controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
                {/* 3D Toggle */}
                <button
                    onClick={() => setIs3D(!is3D)}
                    className={`w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-all ${is3D ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    title="Toggle 3D View"
                >
                    <i className={`fa-solid ${is3D ? 'fa-cube' : 'fa-layer-group'}`}></i>
                </button>

                {/* Fit Bounds */}
                <button
                    onClick={handleFitBounds}
                    className="w-10 h-10 rounded-full shadow-lg bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center transition-all"
                    title="Fit Route"
                >
                    <i className="fa-solid fa-expand"></i>
                </button>

                 {/* My Location */}
                 <button
                    onClick={handleMyLocation}
                    className="w-10 h-10 rounded-full shadow-lg bg-white text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-all"
                    title="Lokasi Saya"
                >
                    <i className="fa-solid fa-location-crosshairs"></i>
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
