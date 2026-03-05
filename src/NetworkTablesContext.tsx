import React, { createContext, useEffect, useState, useMemo } from 'react';
import { NetworkTables } from 'ntcore-ts-client';

interface NetworkTablesContextType {
  nt: NetworkTables | null;
  connected: boolean;
}

// eslint-disable-next-line react-refresh/only-export-components
export const NTContext = createContext<NetworkTablesContextType>({ nt: null, connected: false });

export const NetworkTablesProvider: React.FC<{ children: React.ReactNode; robotIp: string }> = ({ children, robotIp }) => {
  const nt = useMemo(() => {
    console.log(`[NT] Attempting connection to robot at: ${robotIp}`);
    // Use getInstance instead of getInstanceByURI for better compatibility
    return NetworkTables.getInstance(robotIp);
  }, [robotIp]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!nt) return;

    const onConnectionChanged = (isConnected: boolean) => {
      console.log(`[NT] Connection Status Changed: ${isConnected ? '● CONNECTED' : '○ DISCONNECTED'}`);
      setConnected(isConnected);
    };

    console.log('[NT] Registering connection listener...');
    // The second parameter 'true' tells the library to immediately report the current status
    const unsubscribe = nt.addRobotConnectionListener(onConnectionChanged, true);

    return () => {
      console.log('[NT] Unregistering connection listener');
      unsubscribe();
    };
  }, [nt]);

  return (
    <NTContext.Provider value={{ nt, connected }}>
      {children}
    </NTContext.Provider>
  );
};
