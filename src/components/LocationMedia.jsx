import React, { useEffect, useState, useRef } from 'react';
import { importLibrary } from "@googlemaps/js-api-loader";
import { initGoogleMaps } from '../utils/googleMapsLoader';

const LocationMedia = ({ location }) => {
    const [photoUrl, setPhotoUrl] = useState(null);
    const [coords, setCoords] = useState(null);
    const [loading, setLoading] = useState(true);

    // Refs for the map containers
    const streetViewRef = useRef(null);
    const mapRef = useRef(null);

    // Initialize Maps and fetch Place data
    useEffect(() => {
        if (!location) return;

        initGoogleMaps();

        const fetchPlaceData = async () => {
            try {
                // Use the new Places API (Place class)
                const { Place } = await importLibrary("places");

                // Search for the place by text query
                // Request 'location' to get lat/lng for the maps
                const { places } = await Place.searchByText({
                    textQuery: location,
                    fields: ['photos', 'location']
                });

                if (places && places.length > 0) {
                    const place = places[0];

                    // Set Photo
                    if (place.photos && place.photos.length > 0) {
                        setPhotoUrl(place.photos[0].getURI({ maxWidth: 400, maxHeight: 300 }));
                    }

                    // Set Coordinates
                    if (place.location) {
                        setCoords(place.location);
                    }
                } else {
                    console.log(`No place found for: ${location}`);
                }
            } catch (error) {
                console.error("Error fetching place data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPlaceData();

    }, [location]);

    // Initialize Dynamic Maps when coordinates are available
    useEffect(() => {
        if (!coords) return;

        const initMaps = async () => {
            try {
                const { Map } = await importLibrary("maps");
                const { StreetViewPanorama } = await importLibrary("streetView");

                // 1. Initialize Street View
                if (streetViewRef.current) {
                     new StreetViewPanorama(streetViewRef.current, {
                        position: coords,
                        pov: { heading: 165, pitch: 0 },
                        zoom: 0,
                        disableDefaultUI: true,
                        addressControl: false,
                        linksControl: false,
                        panControl: false,
                        enableCloseButton: false,
                        showRoadLabels: false
                     });
                }

                // 2. Initialize Map (Zoomable)
                if (mapRef.current) {
                    new Map(mapRef.current, {
                        center: coords,
                        zoom: 17,
                        disableDefaultUI: true, // Keep it clean
                        mapTypeId: 'roadmap',
                        clickableIcons: false
                    });
                }
            } catch (e) {
                console.error("Error initializing maps:", e);
            }
        }

        initMaps();
    }, [coords]);

    if (!location) return null;

    const encodedLoc = encodeURIComponent(location);

    const openMap = (e) => {
         e.stopPropagation(); // Prevent messing with map interaction if triggered from overlay
         window.open(`https://www.google.com/maps/search/?api=1&query=${encodedLoc}`, '_blank');
    };

    return (
        <div className="mt-4 grid grid-cols-3 gap-2">
            {/* 1. Location Photo (Kept as is, works well) */}
            <div onClick={openMap} className="aspect-[4/3] rounded-lg overflow-hidden relative bg-gray-100 shadow-sm border border-gray-100 group cursor-pointer">
                {loading ? (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                    </div>
                ) : photoUrl ? (
                    <img src={photoUrl} alt="Lokasi" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-gray-50">
                        <i className="fa-regular fa-image text-2xl mb-1"></i>
                        <span className="text-[10px]">No Photo</span>
                    </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 pointer-events-none">
                    <p className="text-white text-[10px] font-bold shadow-black drop-shadow-md"><i className="fa-solid fa-camera mr-1"></i> Foto</p>
                </div>
            </div>

            {/* 2. Street View (Dynamic) */}
            <div className="aspect-[4/3] rounded-lg overflow-hidden relative bg-gray-100 shadow-sm border border-gray-100">
                {loading || !coords ? (
                     <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                    </div>
                ) : (
                    <div ref={streetViewRef} className="w-full h-full" />
                )}

                 <div onClick={openMap} className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 cursor-pointer transition-opacity hover:opacity-90">
                    <p className="text-white text-[10px] font-bold shadow-black drop-shadow-md"><i className="fa-solid fa-street-view mr-1"></i> Jalan <span className="text-[8px] font-normal opacity-80">(Buka Maps)</span></p>
                </div>
            </div>

            {/* 3. Map View (Dynamic) */}
            <div className="aspect-[4/3] rounded-lg overflow-hidden relative bg-gray-100 shadow-sm border border-gray-100">
                 {loading || !coords ? (
                     <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                    </div>
                ) : (
                    <div ref={mapRef} className="w-full h-full" />
                )}
                 <div onClick={openMap} className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 cursor-pointer transition-opacity hover:opacity-90">
                    <p className="text-white text-[10px] font-bold shadow-black drop-shadow-md"><i className="fa-solid fa-map mr-1"></i> Peta <span className="text-[8px] font-normal opacity-80">(Buka Maps)</span></p>
                </div>
            </div>
        </div>
    );
};

export default LocationMedia;
