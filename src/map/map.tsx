import React from 'react';
import Field from '../components/Field';

const MapPage: React.FC<{ onBack: () => void; refreshKey: number }> = ({ onBack, refreshKey }) => {
  return (
    <div className="min-h-screen bg-gray-900 text-white relative">
      <div className="absolute top-4 left-4 z-50">
        <button onClick={onBack} className="px-3 py-1 bg-gray-800/70 hover:bg-gray-700 rounded-md text-sm transition-colors active:scale-95">Back</button>
      </div>

      <header className="mb-2 text-center pt-4">
        <h1 className="text-2xl font-bold text-gray-400">Live Field Map</h1>
        <p className="text-sm text-gray-500">Updates from robot when opened</p>
      </header>

      <main className="max-w-full mx-auto">
        <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden">
          <Field key={refreshKey} />
        </div>
      </main>
    </div>
  );
};

export default MapPage;

