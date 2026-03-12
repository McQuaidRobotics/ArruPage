import React, { createContext, useEffect, useState, useMemo } from 'react';
import { NetworkTables } from 'ntcore-ts-client';

interface NetworkTablesContextType {
  nt: NetworkTables | null;
  connected: boolean;
  robotIp: string;
  setTargetIp: (ip: string) => void;
  isManual: boolean;
  resetAutoSwitch: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const NTContext = createContext<NetworkTablesContextType>({ 
  nt: null, 
  connected: false, 
  robotIp: '', 
  setTargetIp: () => {},
  isManual: false,
  resetAutoSwitch: () => {}
});

export const NetworkTablesProvider: React.FC<{ children: React.ReactNode; robotIps: string[] }> = ({ children, robotIps }) => {
  const [currentIpIndex, setCurrentIpIndex] = useState(0);
  const [isManual, setIsManual] = useState(false);
  const robotIp = robotIps[currentIpIndex];
  
  const nt = useMemo(() => NetworkTables.getInstanceByURI(robotIp), [robotIp]);
  const [connected, setConnected] = useState(false);

  const setTargetIp = (ip: string) => {
    const index = robotIps.indexOf(ip);
    if (index !== -1) {
      setCurrentIpIndex(index);
      setIsManual(true);
    }
  };

  const resetAutoSwitch = () => {
    setIsManual(false);
  };

  useEffect(() => {
    let timeoutId: number;
    
    const onConnectionChanged = (isConnected: boolean) => {
      setConnected(isConnected);
      if (isConnected) {
        clearTimeout(timeoutId);
      } else if (!isManual) {
        // Only auto-switch if not in manual mode
        timeoutId = window.setTimeout(() => {
          setCurrentIpIndex((prev) => (prev + 1) % robotIps.length);
        }, 5000);
      }
    };

    const unsubscribe = nt.addRobotConnectionListener(onConnectionChanged, true);

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [nt, robotIps.length, isManual]);

  return (
    <NTContext.Provider value={{ nt, connected, robotIp, setTargetIp, isManual, resetAutoSwitch }}>
      {/* Visual IP Selector - Positioned top right, next to status */}
      <div className="fixed top-4 right-40 z-[110] flex items-center gap-2 pointer-events-none">
        <div className="flex bg-gray-900/90 backdrop-blur-md border border-gray-700 p-0.5 rounded-full shadow-2xl pointer-events-auto">
          {robotIps.map((ip) => (
            <button
              key={ip}
              onClick={() => setTargetIp(ip)}
              className={`px-3 py-1 text-[10px] font-black uppercase tracking-tighter rounded-full transition-all ${
                robotIp === ip
                  ? connected 
                    ? 'bg-green-600 text-white shadow-lg' 
                    : 'bg-yellow-500 text-black animate-pulse'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {ip === '127.0.0.1' ? 'Local' : 'Robot'}
            </button>
          ))}
        </div>
        {isManual && (
          <button 
            onClick={resetAutoSwitch}
            className="text-[9px] bg-red-900/40 text-red-400 border border-red-500/30 px-2 py-1 rounded-full hover:bg-red-800 transition-colors uppercase font-bold pointer-events-auto"
            title="Resume automatic searching"
          >
            Auto
          </button>
        )}
      </div>
      {children}
    </NTContext.Provider>
  );
};
