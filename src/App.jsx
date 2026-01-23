import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- KONFIGURASI API KEY (Sebaiknya simpan di .env saat production) ---
// GANTI DENGAN API KEY ANDA YANG SEBENARNYA
const GEMINI_API_KEY = "";
const GOOGLE_MAPS_KEY = "";

function App() {
  // State Management
  const [activeTab, setActiveTab] = useState('home');
  const [homeMode, setHomeMode] = useState('general'); // 'general' or 'umrah'
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [directionText, setDirectionText] = useState("Menunggu rute...");

  // Modal States
  const [showAIModal, setShowAIModal] = useState(false);
  const [showTLModal, setShowTLModal] = useState(false);
  const [showMuthawifModal, setShowMuthawifModal] = useState(false);

  // AI States
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [travellerProfile, setTravellerProfile] = useState("Pengamat Burung dari Norwegia");
  const [destination, setDestination] = useState("Indonesia (Bali & Jawa Timur)");

  // Maps Refs
  const mapRef = useRef(null);
  const directionsRenderer = useRef(null);
  const directionsService = useRef(null);

  // --- 1. LOGIKA AI (GEMINI) ---
  const generateItinerary = async () => {
    if (!GEMINI_API_KEY) {
        alert("Mohon isi GEMINI_API_KEY di dalam kode src/App.jsx");
        return;
    }
    setAiLoading(true);
    setAiResult(null);

    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `Buatkan itinerary perjalanan singkat (json format tapi dibungkus teks biasa) untuk ${travellerProfile} yang ingin ke ${destination}.
      Fokus pada hal unik, estimasi biaya (IDR/Original Currency), dan tips visa.
      Gunakan format HTML sederhana (gunakan tag <h4>, <ul>, <li>, <b>) agar bisa dirender.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      setAiResult(text);
    } catch (error) {
      console.error("AI Error:", error);
      alert("Gagal menghubungi AI. Periksa API Key atau Koneksi Internet.");
    } finally {
      setAiLoading(false);
    }
  };

  // --- 2. LOGIKA MAPS (MANUAL SCRIPT INJECTION) ---
  useEffect(() => {
    if (activeTab === 'trip' && GOOGLE_MAPS_KEY) {
      const initMap = async () => {
        // Cek apakah google maps sudah tersedia di window
        if (!window.google) {
            console.error("Google Maps API belum dimuat.");
            return;
        }

        const { Map } = await window.google.maps.importLibrary("maps");
        const { DirectionsService, DirectionsRenderer } = await window.google.maps.importLibrary("routes");

        const bali = { lat: -8.409518, lng: 115.188919 };

        const mapElement = document.getElementById("google-map");
        if (mapElement) {
            const map = new Map(mapElement, {
                center: bali,
                zoom: 10,
                disableDefaultUI: true,
            });

            directionsService.current = new DirectionsService();
            directionsRenderer.current = new DirectionsRenderer();
            directionsRenderer.current.setMap(map);
        }
      };

      // Fungsi untuk memuat script Google Maps
      const loadScript = () => {
        if (window.google && window.google.maps) {
            initMap();
            return;
        }

        const scriptId = "google-maps-script";
        if (document.getElementById(scriptId)) return;

        const script = document.createElement("script");
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places,routes`;
        script.async = true;
        script.defer = true;
        script.onload = initMap;
        document.head.appendChild(script);
      };

      loadScript();
    }
  }, [activeTab]);

  const calculateRoute = () => {
    if (!directionsService.current) {
        alert("Peta belum siap atau API Key salah.");
        return;
    }

    const request = {
      origin: "Ngurah Rai International Airport",
      destination: "Tribal Bali Hostel, Pererenan",
      travelMode: 'DRIVING'
    };

    directionsService.current.route(request, (result, status) => {
      if (status === 'OK') {
        directionsRenderer.current.setDirections(result);
        const firstStep = result.routes[0].legs[0].steps[0].instructions;
        const duration = result.routes[0].legs[0].duration.text;
        const cleanText = firstStep.replace(/<[^>]*>?/gm, ''); // Hapus tag HTML

        const assistantMsg = `Rute ditemukan! Estimasi ${duration}. ${cleanText}`;
        setDirectionText(assistantMsg);

        if (isVoiceActive) speak(assistantMsg);
      } else {
          alert("Gagal menghitung rute: " + status);
      }
    });
  };

  // --- 3. VOICE ASSISTANT ---
  const speak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Hentikan suara sebelumnya
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleVoice = () => {
    const newState = !isVoiceActive;
    setIsVoiceActive(newState);
    if (newState) {
      speak("Asisten perjalanan aktif.");
    } else {
      window.speechSynthesis.cancel();
    }
  };

  return (
    <div className="font-sans bg-gray-100 min-h-screen pb-24 text-gray-800">

      {/* HEADER */}
      <header className="fixed top-0 w-full bg-white shadow-sm z-50 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <div className="bg-teal-600 text-white p-1 rounded font-bold text-xs">IT</div>
            <h1 className="text-xl font-bold text-teal-700 tracking-tight">INDO TRAVAS</h1>
        </div>
        <div className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden border-2 border-teal-500">
            {/* Placeholder Image */}
            <div className="w-full h-full bg-gray-400"></div>
        </div>
      </header>

      <main className="mt-16 container mx-auto max-w-md px-4 min-h-screen">

        {/* VIEW: HOME */}
        {activeTab === 'home' && (
          <section className="animate-fade-in">
             <div className="mt-4 mb-4">
                <p className="text-gray-500 text-sm">Selamat Datang, Traveller! 👋</p>
                <h2 className="text-xl font-bold text-gray-800 mb-4">Pilih Tujuan Anda</h2>

                {/* Toggle Switch */}
                <div className="flex bg-gray-200 p-1 rounded-xl mb-6 relative h-10">
                    <div
                      className={`w-1/2 h-8 bg-white absolute top-1 rounded-lg shadow-sm transition-all duration-300 ${homeMode === 'umrah' ? 'translate-x-full left-[-4px]' : 'left-1'}`}
                    ></div>
                    <button onClick={() => setHomeMode('general')} className={`flex-1 text-xs font-bold z-10 flex items-center justify-center gap-2 ${homeMode === 'general' ? 'text-teal-700' : 'text-gray-500'}`}>
                        Travel Umum
                    </button>
                    <button onClick={() => setHomeMode('umrah')} className={`flex-1 text-xs font-bold z-10 flex items-center justify-center gap-2 ${homeMode === 'umrah' ? 'text-teal-700' : 'text-gray-500'}`}>
                        Ibadah Umroh
                    </button>
                </div>
            </div>

            {/* General Mode Content */}
            {homeMode === 'general' && (
              <div>
                <div className="bg-gradient-to-r from-teal-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg mb-6 relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="font-bold text-lg mb-1">Buat Itinerary Kilat</h3>
                        <p className="text-xs text-teal-100 mb-4 w-2/3">Rencanakan perjalanan impianmu dalam hitungan detik dengan AI.</p>
                        <button onClick={() => setShowAIModal(true)} className="bg-white text-teal-600 px-3 py-2 rounded-lg text-xs font-bold shadow hover:bg-gray-100 flex items-center gap-1">
                             AI On-Demand
                        </button>
                    </div>
                </div>

                {/* Marketplace General */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                     <div className="flex flex-col items-center gap-1"><div className="w-14 h-14 bg-teal-50 border border-teal-100 rounded-xl shadow-sm flex items-center justify-center text-teal-600 text-2xl"><i className="fa-solid fa-plane-up"></i></div><span className="text-xs font-bold text-teal-700">Pesawat</span></div>

                     <div onClick={() => setShowTLModal(true)} className="flex flex-col items-center gap-1 cursor-pointer">
                        <div className="w-14 h-14 bg-blue-50 border border-blue-100 rounded-xl shadow-sm flex items-center justify-center text-blue-600 text-xl relative">
                            <i className="fa-solid fa-user-tie"></i>
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                            </span>
                        </div>
                        <span className="text-[10px] font-bold text-blue-700 text-center leading-tight">Virtual<br/>TL</span>
                    </div>

                     <div className="flex flex-col items-center gap-1"><div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center text-orange-500 text-xl"><i className="fa-solid fa-hotel"></i></div><span className="text-xs font-medium text-gray-600">Hotel</span></div>
                     <div className="flex flex-col items-center gap-1"><div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center text-purple-500 text-xl"><i className="fa-solid fa-ticket"></i></div><span class="text-xs font-medium text-gray-600">Tour</span></div>
                </div>
              </div>
            )}

            {/* Umrah Mode Content */}
            {homeMode === 'umrah' && (
              <div>
                 <div className="bg-gray-800 rounded-2xl p-5 text-white shadow-lg mb-6 relative overflow-hidden">
                    <div className="relative z-10">
                        <span className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded mb-2 inline-block">SEASON 1446H</span>
                        <h3 className="font-bold text-lg mb-1">Ibadah Nyaman</h3>
                        <button className="bg-white text-gray-900 px-4 py-2 rounded-lg text-xs font-bold shadow mt-2">Jadwal</button>
                    </div>
                </div>
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="flex flex-col items-center gap-1"><div className="w-14 h-14 bg-emerald-50 rounded-xl shadow-sm flex items-center justify-center text-emerald-600 text-xl"><i className="fa-solid fa-passport"></i></div><span className="text-xs font-medium text-gray-600">Visa</span></div>

                    <div onClick={() => setShowMuthawifModal(true)} className="flex flex-col items-center gap-1 cursor-pointer">
                        <div className="w-14 h-14 bg-purple-50 rounded-xl shadow-sm flex items-center justify-center text-purple-600 text-xl relative">
                            <i className="fa-solid fa-headset"></i>
                        </div>
                        <span className="text-[10px] font-bold text-purple-700 text-center leading-tight">Virtual<br/>Muthawif</span>
                    </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* VIEW: TRIP */}
        {activeTab === 'trip' && (
          <section className="animate-fade-in">
             <h2 className="text-xl font-bold mb-4">Navigasi Langsung</h2>

             <div id="map-container" className="bg-gray-200 shadow-md mb-4 h-[300px] w-full rounded-xl overflow-hidden relative">
                <div id="google-map" className="h-full w-full"></div>
                {/* Fallback if map not loaded */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                  <span className="text-gray-400 text-xs">
                    {GOOGLE_MAPS_KEY ? "Memuat Peta..." : "Masukkan API Key Maps"}
                  </span>
                </div>
             </div>

             <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-teal-500 mb-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 class="font-bold text-sm">AI Voice Assistant</h3>
                        <p class="text-xs text-gray-500">Memandu perjalanan Anda</p>
                    </div>
                    <button onClick={toggleVoice} className={`w-10 h-10 rounded-full flex items-center justify-center transition ${isVoiceActive ? 'bg-teal-100 text-teal-600 animate-pulse' : 'bg-gray-100 text-gray-400'}`}>
                        <i className={`fa-solid ${isVoiceActive ? 'fa-microphone' : 'fa-microphone-slash'}`}></i>
                    </button>
                </div>
                <p className="mt-2 text-xs text-gray-700 italic border-t pt-2 border-gray-100">{directionText}</p>
            </div>

            <button onClick={calculateRoute} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg">
              Mulai Navigasi Demo
            </button>
          </section>
        )}

      </main>

      {/* MODALS */}

      {/* AI MODAL */}
      {showAIModal && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAIModal(false)}></div>
          <div className="absolute bottom-0 w-full bg-white rounded-t-3xl p-6 h-[85vh] overflow-y-auto animate-[slideUp_0.3s_ease-out]">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6"></div>

            {!aiResult && !aiLoading && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">AI Itinerary Planner</h3>
                <div className="space-y-3 mb-4">
                  <input
                    type="text"
                    value={travellerProfile}
                    onChange={(e) => setTravellerProfile(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm"
                    placeholder="Profil"
                  />
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm"
                    placeholder="Tujuan"
                  />
                </div>
                <button onClick={generateItinerary} className="w-full bg-teal-600 text-white font-bold py-3 rounded-xl">
                  Buat Itinerary
                </button>
              </div>
            )}

            {aiLoading && (
              <div className="text-center py-12">
                 <i className="fa-solid fa-circle-notch fa-spin text-4xl text-teal-500 mb-4"></i>
                 <p className="font-bold">Meracik Perjalanan...</p>
              </div>
            )}

            {aiResult && (
               <div>
                 <div className="flex justify-between mb-4">
                    <h2 className="font-bold">Hasil AI</h2>
                    <button onClick={() => setAiResult(null)} className="text-gray-500">Reset</button>
                 </div>
                 <div className="prose prose-sm text-xs" dangerouslySetInnerHTML={{ __html: aiResult }}></div>
               </div>
            )}
          </div>
        </div>
      )}

      {/* TL MODAL */}
      {showTLModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTLModal(false)}></div>
           <div className="bg-white w-full max-w-sm rounded-2xl p-6 relative z-10">
              <h3 className="text-xl font-bold text-blue-800 mb-2">Virtual Tour Leader</h3>
              <p className="text-xs text-gray-500 mb-4">Fitur ini akan menghubungkan Anda dengan asisten digital.</p>
              <button onClick={() => setShowTLModal(false)} className="w-full py-2 bg-gray-100 rounded-lg text-sm font-bold">Tutup</button>
           </div>
        </div>
      )}

      {/* MUTHAWIF MODAL */}
      {showMuthawifModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMuthawifModal(false)}></div>
           <div className="bg-white w-full max-w-sm rounded-2xl p-6 relative z-10">
              <h3 className="text-xl font-bold text-purple-800 mb-2">Virtual Muthawif</h3>
              <p className="text-xs text-gray-500 mb-4">Panduan manasik dan doa AR akan muncul di sini.</p>
              <button onClick={() => setShowMuthawifModal(false)} className="w-full py-2 bg-gray-100 rounded-lg text-sm font-bold">Tutup</button>
           </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 py-2 px-6 flex justify-between items-center text-gray-400 z-50 pb-safe">
         <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 w-16 ${activeTab === 'home' ? 'text-teal-600' : ''}`}><i className="fa-solid fa-compass text-xl"></i><span className="text-[10px]">Jelajah</span></button>
         <button onClick={() => setActiveTab('trip')} className={`flex flex-col items-center gap-1 w-16 ${activeTab === 'trip' ? 'text-teal-600' : ''}`}><i className="fa-solid fa-suitcase-rolling text-xl"></i><span className="text-[10px]">Trip</span></button>
         <button onClick={() => setActiveTab('guide')} className={`flex flex-col items-center gap-1 w-16 ${activeTab === 'guide' ? 'text-teal-600' : ''}`}><i className="fa-solid fa-bell-concierge text-xl"></i><span className="text-[10px]">Layanan</span></button>
         <button onClick={() => setActiveTab('sos')} className={`flex flex-col items-center gap-1 w-16 ${activeTab === 'sos' ? 'text-red-500' : ''}`}><i className="fa-solid fa-shield-cat text-xl"></i><span className="text-[10px]">SOS</span></button>
      </nav>

    </div>
  );
}

export default App;
