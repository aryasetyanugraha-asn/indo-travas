import { setOptions } from "@googlemaps/js-api-loader";

let initialized = false;

export const initGoogleMaps = () => {
  if (initialized) return;

  setOptions({
    key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    v: "weekly",
    libraries: ["places", "geometry", "marker", "routes"]
  });

  initialized = true;
};
