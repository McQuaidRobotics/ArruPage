import { NetworkTablesProvider } from './NetworkTablesContext';
import { useNetworkTables } from './useNetworkTables';
import { NTButton } from './components/NTButton';
import { NTMomentaryButton } from './components/NTMomentaryButton';
import { NTNumberReadout } from './components/NTNumberReadout';
import { NTSlider } from './components/NTSlider';
import { NTClock } from './components/NTClock';
import MapPage from './map/map';
import { useState, useEffect } from 'react';

const ConnectionStatus = () => {
  const { connected } = useNetworkTables();
  return (
    <div className={`fixed top-4 right-4 px-3 py-1 rounded-full text-sm font-medium ${
      connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    }`}>
      {connected ? '● Connected' : '○ Disconnected'}
    </div>
  );
};

function Dashboard({ goToMap }: { goToMap: () => void }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 relative overflow-auto">
      <ConnectionStatus />

      <div className="absolute top-4 left-4 flex items-center gap-2 z-50">
        <button onClick={goToMap} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold transition-all active:scale-95 shadow-lg">Open Map</button>
        <div className="ml-2">
          <p className="text-sm text-gray-400 font-mono">Team 3173</p>
        </div>
      </div>
      
      <header className="mb-8 flex flex-col items-center text-center">
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">FRC Dashboard 2026</h1>
        
        {/* Top Middle Clock */}
        <div className="mt-6 mb-4">
          <NTClock topic="/FMS" label="Match Timer" />
        </div>
      </header>

      <main className="space-y-8 max-w-7xl mx-auto pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Toggle Buttons */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-blue-400 uppercase tracking-wider">Toggle Controls</h2>
            <div className="flex flex-col gap-4">
              <NTButton topic="/dashboard/intake" label="Intake" initialValue={true} />
              <NTButton topic="/dashboard/shooter" label="Shooter" initialValue={true} />
            </div>
          </div>

          {/* Momentary Buttons */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-blue-400 uppercase tracking-wider">Momentary</h2>
            <div className="flex flex-col gap-4">
              <NTMomentaryButton topic="/dashboard/hippo" label="Hippo" />
              <NTMomentaryButton topic="/dashboard/climb" label="Climber" />
            </div>
          </div>

          {/* Sensor Readouts */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-blue-400 uppercase tracking-wider">Sensor Data</h2>
            <div className="flex flex-col gap-4">
              <NTNumberReadout topic="/dashboard/battery" label="Battery" unit="V" />
              <NTNumberReadout topic="/dashboard/time" label="Match Time" unit="s" precision={0} />
            </div>
          </div>
        </div>

        {/* Settings Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <NTSlider topic="/dashboard/detune" label="Drive Detune" min={0} max={1} step={0.05} />
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 border-dashed flex items-center justify-center">
            <p className="text-gray-500 text-center font-medium">Additional robot configuration available in the driver station</p>
          </div>
        </div>
      </main>
    </div>
  );
}

function App() {
  const robotIp = '127.0.0.1'; 
  const [page, setPage] = useState<'dashboard' | 'map'>(() => {
    return window.location.pathname === '/map' ? 'map' : 'dashboard';
  });

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const isMap = window.location.pathname === '/map';
      setPage(isMap ? 'map' : 'dashboard');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const goToMap = () => {
    setPage('map');
    window.history.pushState({}, '', '/map');
  };

  const goBack = () => {
    setPage('dashboard');
    if (window.location.pathname === '/map') {
      window.history.back();
    } else {
      window.history.pushState({}, '', '/');
    }
  };

  return (
    <NetworkTablesProvider robotIp={robotIp}>
      <div className="min-h-screen bg-gray-900 overflow-hidden">
        {page === 'dashboard' ? (
          <Dashboard goToMap={goToMap} />
        ) : (
          <MapPage onBack={goBack} />
        )}
      </div>
    </NetworkTablesProvider>
  );
}

export default App;
