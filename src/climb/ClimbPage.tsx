import React from 'react';
import { useNetworkTables } from '../useNetworkTables';
import { NetworkTablesTypeInfos } from 'ntcore-ts-client';
import climbImg from '../assets/maxresdefault.jpg';

const ClimbPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { nt, connected } = useNetworkTables();

  const setClimbLevel = (level: string) => {
    if (!nt || !connected) return;
    const topic = nt.createTopic<string>('/dashboard/climb/level', NetworkTablesTypeInfos.kString);
    topic.publish().then(() => {
        topic.setValue(level);
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col relative">
      {/* Back Button */}
      <div className="absolute top-4 left-4 z-50">
        <button 
          onClick={onBack} 
          className="px-3 py-1 bg-gray-800/70 hover:bg-gray-700 rounded-md text-sm transition-colors active:scale-95 border border-gray-600"
        >
          Back
        </button>
      </div>

      {/* Header */}
      <header className="p-4 text-center">
        <h1 className="text-2xl font-bold text-purple-400 uppercase tracking-widest">Climb Control</h1>
        <p className="text-xs text-gray-500 font-mono">Select target climb level</p>
      </header>

      {/* Main Content (Image) */}
      <main className="flex-1 flex items-center justify-center p-4 mb-20">
        <div className="relative max-w-4xl w-full aspect-video rounded-2xl overflow-hidden border-4 border-gray-800 shadow-2xl">
          <img 
            src={climbImg} 
            alt="Climb Field" 
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/40 to-transparent"></div>
        </div>
      </main>

      {/* Bottom Control Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-800/90 backdrop-blur-md border-t border-gray-700 p-6 flex justify-center items-center gap-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        {[
          { label: 'L1', color: 'bg-blue-600 hover:bg-blue-500' },
          { label: 'Middle', color: 'bg-green-600 hover:bg-green-500' },
          { label: 'L2', color: 'bg-yellow-600 hover:bg-yellow-500' },
          { label: 'L3', color: 'bg-red-600 hover:bg-red-500' }
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={() => setClimbLevel(btn.label)}
            className={`${btn.color} px-8 py-4 rounded-xl font-black text-xl transition-all active:scale-90 shadow-lg border-b-4 border-black/30 flex-1 max-w-[150px] uppercase`}
          >
            {btn.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default ClimbPage;
