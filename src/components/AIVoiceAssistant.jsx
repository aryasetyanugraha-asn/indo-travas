import React, { useState, useEffect, useMemo } from 'react';

const AIVoiceAssistant = ({ data }) => {
  const [active, setActive] = useState(false); // Widget open/closed
  const [speaking, setSpeaking] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Flatten the itinerary into speakable steps
  const steps = useMemo(() => {
    if (!data || !data.dailyItinerary) return [];
    const list = [];

    // Intro Step
    list.push({
        title: "Selamat Datang!",
        text: `Halo! Saya asisten perjalanan AI Anda. Kita akan memulai perjalanan ke ${data.destination} selama ${data.duration}. Siapkan diri Anda!`,
        location: "Start"
    });

    data.dailyItinerary.forEach(day => {
        if (day.activities) {
            day.activities.forEach(act => {
                list.push({
                    title: act.activity,
                    text: `Pukul ${act.time}. ${act.activity}. ${act.description}. Lokasi di ${act.location || 'sekitar area'}.`,
                    location: act.location
                });
            });
        }
    });

    // Outro
    list.push({
        title: "Perjalanan Selesai",
        text: "Itinerary telah selesai. Semoga perjalanan Anda menyenangkan!",
        location: "Finish"
    });

    return list;
  }, [data]);

  const handleSpeak = (index) => {
      if (!steps[index]) return;

      const step = steps[index];
      const textToSpeak = step.text;

      if ('speechSynthesis' in window) {
          // Cancel previous
          window.speechSynthesis.cancel();

          const utterance = new SpeechSynthesisUtterance(textToSpeak);
          utterance.lang = 'id-ID'; // Indonesian
          utterance.rate = 1.0;
          utterance.pitch = 1.0;

          utterance.onstart = () => setSpeaking(true);
          utterance.onend = () => setSpeaking(false);
          utterance.onerror = () => setSpeaking(false);

          window.speechSynthesis.speak(utterance);
          setCurrentStep(index);
      } else {
          alert("Browser ini tidak mendukung fitur suara.");
      }
  };

  const stopSpeak = () => {
      if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          setSpeaking(false);
      }
  };

  const handleNext = () => {
      if (currentStep < steps.length - 1) {
          handleSpeak(currentStep + 1);
      }
  };

  const handlePrev = () => {
      if (currentStep > 0) {
          handleSpeak(currentStep - 1);
      }
  };

  // Auto-greeting when activated first time
  useEffect(() => {
      if (active && currentStep === 0 && !speaking) {
         // Optional: Auto start? Maybe annoying. Let's wait for user interaction.
      }
  }, [active]);

  if (!data) return null;

  return (
    <>
      {/* Floating Trigger Button (When Closed) */}
      {!active && (
        <button
            onClick={() => { setActive(true); handleSpeak(currentStep); }}
            className="fixed bottom-24 right-4 z-40 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:scale-105 transition-transform flex items-center gap-2 border-2 border-white animate-bounce"
        >
            <i className="fa-solid fa-robot text-xl"></i>
            <span className="text-xs font-bold hidden md:block">Asisten Jalan</span>
        </button>
      )}

      {/* Expanded Widget (When Active) */}
      {active && (
        <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white rounded-2xl shadow-2xl z-50 border border-indigo-100 overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${speaking ? 'bg-green-400 animate-ping' : 'bg-gray-400'}`}></div>
                    <h3 className="font-bold text-sm">AI Trip Monitor</h3>
                </div>
                <button onClick={() => { setActive(false); stopSpeak(); }} className="text-white/80 hover:text-white">
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </div>

            {/* Content */}
            <div className="p-4 bg-indigo-50">
                <div className="flex flex-col items-center text-center mb-4">
                     {/* Visualizer Animation */}
                     <div className="h-12 flex items-center gap-1 mb-2">
                        {speaking ? (
                            <>
                                <div className="w-1 h-4 bg-indigo-500 rounded animate-[wave_1s_ease-in-out_infinite]"></div>
                                <div className="w-1 h-8 bg-purple-500 rounded animate-[wave_0.5s_ease-in-out_infinite]"></div>
                                <div className="w-1 h-6 bg-indigo-500 rounded animate-[wave_1.2s_ease-in-out_infinite]"></div>
                                <div className="w-1 h-8 bg-purple-500 rounded animate-[wave_0.8s_ease-in-out_infinite]"></div>
                                <div className="w-1 h-4 bg-indigo-500 rounded animate-[wave_1s_ease-in-out_infinite]"></div>
                            </>
                        ) : (
                            <i className="fa-solid fa-microphone-lines text-3xl text-gray-300"></i>
                        )}
                     </div>

                    <p className="text-xs text-indigo-400 font-bold mb-1">LANGKAH {currentStep + 1} DARI {steps.length}</p>
                    <h4 className="font-bold text-gray-800 text-lg leading-tight mb-2">{steps[currentStep]?.title}</h4>
                    <p className="text-xs text-gray-500 line-clamp-2">{steps[currentStep]?.text}</p>
                </div>

                {/* Controls */}
                <div className="flex justify-center gap-4">
                    <button onClick={handlePrev} disabled={currentStep === 0} className="w-10 h-10 rounded-full bg-white text-indigo-600 shadow-sm hover:bg-gray-50 disabled:opacity-50">
                        <i className="fa-solid fa-backward-step"></i>
                    </button>

                    <button onClick={() => speaking ? stopSpeak() : handleSpeak(currentStep)} className="w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 flex items-center justify-center text-xl transition-all">
                        <i className={`fa-solid ${speaking ? 'fa-pause' : 'fa-play'}`}></i>
                    </button>

                    <button onClick={handleNext} disabled={currentStep === steps.length - 1} className="w-10 h-10 rounded-full bg-white text-indigo-600 shadow-sm hover:bg-gray-50 disabled:opacity-50">
                        <i className="fa-solid fa-forward-step"></i>
                    </button>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-gray-200 w-full">
                <div
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                ></div>
            </div>
        </div>
      )}
    </>
  );
};

export default AIVoiceAssistant;
