import { useState } from 'react';

function App() {
  const [heartRate, setHeartRate] = useState(72);
  const [status, setStatus] = useState('Optimal');

  const boostPulse = () => {
    const newRate = heartRate + Math.floor(Math.random() * 15) + 5;
    setHeartRate(newRate);
    if (newRate > 100) {
      setStatus('High Energy! ⚡');
    }
  };

  const resetPulse = () => {
    setHeartRate(72);
    setStatus('Optimal');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-slate-100">
      {/* App Header */}
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-cyan-400 sm:text-5xl">
          MedSync Portal
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Clinical Precision System • Tailwind Test Mode
        </p>
      </header>

      {/* Interactive Heart Rate Card */}
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Live Pulse Monitor
          </span>
          <span className="inline-flex items-center rounded-full bg-cyan-950 px-2.5 py-0.5 text-xs font-medium text-cyan-400 border border-cyan-800">
            {status}
          </span>
        </div>

        <div className="my-6 text-center">
          <div className="inline-block animate-pulse text-6xl">❤️</div>
          <div className="mt-2 text-5xl font-black text-white">
            {heartRate} <span className="text-lg font-normal text-slate-400">BPM</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex gap-3">
          <button
            onClick={boostPulse}
            className="flex-1 rounded-lg bg-cyan-400 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 active:scale-95"
          >
            Boost Pulse ⚡
          </button>
          <button
            onClick={resetPulse}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 active:scale-95"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;