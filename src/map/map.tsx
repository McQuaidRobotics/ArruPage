import React, { useState } from 'react';
import Field from '../components/Field';

const MapPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [refreshKey, setRefreshKey] = useState(Date.now());

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 relative">
      <div className="absolute top-4 left-4 z-50 flex gap-2">
        <button onClick={onBack} className="px-3 py-1 bg-gray-800/70 hover:bg-gray-700 rounded-md text-sm transition-colors active:scale-95">Back</button>
        <button onClick={() => setRefreshKey(Date.now())} className="px-3 py-1 bg-blue-800/70 hover:bg-blue-700 rounded-md text-sm transition-colors active:scale-95">Refresh</button>
      </div>

      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-400">Live Field Map</h1>
        <p className="text-sm text-gray-500">Click "Refresh" to force an update from the robot</p>
      </header>

      <main className="max-w-full mx-auto px-2">
        <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-2xl">
          <Field key={refreshKey} />
        </div>
      </main>
    </div>
  );
};

export default MapPage;
