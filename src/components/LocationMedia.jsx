import React, { useEffect, useState, useRef } from 'react';
import { importLibrary } from "@googlemaps/js-api-loader";
import { initGoogleMaps } from '../utils/googleMapsLoader';

const LocationMedia = ({ location }) => {
    const [photoUrl, setPhotoUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const dummyRef = useRef(null);

    useEffect(() => {
        if (!location) return;

        initGoogleMaps();

        let service;
        const fetchPhoto = async () => {
            try {
                const { PlacesService } = await importLibrary("places");
                // PlacesService requires a container, even for non-map searches
                if (!dummyRef.current) return;

                service = new PlacesService(dummyRef.current);

                const request = {
                    query: location,
                    fields: ['photos']
                };

                service.findPlaceFromQuery(request, (results, status) => {
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                        if (results[0].photos && results[0].photos.length > 0) {
                            setPhotoUrl(results[0].photos[0].getUrl({ maxWidth: 400, maxHeight: 300 }));
                        }
                    }
                    setLoading(false);
                });

            } catch (error) {
                console.error("Error fetching place photo:", error);
                setLoading(false);
            }
        };

        fetchPhoto();

    }, [location]);

    if (!location) return null;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const encodedLoc = encodeURIComponent(location);

    const openMap = () => {
         window.open(`https://www.google.com/maps/search/?api=1&query=${encodedLoc}`, '_blank');
    };

    return (
        <div className="mt-4 grid grid-cols-3 gap-2">
            {/* Hidden div for PlacesService */}
            <div ref={dummyRef} style={{ display: 'none' }}></div>

            {/* 1. Location Photo */}
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

            {/* 2. Street View */}
            <div onClick={openMap} className="aspect-[4/3] rounded-lg overflow-hidden relative bg-gray-100 shadow-sm border border-gray-100 group cursor-pointer">
                <img
                    src={`https://maps.googleapis.com/maps/api/streetview?size=400x300&location=${encodedLoc}&key=${apiKey}`}
                    alt="Street View"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.querySelector('.fallback').style.display = 'flex'; }}
                />
                 {/* Fallback for error */}
                <div className="fallback w-full h-full hidden flex-col items-center justify-center text-gray-300 bg-gray-50 absolute top-0 left-0">
                    <i className="fa-solid fa-road text-2xl mb-1"></i>
                    <span className="text-[10px]">No View</span>
                </div>

                 <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 pointer-events-none">
                    <p className="text-white text-[10px] font-bold shadow-black drop-shadow-md"><i className="fa-solid fa-street-view mr-1"></i> Jalan</p>
                </div>
            </div>

            {/* 3. Map View */}
            <div onClick={openMap} className="aspect-[4/3] rounded-lg overflow-hidden relative bg-gray-100 shadow-sm border border-gray-100 group cursor-pointer">
                 <img
                    src={`https://maps.googleapis.com/maps/api/staticmap?center=${encodedLoc}&zoom=17&size=400x300&maptype=roadmap&markers=color:teal|${encodedLoc}&key=${apiKey}`}
                    alt="Map"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                 <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 pointer-events-none">
                    <p className="text-white text-[10px] font-bold shadow-black drop-shadow-md"><i className="fa-solid fa-map mr-1"></i> Peta</p>
                </div>
            </div>
        </div>
    );
};

export default LocationMedia;
