import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import ItineraryForm from './components/ItineraryForm';
import ItineraryTemplate from './components/ItineraryTemplate';
import InteractiveMap from './components/InteractiveMap';
import AIVoiceAssistant from './components/AIVoiceAssistant';

// --- KONFIGURASI API KEY (Dimuat dari .env) ---
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

function App() {
  // State Management
  const [activeTab, setActiveTab] = useState('home');
  const [homeMode, setHomeMode] = useState('general'); // 'general' or 'umrah'
  const [showPanicAlert, setShowPanicAlert] = useState(false);

  // Modal States
  const [showAIModal, setShowAIModal] = useState(false);
  const [showTLModal, setShowTLModal] = useState(false);
  const [showMuthawifModal, setShowMuthawifModal] = useState(false);

  // AI & Itinerary States
  const [aiStep, setAiStep] = useState('form'); // 'form', 'loading', 'result'
  const [aiResult, setAiResult] = useState(null);
  const [savedTrip, setSavedTrip] = useState(null);
  const [formData, setFormData] = useState(null);

  // Chat States
  const [tlChat, setTlChat] = useState([
      { role: 'ai', text: 'Hi! Saya asisten TL Anda. Butuh bantuan untuk rute hotel atau rekomendasi makanan lokal?' }
  ]);
  const [muthawifChat, setMuthawifChat] = useState([
      { role: 'ai', text: 'Assalamualaikum, ada yang bisa saya bantu terkait rukun umroh hari ini?' }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [tlChat, muthawifChat, showTLModal, showMuthawifModal]);

  // --- 1. LOGIKA AI (GEMINI) ---
  const handleChatSubmit = async (mode, customPrompt = null) => {
    const message = customPrompt || chatInput;
    if (!message.trim()) return;

    // Add user message to history
    const newMessage = { role: 'user', text: message };
    if (mode === 'general') {
        setTlChat(prev => [...prev, newMessage]);
    } else {
        setMuthawifChat(prev => [...prev, newMessage]);
    }

    if (!customPrompt) setChatInput("");
    setIsChatLoading(true);

    if (!GEMINI_API_KEY) {
        const errorMsg = { role: 'ai', text: "Error: API Key belum dikonfigurasi." };
        if (mode === 'general') setTlChat(prev => [...prev, errorMsg]);
        else setMuthawifChat(prev => [...prev, errorMsg]);
        setIsChatLoading(false);
        return;
    }

    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

      let systemInstruction = "";
      if (mode === 'general') {
          systemInstruction = "Anda adalah Virtual Tour Leader yang ramah dan membantu. Berikan tips perjalanan, panduan check-in, dan terjemahan singkat jika diminta. Jawab dengan ringkas dan informatif.";
      } else if (mode === 'umrah') {
          systemInstruction = "Anda adalah Virtual Muthawif (Ustadz AI). Berikan panduan ibadah umrah, doa-doa, dan tips spiritual sesuai sunnah. Gunakan bahasa yang sopan dan menyejukkan hati. PENTING: Jangan menyingkat gelar kehormatan agama. Tulis 'Allah Subhanahu wa ta'ala' (bukan SWT) dan 'Rasulullah Shalallahu alaihi wasalam' (bukan SAW).";
      }

      const prompt = `${systemInstruction}\n\nUser: ${message}\nAI:`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const aiResponse = { role: 'ai', text: text };
      if (mode === 'general') {
          setTlChat(prev => [...prev, aiResponse]);
      } else {
          setMuthawifChat(prev => [...prev, aiResponse]);
      }

    } catch (error) {
      console.error("Chat Error:", error);
      const errorMsg = { role: 'ai', text: "Maaf, saya sedang mengalami gangguan koneksi." };
      if (mode === 'general') setTlChat(prev => [...prev, errorMsg]);
      else setMuthawifChat(prev => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleFormSubmit = async (data) => {
    setFormData(data); // Save for editing later
    setAiStep('loading');

    if (!GEMINI_API_KEY) {
        alert("Mohon isi VITE_GEMINI_API_KEY di dalam file .env");
        setAiStep('form');
        return;
    }

    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

      const prompt = `Buatkan itinerary perjalanan ${homeMode === 'umrah' ? 'Umrah' : 'Liburan'} dalam format JSON valid.

      Detail Permintaan:
      - Tujuan: ${data.destination}
      - Durasi: ${data.duration} hari
      - Budget: ${homeMode === 'umrah' ? data.packageType : data.budget}
      - Peserta: ${data.participants} orang
      - Gaya/Minat: ${data.travelStyle.join(', ')}
      - Catatan Khusus: ${data.specialRequests}
      ${homeMode === 'umrah' ? `- Tanggal Keberangkatan: ${data.departureDate}` : ''}
      ${homeMode === 'umrah' ? `- Instruksi Penulisan: Jangan menyingkat SWT (Gunakan: Subhanahu wa ta'ala) dan SAW (Gunakan: Shalallahu alaihi wasalam).` : ''}

      Format JSON yang DIHARAPKAN (Strict JSON only, no markdown code block needed, just the raw JSON string):
      {
        "tripTitle": "Judul Perjalanan Menarik",
        "destination": "${data.destination}",
        "duration": "${data.duration} Hari",
        "tripType": "${homeMode}",
        "totalCostEstimate": "Estimasi total biaya dalam IDR (atau currency relevan)",
        "highlights": ["Highlight 1", "Highlight 2", "Highlight 3"],
        "importantInfo": ["Info Visa", "Tips Cuaca", "Info Transport"],
        "dailyItinerary": [
            {
                "day": 1,
                "title": "Judul Hari Ini",
                "activities": [
                    {
                        "time": "08:00",
                        "activity": "Nama Aktivitas",
                        "location": "Lokasi spesifik",
                        "description": "Deskripsi singkat aktivitas",
                        "cost": "Estimasi biaya tiket/makan (opsional)"
                    }
                ]
            }
        ]
      }
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Clean up markdown code blocks if present
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const jsonResult = JSON.parse(cleanText);

      setAiResult(jsonResult);
      setAiStep('result');

    } catch (error) {
      console.error("AI Error:", error);
      alert("Gagal membuat itinerary. Coba lagi atau periksa koneksi.");
      setAiStep('form');
    }
  };

  const handleEditItinerary = () => {
    setAiStep('form');
  };

  const handleSaveItinerary = () => {
    setSavedTrip(aiResult);
    alert("Itinerary tersimpan ke 'Perjalanan Saya'!");
    setShowAIModal(false);
    setActiveTab('trip');
  };

  const activatePanic = () => {
      setShowPanicAlert(true);
      setTimeout(() => {
          console.log("SOS Signal Sent");
      }, 3000);
  };

  const cancelPanic = () => {
      setShowPanicAlert(false);
      alert("Sinyal darurat dibatalkan.");
  };

  const openAIModal = () => {
      setAiStep('form');
      setFormData(null); // Reset form on fresh open, or keep if you want persistence
      setShowAIModal(true);
  }


  return (
    <div className="bg-gray-100 text-gray-800 pb-24 font-['Poppins']">

      {/* HEADER / TOP BAR */}
      <header className="fixed top-0 w-full bg-white shadow-sm z-50 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <div className="bg-teal-600 text-white p-1 rounded font-bold text-xs">IT</div>
            <h1 className="text-xl font-bold text-teal-700 tracking-tight">INDO TRAVAS</h1>
        </div>
        <div className="flex gap-4">
            <button className="relative text-gray-500 hover:text-teal-600">
                <i className="fa-solid fa-bell"></i>
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1 rounded-full">2</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden border-2 border-teal-500">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Profile" />
            </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="mt-16 container mx-auto max-w-md px-4 min-h-screen">

        {/* VIEW: JELAJAH (HOME) */}
        {activeTab === 'home' && (
        <section id="view-home" className="animate-fade-in">
            {/* Greeting & Mode Switcher */}
            <div className="mt-4 mb-4">
                <p className="text-gray-500 text-sm">Selamat Datang, Traveller! 👋</p>
                <h2 className="text-xl font-bold text-gray-800 mb-4">Pilih Tujuan Anda</h2>

                {/* Toggle Switch */}
                <div className="flex bg-gray-200 p-1 rounded-xl mb-6 relative h-10">
                    {/* Sliding Background */}
                    <div
                        className={`w-1/2 h-8 bg-white absolute top-1 rounded-lg shadow-sm transition-all duration-300 ${homeMode === 'umrah' ? 'translate-x-[100%] left-[-4px]' : 'left-1'}`}
                    ></div>

                    <button
                        onClick={() => setHomeMode('general')}
                        className={`flex-1 text-xs font-bold text-center z-10 relative transition-colors duration-300 flex items-center justify-center gap-2 ${homeMode === 'general' ? 'text-teal-700' : 'text-gray-500'}`}
                    >
                        <i className="fa-solid fa-earth-asia"></i> Travel Umum
                    </button>
                    <button
                        onClick={() => setHomeMode('umrah')}
                        className={`flex-1 text-xs font-bold text-center z-10 relative transition-colors duration-300 flex items-center justify-center gap-2 ${homeMode === 'umrah' ? 'text-teal-700' : 'text-gray-500'}`}
                    >
                        <i className="fa-solid fa-kaaba"></i> Ibadah Umroh
                    </button>
                </div>
            </div>

            {/* ======================= GENERAL TRAVEL MODE ======================= */}
            {homeMode === 'general' && (
            <div id="home-general">
                {/* Feature 1: Virtual Itinerary */}
                <div className="bg-gradient-to-r from-teal-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg mb-6 relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="font-bold text-lg mb-1">Buat Itinerary Kilat</h3>
                        <p className="text-xs text-teal-100 mb-4 w-2/3">Rencanakan perjalanan impianmu dalam hitungan detik.</p>
                        <div className="flex gap-2">
                            <button onClick={openAIModal} className="bg-white text-teal-600 px-3 py-2 rounded-lg text-xs font-bold shadow hover:bg-gray-100 transition flex items-center gap-1">
                                <i className="fa-solid fa-wand-magic-sparkles"></i> AI On-Demand
                            </button>
                            <button onClick={() => alert('Membuka koleksi gaya travel...')} className="bg-teal-700 bg-opacity-50 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-opacity-70 border border-teal-400">
                                Gaya Travel
                            </button>
                        </div>
                    </div>
                    <div className="absolute -right-5 -bottom-10 w-32 h-32 bg-white opacity-10 rounded-full"></div>
                </div>

                {/* Feature 2: Marketplace Grid (Updated Icons) */}
                <h3 className="font-bold text-gray-700 mb-3">Marketplace</h3>
                <div className="grid grid-cols-4 gap-4 mb-8">
                    {/* Updated Plane Icon */}
                    <div className="flex flex-col items-center gap-1 cursor-pointer hover:scale-105 transition">
                        <div className="w-14 h-14 bg-teal-50 border border-teal-100 rounded-xl shadow-sm flex items-center justify-center text-teal-600 text-2xl">
                            <i className="fa-solid fa-plane"></i>
                        </div>
                        <span className="text-xs font-bold text-teal-700">Pesawat</span>
                    </div>

                    {/* VIRTUAL TL (New) */}
                    <div onClick={() => setShowTLModal(true)} className="flex flex-col items-center gap-1 cursor-pointer hover:scale-105 transition">
                        <div className="w-14 h-14 bg-blue-50 border border-blue-100 rounded-xl shadow-sm flex items-center justify-center text-blue-600 text-xl relative">
                            <i className="fa-solid fa-user-tie"></i>
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                            </span>
                        </div>
                        <span className="text-[10px] font-bold text-blue-700 text-center leading-tight">Virtual<br/>TL</span>
                    </div>

                    <div className="flex flex-col items-center gap-1 cursor-pointer hover:scale-105 transition">
                        <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center text-orange-500 text-xl">
                            <i className="fa-solid fa-hotel"></i>
                        </div>
                        <span className="text-xs font-medium text-gray-600">Hotel</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 cursor-pointer hover:scale-105 transition">
                        <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-500 text-xl">
                            <i className="fa-solid fa-train-subway"></i>
                        </div>
                        <span className="text-xs font-medium text-gray-600">Kereta</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 cursor-pointer hover:scale-105 transition">
                        <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center text-purple-500 text-xl">
                            <i className="fa-solid fa-ticket"></i>
                        </div>
                        <span className="text-xs font-medium text-gray-600">Tour</span>
                    </div>
                </div>

                {/* Recommended Destinations (Added Data) */}
                <div className="flex justify-between items-end mb-3">
                    <h3 className="font-bold text-gray-700">Rekomendasi Hemat</h3>
                    <span className="text-xs text-teal-600 font-bold cursor-pointer">Lihat Semua</span>
                </div>
                <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4">
                    {/* Card 1 */}
                    <div className="min-w-[200px] bg-white rounded-xl shadow-sm overflow-hidden shrink-0">
                        <div className="h-28 bg-gray-200 relative">
                            <img src="https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=400" className="w-full h-full object-cover" />
                            <span className="absolute top-2 right-2 bg-white px-2 py-0.5 rounded text-[10px] font-bold shadow">Rp 350rb/mlm</span>
                        </div>
                        <div className="p-3">
                            <h4 className="font-bold text-sm">Ubud, Bali</h4>
                            <p className="text-xs text-gray-500"><i className="fa-solid fa-star text-yellow-400"></i> 4.8 (Virtual Guide Ready)</p>
                        </div>
                    </div>
                    {/* Card 2 */}
                    <div className="min-w-[200px] bg-white rounded-xl shadow-sm overflow-hidden shrink-0">
                        <div className="h-28 bg-gray-200 relative">
                            <img src="https://images.unsplash.com/photo-1555899434-94d1368aa7af?auto=format&fit=crop&q=80&w=400" className="w-full h-full object-cover" />
                            <span className="absolute top-2 right-2 bg-white px-2 py-0.5 rounded text-[10px] font-bold shadow">Rp 150rb</span>
                        </div>
                        <div className="p-3">
                            <h4 className="font-bold text-sm">Bromo Sunrise</h4>
                            <p className="text-xs text-gray-500"><i className="fa-solid fa-star text-yellow-400"></i> 4.9 (Open Trip)</p>
                        </div>
                    </div>
                    {/* Card 3 (New) */}
                    <div className="min-w-[200px] bg-white rounded-xl shadow-sm overflow-hidden shrink-0">
                        <div className="h-28 bg-gray-200 relative">
                            <img src="https://images.unsplash.com/photo-1584810359583-96fc3448beaa?auto=format&fit=crop&q=80&w=400" className="w-full h-full object-cover" />
                            <span className="absolute top-2 right-2 bg-white px-2 py-0.5 rounded text-[10px] font-bold shadow">Rp 100rb</span>
                        </div>
                        <div className="p-3">
                            <h4 className="font-bold text-sm">Malioboro, Yogya</h4>
                            <p className="text-xs text-gray-500"><i className="fa-solid fa-star text-yellow-400"></i> 4.7 (Hostel Murah)</p>
                        </div>
                    </div>
                    {/* Card 4 (New) */}
                    <div className="min-w-[200px] bg-white rounded-xl shadow-sm overflow-hidden shrink-0">
                        <div className="h-28 bg-gray-200 relative">
                            <img src="https://images.unsplash.com/photo-1596423735880-bf824058d83b?auto=format&fit=crop&q=80&w=400" className="w-full h-full object-cover" />
                            <span className="absolute top-2 right-2 bg-white px-2 py-0.5 rounded text-[10px] font-bold shadow">Rp 2.5jt</span>
                        </div>
                        <div className="p-3">
                            <h4 className="font-bold text-sm">Labuan Bajo</h4>
                            <p className="text-xs text-gray-500"><i className="fa-solid fa-star text-yellow-400"></i> 5.0 (Sailing 3D2N)</p>
                        </div>
                    </div>
                </div>

                {/* New Section: Promo Hotel & Tiket */}
                <div className="mt-4 mb-8">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-gray-700 flex items-center gap-2"><i className="fa-solid fa-fire text-red-500 animate-pulse"></i> Promo Hotel & Tiket</h3>
                        <span className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded-full font-bold">Terbatas</span>
                    </div>

                    <div className="space-y-3">
                        {/* Promo Item 1 */}
                        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex gap-3 items-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg">-45%</div>
                            <div className="w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center shrink-0 text-blue-500 text-2xl">
                                <i className="fa-solid fa-plane-departure"></i>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-sm text-gray-800">Jakarta (CGK) ➔ Bali (DPS)</h4>
                                <p className="text-xs text-gray-500 mb-1">Lion Air • Ekonomi • Bagasi 20kg</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 line-through">Rp 1.2jt</span>
                                    <span className="text-sm font-bold text-red-500">Rp 650rb</span>
                                </div>
                            </div>
                            <button className="bg-blue-50 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center hover:bg-blue-100">
                                <i className="fa-solid fa-chevron-right text-xs"></i>
                            </button>
                        </div>

                        {/* Promo Item 2 */}
                        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex gap-3 items-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg">-30%</div>
                            <div className="w-16 h-16 bg-orange-50 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=200" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-sm text-gray-800">The Trans Luxury Hotel</h4>
                                <p className="text-xs text-gray-500 mb-1">Bandung • Bintang 5</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 line-through">Rp 2.1jt</span>
                                    <span className="text-sm font-bold text-red-500">Rp 1.4jt</span>
                                </div>
                            </div>
                            <button className="bg-orange-50 text-orange-600 w-8 h-8 rounded-full flex items-center justify-center hover:bg-orange-100">
                                <i className="fa-solid fa-chevron-right text-xs"></i>
                            </button>
                        </div>

                         {/* Promo Item 3 */}
                         <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex gap-3 items-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg">FLASH</div>
                            <div className="w-16 h-16 bg-purple-50 rounded-lg flex items-center justify-center shrink-0 text-purple-500 text-2xl">
                                <i className="fa-solid fa-train"></i>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-sm text-gray-800">Argo Wilis (Eksekutif)</h4>
                                <p className="text-xs text-gray-500 mb-1">Bandung ➔ Surabaya</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 line-through">Rp 750rb</span>
                                    <span className="text-sm font-bold text-red-500">Rp 520rb</span>
                                </div>
                            </div>
                            <button className="bg-purple-50 text-purple-600 w-8 h-8 rounded-full flex items-center justify-center hover:bg-purple-100">
                                <i className="fa-solid fa-chevron-right text-xs"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* ======================= UMRAH MODE ======================= */}
            {homeMode === 'umrah' && (
            <div id="home-umrah" className="animate-fade-in">
                {/* Umrah Hero */}
                <div className="bg-gray-800 rounded-2xl p-5 text-white shadow-lg mb-6 relative overflow-hidden">
                    <div className="absolute inset-0 z-0">
                        <img src="https://images.unsplash.com/photo-1565552629477-gin_9f3c7f93?auto=format&fit=crop&q=80&w=600" className="w-full h-full object-cover opacity-30" />
                    </div>
                    <div className="relative z-10">
                        <span className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded mb-2 inline-block">SEASON 1446H</span>
                        <h3 className="font-bold text-lg mb-1 text-white">Ibadah Nyaman, Hati Tenang</h3>
                        <p className="text-xs text-gray-300 mb-4 w-3/4">Temukan paket umroh terpercaya dengan pendampingan muthawif terbaik.</p>
                        <div className="flex gap-2">
                            <button onClick={openAIModal} className="bg-white text-gray-900 px-3 py-2 rounded-lg text-xs font-bold shadow hover:bg-gray-100 transition flex items-center gap-1">
                                <i className="fa-solid fa-wand-magic-sparkles"></i> Rencanakan Umrah AI
                            </button>
                            <button className="bg-transparent border border-gray-400 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-white/10 transition">
                                <i className="fa-solid fa-calendar-check mr-1"></i> Jadwal
                            </button>
                        </div>
                    </div>
                </div>

                {/* Marketplace Umrah */}
                <h3 className="font-bold text-gray-700 mb-3">Layanan Ibadah</h3>
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="flex flex-col items-center gap-1 cursor-pointer hover:scale-105 transition">
                        <div className="w-14 h-14 bg-emerald-50 rounded-xl shadow-sm flex items-center justify-center text-emerald-600 text-xl border border-emerald-100">
                            <i className="fa-solid fa-passport"></i>
                        </div>
                        <span className="text-xs font-medium text-gray-600">Visa</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 cursor-pointer hover:scale-105 transition">
                        <div className="w-14 h-14 bg-emerald-50 rounded-xl shadow-sm flex items-center justify-center text-emerald-600 text-xl border border-emerald-100">
                            <i className="fa-solid fa-mosque"></i>
                        </div>
                        <span className="text-xs font-medium text-gray-600">Manasik</span>
                    </div>

                    {/* NEW ITEM: Virtual Muthawif (Replaces Oleh-oleh) */}
                    <div onClick={() => setShowMuthawifModal(true)} className="flex flex-col items-center gap-1 cursor-pointer hover:scale-105 transition">
                        <div className="w-14 h-14 bg-purple-50 rounded-xl shadow-sm flex items-center justify-center text-purple-600 text-xl border border-purple-100 relative">
                            <i className="fa-solid fa-headset"></i>
                            {/* Ping Animation */}
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                            </span>
                        </div>
                        <span className="text-[10px] font-bold text-purple-700 text-center leading-tight">Virtual<br/>Muthawif</span>
                    </div>

                    <div className="flex flex-col items-center gap-1 cursor-pointer hover:scale-105 transition">
                        <div className="w-14 h-14 bg-emerald-50 rounded-xl shadow-sm flex items-center justify-center text-emerald-600 text-xl border border-emerald-100">
                            <i className="fa-solid fa-map-location-dot"></i>
                        </div>
                        <span className="text-xs font-medium text-gray-600">Ziarah</span>
                    </div>
                </div>

                {/* Paket Umrah */}
                <div className="flex justify-between items-end mb-3">
                    <h3 className="font-bold text-gray-700">Pilihan Paket</h3>
                    <span className="text-xs text-emerald-600 font-bold">Lihat Semua</span>
                </div>
                <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4 mb-4">

                    {/* Paket 1: Hemat */}
                    <div className="min-w-[240px] bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 relative">
                        <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">HEMAT</div>
                        <div className="p-4">
                            <h4 className="font-bold text-md text-gray-800">Paket Barokah</h4>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                                <span><i className="fa-regular fa-clock"></i> 9 Hari</span>
                                <span>•</span>
                                <span><i className="fa-solid fa-plane"></i> Saudia</span>
                            </div>
                            <div className="space-y-1 mb-4">
                                <div className="flex items-center gap-2 text-xs">
                                    <i className="fa-solid fa-hotel text-blue-400"></i>
                                    <span>Hotel Bintang 3 (400m)</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <i className="fa-solid fa-users text-blue-400"></i>
                                    <span>Quad Share (Sekamar 4)</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center mt-2">
                                <div>
                                    <p className="text-[10px] text-gray-400">Mulai dari</p>
                                    <p className="text-lg font-bold text-blue-600">Rp 27.5jt</p>
                                </div>
                                <button className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100"><i className="fa-solid fa-arrow-right"></i></button>
                            </div>
                        </div>
                    </div>

                    {/* Paket 2: Premium */}
                    <div className="min-w-[240px] bg-white rounded-xl shadow-sm overflow-hidden border border-yellow-200 relative">
                        <div className="absolute top-0 right-0 bg-gold-gradient text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg shadow-sm">PREMIUM VVIP</div>
                        <div className="p-4">
                            <h4 className="font-bold text-md text-gray-800">Paket Zamzam Tower</h4>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                                <span><i className="fa-regular fa-clock"></i> 12 Hari</span>
                                <span>•</span>
                                <span><i className="fa-solid fa-plane"></i> Garuda Direct</span>
                            </div>
                            <div className="space-y-1 mb-4">
                                <div className="flex items-center gap-2 text-xs">
                                    <i className="fa-solid fa-hotel text-yellow-500"></i>
                                    <span>Hotel Bintang 5 (0m)</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <i className="fa-solid fa-users text-yellow-500"></i>
                                    <span>Double Share (Sekamar 2)</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center mt-2">
                                <div>
                                    <p className="text-[10px] text-gray-400">Mulai dari</p>
                                    <p className="text-lg font-bold text-yellow-600">Rp 45.0jt</p>
                                </div>
                                <button className="bg-yellow-50 text-yellow-600 p-2 rounded-lg hover:bg-yellow-100"><i className="fa-solid fa-arrow-right"></i></button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Muthawif Section */}
                <h3 className="font-bold text-gray-700 mb-3">Rekomendasi Muthawif</h3>
                <div className="space-y-3">
                    {/* Muthawif 1 */}
                    <div className="bg-white p-3 rounded-xl shadow-sm flex items-center gap-3 border border-gray-100">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 border-2 border-emerald-500">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmad&clothing=graphicShirt&eyebrows=defaultNatural&facialHair=beardMedium" alt="Ustadz Ahmad" />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <h4 className="font-bold text-sm">Ust. Ahmad Zulkarnain</h4>
                                <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded">4.9 <i className="fa-solid fa-star text-[8px]"></i></span>
                            </div>
                            <p className="text-[10px] text-gray-500">Lulusan Univ. Islam Madinah • 10th Pengalaman</p>
                            <div className="flex gap-1 mt-1">
                                <span className="text-[9px] border border-gray-200 px-1 rounded text-gray-500">Sabar</span>
                                <span className="text-[9px] border border-gray-200 px-1 rounded text-gray-500">Sejarah Islam</span>
                            </div>
                        </div>
                        <button className="text-emerald-600 text-xs font-bold border border-emerald-600 px-3 py-1 rounded-full hover:bg-emerald-50">Detail</button>
                    </div>

                    {/* Muthawif 2 */}
                    <div className="bg-white p-3 rounded-xl shadow-sm flex items-center gap-3 border border-gray-100">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 border-2 border-emerald-500">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Fatih&clothing=blazerAndShirt&facialHair=beardLight" alt="Ustadz Fatih" />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <h4 className="font-bold text-sm">Ust. Fatih Karim</h4>
                                <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded">5.0 <i className="fa-solid fa-star text-[8px]"></i></span>
                            </div>
                            <p className="text-[10px] text-gray-500">Hafiz Quran 30 Juz • Spesialis Manasik</p>
                            <div className="flex gap-1 mt-1">
                                <span className="text-[9px] border border-gray-200 px-1 rounded text-gray-500">Ramah Lansia</span>
                            </div>
                        </div>
                        <button className="text-emerald-600 text-xs font-bold border border-emerald-600 px-3 py-1 rounded-full hover:bg-emerald-50">Detail</button>
                    </div>
                </div>
            </div>
            )}
        </section>
        )}

        {/* VIEW: PERJALANAN (TRIP) */}
        {activeTab === 'trip' && (
        <section id="view-trip" className="animate-fade-in">
            {!savedTrip ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 text-gray-400 text-4xl">
                         <i className="fa-solid fa-map-location-dot"></i>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Belum Ada Perjalanan</h3>
                    <p className="text-sm text-gray-500 mb-6">Yuk, rencanakan liburan atau ibadahmu sekarang dengan bantuan AI kami!</p>
                    <button onClick={openAIModal} className="bg-teal-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-teal-700 transition flex items-center gap-2">
                        <i className="fa-solid fa-plus"></i> Buat Itinerary Baru
                    </button>
                </div>
            ) : (
                <>
                    <h2 className="text-xl font-bold mb-4">Perjalanan Aktif</h2>

                    {/* Feature 5: Flight & Airport Info */}
                    <div className="bg-white rounded-xl shadow-sm p-4 mb-4 border-l-4 border-teal-500">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded">ON TIME</span>
                                <h3 className="font-bold text-lg">Garuda GA-402</h3>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-500">Boarding</p>
                                <p className="font-bold text-teal-600">14:30</p>
                            </div>
                        </div>
                        <div className="flex justify-between items-center text-sm mb-3">
                            <div className="text-center">
                                <p className="font-bold text-2xl">CGK</p>
                                <p className="text-xs text-gray-500">Jakarta</p>
                            </div>
                            <div className="flex-1 px-4 text-center relative">
                                <i className="fa-solid fa-plane text-gray-300"></i>
                                <div className="h-[1px] bg-gray-300 absolute top-1/2 left-4 right-4 -z-10"></div>
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-2xl">DPS</p>
                                <p className="text-xs text-gray-500">Bali</p>
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded p-2 text-xs flex justify-between">
                            <span><i className="fa-solid fa-door-open mr-1"></i> Gate <b>E4</b></span>
                            <span><i className="fa-solid fa-suitcase mr-1"></i> Belt <b>02</b></span>
                            <span className="text-teal-600 cursor-pointer underline">Aturan Bandara</span>
                        </div>
                    </div>

                    {/* Timeline & Maps */}
                    <h3 className="font-bold text-gray-700 text-sm mb-3">Jadwal Perjalanan Lengkap</h3>

                    <div className="space-y-8 pl-2">
                        {savedTrip.dailyItinerary.map((day, dayIdx) => (
                            <div key={dayIdx}>
                                <h4 className="font-bold text-teal-700 mb-4 text-xs uppercase tracking-wider bg-teal-50 inline-block px-2 py-1 rounded border border-teal-100">
                                    <i className="fa-regular fa-calendar mr-1"></i> Hari ke-{day.day} • {day.title}
                                </h4>
                                <div className="space-y-4 relative pl-4 border-l-2 border-gray-200 ml-2">
                                    {day.activities.map((activity, idx) => (
                                        <div key={idx} className="relative pl-6">
                                            <div className={`absolute -left-[21px] top-1 w-4 h-4 rounded-full border-2 border-white ${idx === 0 ? 'bg-teal-500' : 'bg-gray-300'}`}></div>
                                            <div className={`bg-white p-3 rounded-lg shadow-sm ${idx === 0 ? '' : 'opacity-80'}`}>
                                                <div className="flex justify-between">
                                                    <h4 className="font-bold text-sm">{activity.activity}</h4>
                                                    <span className="text-xs font-mono text-gray-500">{activity.time}</span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">{activity.description}</p>
                                                {activity.location && <p className="text-[10px] text-teal-600 mt-1"><i className="fa-solid fa-location-dot"></i> {activity.location}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Google Map Integration */}
                    <div className="mt-8">
                        <h3 className="font-bold text-gray-700 mb-2 text-sm">Rute Perjalanan (Hari 1)</h3>
                        <InteractiveMap
                            locations={savedTrip.dailyItinerary[0].activities.filter(a => a.location).map(a => ({
                                address: a.location,
                                title: a.activity,
                                description: a.description,
                                time: a.time
                            }))}
                            destination={savedTrip.destination}
                        />
                    </div>

                    {/* AI Voice Assistant */}
                    <AIVoiceAssistant data={savedTrip} />
                </>
            )}
        </section>
        )}

        {/* VIEW: LAYANAN (SERVICES) */}
        {activeTab === 'guide' && (
        <section id="view-guide" className="animate-fade-in">
            <h2 className="text-xl font-bold mb-4">Layanan & Asisten</h2>

            <div className="grid gap-4">
                {/* Feature 3: Visa */}
                <div className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xl">
                        <i className="fa-solid fa-passport"></i>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-sm">Layanan Visa</h3>
                        <p className="text-xs text-gray-500">Cek syarat & urus e-Visa instan.</p>
                    </div>
                    <i className="fa-solid fa-chevron-right text-gray-300"></i>
                </div>

                {/* Feature 7: Virtual Guide */}
                <div className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-4 border border-teal-100">
                    <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 text-xl">
                        <i className="fa-solid fa-headphones"></i>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-sm">Virtual Tour Guide</h3>
                        <p className="text-xs text-gray-500">AR & Audio guide di lokasi wisata.</p>
                    </div>
                    <button className="text-xs bg-teal-600 text-white px-3 py-1 rounded-full">Active</button>
                </div>

                {/* Feature 9: Insurance & Live GPS */}
                <div className="bg-gray-800 text-white p-5 rounded-xl shadow-lg relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="font-bold"><i className="fa-solid fa-shield-halved mr-2"></i>Travas Protect+</h3>
                            <p className="text-xs text-gray-400 mt-1">Asuransi Premium Aktif</p>
                        </div>
                        <div className="form-control">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked readOnly className="sr-only peer" />
                                <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                            </label>
                        </div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                            <span className="text-xs font-bold text-gray-200">LIVE GPS MONITORING</span>
                        </div>
                        <p className="text-[10px] text-gray-400">Lokasi Anda dibagikan real-time ke kontak darurat & pusat asuransi.</p>
                        {/* Mock Map Line */}
                        <div className="h-1 w-full bg-gray-600 mt-2 rounded overflow-hidden">
                            <div className="h-full bg-teal-500 w-2/3"></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        )}

        {/* VIEW: SOS (PANIC) */}
        {activeTab === 'sos' && (
        <section id="view-sos" className="animate-fade-in text-center pt-8">

            <div className="bg-red-50 border border-red-100 rounded-xl p-6 mb-8">
                <h2 className="text-2xl font-bold text-red-600 mb-2">EMERGENCY MODE</h2>
                <p className="text-sm text-gray-600 mb-6">Tekan tombol di bawah jika Anda dalam bahaya. Kami akan menghubungi otoritas terkait.</p>

                {/* Feature 8: Panic Button */}
                <button onClick={activatePanic} className="panic-pulse w-48 h-48 rounded-full bg-gradient-to-b from-red-500 to-red-700 text-white shadow-xl flex flex-col items-center justify-center mx-auto hover:scale-105 transition active:scale-95 border-4 border-red-300">
                    <i className="fa-solid fa-triangle-exclamation text-5xl mb-2"></i>
                    <span className="font-bold text-xl tracking-widest">PANIC</span>
                    <span className="text-[10px] opacity-80 mt-1">Tap & Hold 3s</span>
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-left">
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
                    <h4 className="font-bold text-sm text-gray-700">Kedutaan Besar</h4>
                    <p className="text-xs text-gray-500 mb-2">Terdeteksi: Indonesia</p>
                    <button className="w-full bg-blue-50 text-blue-600 text-xs py-1 rounded hover:bg-blue-100 font-bold"><i className="fa-solid fa-phone"></i> Hubungi</button>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-orange-500">
                    <h4 className="font-bold text-sm text-gray-700">Polisi Lokal</h4>
                    <p className="text-xs text-gray-500 mb-2">Area: Bali (110)</p>
                    <button className="w-full bg-orange-50 text-orange-600 text-xs py-1 rounded hover:bg-orange-100 font-bold"><i className="fa-solid fa-phone"></i> Hubungi</button>
                </div>
            </div>

            {showPanicAlert && (
                <div id="panic-alert" className="fixed inset-0 bg-red-600/90 z-[60] flex flex-col items-center justify-center text-white backdrop-blur-sm">
                    <i className="fa-solid fa-circle-notch fa-spin text-5xl mb-4"></i>
                    <h2 className="text-2xl font-bold">MENGIRIM SINYAL SOS...</h2>
                    <p className="mt-2">Lokasi Anda sedang dikirim ke Kedutaan & Kontak Darurat.</p>
                    <button onClick={cancelPanic} className="mt-8 bg-white text-red-600 px-6 py-2 rounded-full font-bold">BATALKAN</button>
                </div>
            )}

        </section>
        )}

      </main>

      {/* AI GENERATOR MODAL */}
      <div id="ai-modal" className={`fixed inset-0 z-[60] ${showAIModal ? '' : 'hidden'}`}>
        {/* Backdrop */}
        <div
            className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity ${showAIModal ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => setShowAIModal(false)}
        ></div>

        {/* Modal Content */}
        <div
            className={`absolute bottom-0 w-full bg-white rounded-t-3xl h-[85vh] transform transition-transform duration-300 flex flex-col ${showAIModal ? 'translate-y-0' : 'translate-y-full'}`}
        >
            {/* Drag Handle */}
            <div className="shrink-0 pt-6 px-6 pb-0">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6"></div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
                {/* STEP 1: FORM */}
                {aiStep === 'form' && (
                    <ItineraryForm
                        mode={homeMode}
                        onSubmit={handleFormSubmit}
                        initialData={formData}
                    />
                )}

                {/* STEP 2: LOADING */}
                {aiStep === 'loading' && (
                    <div id="ai-loading" className="text-center py-24 flex flex-col items-center">
                        <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mb-4 relative">
                            <i className="fa-solid fa-wand-magic-sparkles text-teal-500 text-3xl animate-bounce z-10"></i>
                            <div className="absolute w-full h-full rounded-full border-4 border-teal-100 animate-ping opacity-75"></div>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">Sedang Meracik Perjalanan...</h3>
                        <div className="mt-4 space-y-2 text-sm text-gray-500">
                            <p className="animate-pulse">🔍 Menganalisis prefrensi {homeMode === 'umrah' ? 'ibadah' : 'liburan'}...</p>
                            <p className="animate-pulse delay-75">🌿 Mencari {homeMode === 'umrah' ? 'paket terbaik' : 'destinasi unik'}...</p>
                            <p className="animate-pulse delay-150">💰 Menghitung estimasi biaya...</p>
                        </div>
                    </div>
                )}

                {/* STEP 3: RESULT */}
                {aiStep === 'result' && aiResult && (
                    <ItineraryTemplate
                        data={aiResult}
                        onEdit={handleEditItinerary}
                        onSave={handleSaveItinerary}
                    />
                )}
            </div>

            {/* Close Button (Only on Form) */}
             {aiStep === 'form' && (
                <button onClick={() => setShowAIModal(false)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full hover:bg-gray-200 z-10"><i className="fa-solid fa-xmark"></i></button>
             )}
        </div>
      </div>

      {/* VIRTUAL TL POP-UP (New) */}
      {showTLModal && (
      <div id="tl-modal" className="fixed inset-0 z-[70] flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTLModal(false)}></div>
        <div className="bg-white w-full max-w-sm rounded-2xl p-6 relative z-10 popup-animate">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-bold text-blue-800">Virtual Tour Leader</h3>
                    <p className="text-xs text-gray-500">Asisten Perjalanan 24/7</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-lg">
                    <i className="fa-solid fa-user-check"></i>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                    onClick={() => handleChatSubmit('general', 'Panduan check-in bandara dan hotel.')}
                    className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col items-center gap-2 hover:bg-blue-100 transition"
                >
                    <i className="fa-solid fa-clipboard-check text-2xl text-blue-600"></i>
                    <span className="text-[10px] font-bold text-gray-700">Check-in Guide</span>
                </button>
                <button
                    onClick={() => handleChatSubmit('general', 'Terjemahkan frasa penting untuk turis.')}
                    className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col items-center gap-2 hover:bg-blue-100 transition"
                >
                    <i className="fa-solid fa-language text-2xl text-blue-600"></i>
                    <span className="text-[10px] font-bold text-gray-700">Translate & Tips</span>
                </button>
            </div>

            {/* Chat Area */}
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 mb-6 flex flex-col h-72">
                <div className="flex items-center gap-2 mb-2 shrink-0">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px]">
                        <i className="fa-solid fa-robot"></i>
                    </div>
                    <p className="text-xs font-bold text-gray-700">TL AI Assistant</p>
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto mb-2 space-y-2 pr-1">
                    {tlChat.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-2 rounded-lg text-xs max-w-[85%] whitespace-pre-wrap ${
                                msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-tr-none'
                                : 'bg-white text-gray-600 shadow-sm border border-gray-100 rounded-tl-none'
                            }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isChatLoading && (
                         <div className="flex justify-start">
                            <div className="bg-white p-2 rounded-lg rounded-tl-none text-xs text-gray-500 shadow-sm border border-gray-100">
                                <i className="fa-solid fa-ellipsis fa-fade"></i>
                            </div>
                         </div>
                    )}
                    <div ref={chatEndRef}></div>
                </div>

                {/* Input Area */}
                <div className="flex gap-2 shrink-0">
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit('general')}
                        placeholder="Tanya rekomendasi, rute, dll..."
                        className="w-full text-xs p-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
                        disabled={isChatLoading}
                    />
                    <button
                        onClick={() => handleChatSubmit('general')}
                        className={`bg-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center transition ${isChatLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                        disabled={isChatLoading}
                    >
                        <i className="fa-solid fa-paper-plane text-xs"></i>
                    </button>
                </div>
            </div>

            <button onClick={() => setShowTLModal(false)} className="w-full py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm">Tutup</button>
        </div>
      </div>
      )}

      {/* VIRTUAL MUTHAWIF POP-UP MODAL */}
      {showMuthawifModal && (
      <div id="muthawif-modal" className="fixed inset-0 z-[70] flex items-center justify-center px-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMuthawifModal(false)}></div>

        {/* Modal Content */}
        <div className="bg-white w-full max-w-sm rounded-2xl p-6 relative z-10 popup-animate">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-bold text-purple-800">Virtual Muthawif</h3>
                    <p className="text-xs text-gray-500">Asisten Ibadah Pribadi AI</p>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-lg">
                    <i className="fa-solid fa-robot"></i>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Fitur 1: AR */}
                <button
                    onClick={() => handleChatSubmit('umrah', 'Bagaimana tata cara tawaf yang benar?')}
                    className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex flex-col items-center gap-2 hover:bg-purple-100 transition"
                >
                    <i className="fa-solid fa-vr-cardboard text-2xl text-purple-600"></i>
                    <span className="text-xs font-bold text-gray-700">Panduan Tawaf (AR)</span>
                </button>
                {/* Fitur 2: Audio */}
                <button
                    onClick={() => handleChatSubmit('umrah', 'Tuliskan doa-doa penting saat Umrah.')}
                    className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex flex-col items-center gap-2 hover:bg-purple-100 transition"
                >
                    <i className="fa-solid fa-circle-play text-2xl text-purple-600"></i>
                    <span className="text-xs font-bold text-gray-700">Audio Doa</span>
                </button>
            </div>

            {/* Chat Area */}
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 mb-6 flex flex-col h-72">
                <div className="flex items-center gap-2 mb-2 shrink-0">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px]">
                        <i className="fa-solid fa-user-tie"></i>
                    </div>
                    <p className="text-xs font-bold text-gray-700">Ustadz AI</p>
                    <span className="text-[9px] bg-green-100 text-green-700 px-1 rounded ml-auto">Online</span>
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto mb-2 space-y-2 pr-1">
                    {muthawifChat.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-2 rounded-lg text-xs max-w-[85%] whitespace-pre-wrap ${
                                msg.role === 'user'
                                ? 'bg-purple-600 text-white rounded-tr-none'
                                : 'bg-white text-gray-600 shadow-sm border border-gray-100 rounded-tl-none'
                            }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isChatLoading && (
                         <div className="flex justify-start">
                            <div className="bg-white p-2 rounded-lg rounded-tl-none text-xs text-gray-500 shadow-sm border border-gray-100">
                                <i className="fa-solid fa-ellipsis fa-fade"></i>
                            </div>
                         </div>
                    )}
                    <div ref={chatEndRef}></div>
                </div>

                {/* Input Area */}
                <div className="flex gap-2 shrink-0">
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit('umrah')}
                        placeholder="Tanya hukum tawaf, doa, dll..."
                        className="w-full text-xs p-2 rounded-lg border border-gray-300 focus:outline-none focus:border-purple-500"
                        disabled={isChatLoading}
                    />
                    <button
                        onClick={() => handleChatSubmit('umrah')}
                        className={`bg-purple-600 text-white w-8 h-8 rounded-lg flex items-center justify-center transition ${isChatLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-700'}`}
                        disabled={isChatLoading}
                    >
                        <i className="fa-solid fa-paper-plane text-xs"></i>
                    </button>
                </div>
            </div>

            <button onClick={() => setShowMuthawifModal(false)} className="w-full py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm hover:bg-gray-200 transition">Tutup</button>
        </div>
      </div>
      )}

      {/* BOTTOM STICKY NAVIGATION (Only 4 Buttons) */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 py-2 px-6 flex justify-between items-center text-gray-400 z-50 pb-safe">
        {/* 1. Home */}
        <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 w-16 transition-colors duration-300 ${activeTab === 'home' ? 'text-teal-600 active-nav' : 'text-gray-400'}`}
        >
            <i className="fa-solid fa-compass text-xl"></i>
            <span className="text-[10px] font-medium">Jelajah</span>
        </button>

        {/* 2. Trip */}
        <button
            onClick={() => setActiveTab('trip')}
            className={`flex flex-col items-center gap-1 w-16 hover:text-teal-500 transition-colors duration-300 ${activeTab === 'trip' ? 'text-teal-600 active-nav' : 'text-gray-400'}`}
        >
            <i className="fa-solid fa-suitcase-rolling text-xl"></i>
            <span className="text-[10px] font-medium">Perjalanan</span>
        </button>

        {/* 3. Guide/Services */}
        <button
            onClick={() => setActiveTab('guide')}
            className={`flex flex-col items-center gap-1 w-16 hover:text-teal-500 transition-colors duration-300 ${activeTab === 'guide' ? 'text-teal-600 active-nav' : 'text-gray-400'}`}
        >
            <i className="fa-solid fa-bell-concierge text-xl"></i>
            <span className="text-[10px] font-medium">Layanan</span>
        </button>

        {/* 4. SOS (Safety) */}
        <button
            onClick={() => setActiveTab('sos')}
            className={`flex flex-col items-center gap-1 w-16 hover:text-red-500 transition-colors duration-300 ${activeTab === 'sos' ? 'text-red-500' : 'text-gray-400'}`}
        >
            <div className={`bg-red-100 rounded-full p-1 -mt-1 ${activeTab === 'sos' ? 'ring-2 ring-red-500' : ''}`}>
                <i className="fa-solid fa-shield-cat text-xl text-red-500"></i>
            </div>
            <span className="text-[10px] font-medium text-red-500">SOS</span>
        </button>
      </nav>

    </div>
  );
}

export default App;
