import React from 'react';
import Field from '../components/Field';

const MapPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 relative">
      <div className="absolute top-4 left-4 z-50">
        <button onClick={onBack} className="px-3 py-1 bg-gray-800/70 hover:bg-gray-700 rounded-md text-sm transition-colors active:scale-95">Back</button>
      </div>

      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-400">Live Field Map</h1>
        <p className="text-sm text-gray-500">Automatically updates from the simulation</p>
      </header>

      <main className="max-w-6xl mx-auto">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <Field />
        </div>
      </main>
    </div>
  );
};

export default MapPage;
