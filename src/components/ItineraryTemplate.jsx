import React from 'react';

const ItineraryTemplate = ({ data, onEdit, onSave }) => {
  if (!data) return null;

  const {
    tripTitle,
    destination,
    duration,
    totalCostEstimate,
    highlights,
    importantInfo,
    dailyItinerary,
    tripType // 'general' or 'umrah'
  } = data;

  return (
    <div className="animate-fade-in pb-24">
      {/* Header Card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4 relative overflow-hidden">
        <div className="relative z-10">
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full mb-2 inline-block ${tripType === 'umrah' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'}`}>
                <i className={`fa-solid ${tripType === 'umrah' ? 'fa-kaaba' : 'fa-plane'} mr-1`}></i>
                {tripType === 'umrah' ? 'Rencana Perjalanan Umrah' : 'Rencana Perjalanan'}
            </span>
            <h2 className="text-2xl font-bold text-gray-800 leading-tight mb-1">{tripTitle || "Perjalanan Tanpa Judul"}</h2>
            <p className="text-sm text-gray-500"><i className="fa-solid fa-location-dot mr-1"></i> {destination}</p>
        </div>
        {/* Decorative background circle */}
        <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-10 ${tripType === 'umrah' ? 'bg-purple-500' : 'bg-teal-500'}`}></div>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
            <p className="text-xs text-blue-500 mb-1">Durasi</p>
            <p className="font-bold text-gray-800 text-sm">{duration}</p>
        </div>
        <div className="bg-green-50 p-3 rounded-xl border border-green-100">
            <p className="text-xs text-green-600 mb-1">Estimasi Biaya</p>
            <p className="font-bold text-gray-800 text-sm">{totalCostEstimate}</p>
        </div>
      </div>

      {/* Highlights & Info */}
      <div className="space-y-3 mb-6">
        {highlights && highlights.length > 0 && (
            <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
                <h4 className="font-bold text-xs text-orange-800 mb-2"><i className="fa-solid fa-star mr-1"></i> Highlight</h4>
                <div className="flex flex-wrap gap-2">
                    {highlights.map((item, idx) => (
                        <span key={idx} className="bg-white text-orange-600 text-[10px] px-2 py-1 rounded shadow-sm border border-orange-100">{item}</span>
                    ))}
                </div>
            </div>
        )}

        {importantInfo && importantInfo.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <h4 className="font-bold text-xs text-gray-700 mb-2"><i className="fa-solid fa-circle-info mr-1"></i> Info Penting</h4>
                <ul className="text-[10px] text-gray-600 list-disc pl-3 space-y-1">
                    {importantInfo.map((info, idx) => (
                        <li key={idx}>{info}</li>
                    ))}
                </ul>
            </div>
        )}
      </div>

      {/* Daily Itinerary Timeline */}
      <h3 className="font-bold text-gray-800 mb-4 text-md flex items-center gap-2">
        <i className="fa-regular fa-calendar-days text-teal-600"></i> Detail Perjalanan
      </h3>

      <div className="space-y-6 relative border-l-2 border-gray-200 ml-3 pl-6 pb-2">
        {dailyItinerary && dailyItinerary.map((dayPlan, dayIdx) => (
            <div key={dayIdx} className="relative mb-8 last:mb-0">
                {/* Day Marker */}
                <div className="absolute -left-[33px] top-0 w-8 h-8 rounded-full bg-white border-4 border-teal-100 flex items-center justify-center z-10">
                    <div className="w-6 h-6 rounded-full bg-teal-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md">
                        {dayPlan.day}
                    </div>
                </div>

                {/* Day Header */}
                <div className="mb-3">
                    <h4 className="font-bold text-gray-800 text-sm">{dayPlan.title || `Hari ke-${dayPlan.day}`}</h4>
                </div>

                {/* Activities Timeline within the Day */}
                <div className="space-y-3">
                    {dayPlan.activities && dayPlan.activities.map((activity, actIdx) => (
                        <div key={actIdx} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 relative group hover:border-teal-200 transition-colors">
                            <div className="flex justify-between items-start mb-1">
                                <span className="bg-gray-100 text-gray-600 text-[10px] font-mono px-1.5 py-0.5 rounded">{activity.time}</span>
                                {activity.cost && <span className="text-[9px] text-gray-400">{activity.cost}</span>}
                            </div>
                            <h5 className="font-bold text-sm text-gray-800 mb-1">{activity.activity}</h5>
                            <p className="text-xs text-gray-500 leading-relaxed">{activity.description}</p>
                            {activity.location && (
                                <div className="mt-2 pt-2 border-t border-gray-50 flex items-center gap-1 text-[10px] text-blue-500">
                                    <i className="fa-solid fa-map-pin"></i> {activity.location}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40 flex gap-3 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
        <button
            onClick={onEdit}
            className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 font-bold text-sm hover:bg-gray-50 transition"
        >
            <i className="fa-solid fa-pen-to-square mr-2"></i> Edit
        </button>
        <button
            onClick={onSave}
            className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-bold text-sm shadow-lg shadow-teal-200 hover:bg-teal-700 transition"
        >
            <i className="fa-solid fa-bookmark mr-2"></i> Simpan
        </button>
      </div>
    </div>
  );
};

export default ItineraryTemplate;
