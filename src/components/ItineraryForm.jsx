import React, { useState, useEffect } from 'react';

const ItineraryForm = ({ mode, onSubmit, initialData }) => {
  const [formData, setFormData] = useState({
    destination: '',
    duration: '3',
    budget: 'Standard',
    travelStyle: [],
    participants: '2',
    specialRequests: '',
    // Umrah Specifics
    packageType: 'Reguler',
    departureDate: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleStyle = (style) => {
    setFormData(prev => {
      const styles = prev.travelStyle.includes(style)
        ? prev.travelStyle.filter(s => s !== style)
        : [...prev.travelStyle, style];
      return { ...prev, travelStyle: styles };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const travelStyles = mode === 'umrah'
    ? ['Ziarah Sejarah', 'Fokus Ibadah', 'Wisata Kuliner Halal', 'City Tour Makkah/Madinah', 'Belanja Oleh-oleh']
    : ['Alam & Outdoor', 'Kuliner', 'Budaya & Sejarah', 'Santai / Staycation', 'Belanja', 'Petualangan'];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-800">
          {mode === 'umrah' ? 'Rencanakan Ibadah Umrah' : 'Rencanakan Liburan Impian'}
        </h3>
        <p className="text-sm text-gray-500">Isi detail agar AI dapat membuat itinerary terbaik.</p>
      </div>

      {/* 1. Destination */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          {mode === 'umrah' ? 'Kota Keberangkatan / Tujuan Tambahan' : 'Tujuan Destinasi'}
        </label>
        <div className="relative">
            <i className="fa-solid fa-location-dot absolute left-3 top-3 text-gray-400"></i>
            <input
            type="text"
            name="destination"
            value={formData.destination}
            onChange={handleChange}
            placeholder={mode === 'umrah' ? "Contoh: Jakarta, plus Turki" : "Contoh: Bali, Labuan Bajo, Jepang"}
            className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none transition"
            required
            />
        </div>
      </div>

      {/* 2. Date & Duration */}
      <div className="grid grid-cols-2 gap-4">
        <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Durasi (Hari)</label>
            <div className="relative">
                <i className="fa-regular fa-clock absolute left-3 top-3 text-gray-400"></i>
                <input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    min="1"
                    className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none transition"
                />
            </div>
        </div>
        <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Peserta</label>
             <div className="relative">
                <i className="fa-solid fa-users absolute left-3 top-3 text-gray-400"></i>
                <input
                    type="number"
                    name="participants"
                    value={formData.participants}
                    onChange={handleChange}
                    min="1"
                    className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none transition"
                />
            </div>
        </div>
      </div>

       {/* Umrah Specific: Departure Date */}
       {mode === 'umrah' && (
         <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Rencana Keberangkatan</label>
             <div className="relative">
                <i className="fa-regular fa-calendar absolute left-3 top-3 text-gray-400"></i>
                 <input
                    type="date"
                    name="departureDate"
                    value={formData.departureDate}
                    onChange={handleChange}
                    className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none transition"
                />
            </div>
         </div>
       )}

      {/* 3. Budget / Package Class */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
            {mode === 'umrah' ? 'Kelas Paket' : 'Estimasi Budget'}
        </label>
        <div className="flex bg-gray-100 p-1 rounded-xl">
            {['Hemat', 'Standard', 'Sultan'].map((opt) => (
                <button
                    key={opt}
                    type="button"
                    onClick={() => handleChange({ target: { name: mode === 'umrah' ? 'packageType' : 'budget', value: opt } })}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                        (mode === 'umrah' ? formData.packageType : formData.budget) === opt
                        ? 'bg-white text-teal-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    {opt}
                </button>
            ))}
        </div>
      </div>

      {/* 4. Interests / Travel Style */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
             {mode === 'umrah' ? 'Fokus Ibadah & Ziarah' : 'Gaya Perjalanan'}
        </label>
        <div className="flex flex-wrap gap-2">
            {travelStyles.map((style) => (
                <button
                    key={style}
                    type="button"
                    onClick={() => toggleStyle(style)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                        formData.travelStyle.includes(style)
                        ? 'bg-teal-50 border-teal-500 text-teal-700 font-bold'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                >
                    {style}
                </button>
            ))}
        </div>
      </div>

      {/* 5. Special Requests */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Permintaan Khusus</label>
        <textarea
            name="specialRequests"
            value={formData.specialRequests}
            onChange={handleChange}
            placeholder={mode === 'umrah' ? "Misal: Butuh kursi roda, hotel dekat masjid..." : "Misal: Alergi seafood, bawa anak kecil, butuh fotografer..."}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none h-24 text-sm"
        ></textarea>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full bg-teal-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-teal-200 hover:bg-teal-700 transition transform active:scale-95 flex items-center justify-center gap-2"
      >
        <i className="fa-solid fa-wand-magic-sparkles"></i>
        Buat Itinerary {mode === 'umrah' ? 'Ibadah' : 'Sekarang'}
      </button>

    </form>
  );
};

export default ItineraryForm;
