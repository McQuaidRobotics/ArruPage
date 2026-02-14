import React, { createContext, useContext, useEffect, useState } from 'react';
import { NetworkTables } from 'ntcore-ts-client';

interface NetworkTablesContextType {
  nt: NetworkTables | null;
  connected: boolean;
}

const NTContext = createContext<NetworkTablesContextType>({ nt: null, connected: false });

export const NetworkTablesProvider: React.FC<{ children: React.ReactNode; robotIp: string }> = ({ children, robotIp }) => {
  const [nt, setNt] = useState<NetworkTables | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const client = NetworkTables.getInstanceByURI(robotIp);
    
    const onConnectionChanged = (isConnected: boolean) => {
      setConnected(isConnected);
    };

    // addRobotConnectionListener returns an unsubscribe function
    const unsubscribe = client.addRobotConnectionListener(onConnectionChanged, true);
    setNt(client);

    return () => {
      unsubscribe();
    };
  }, [robotIp]);

  return (
    <NTContext.Provider value={{ nt, connected }}>
      {children}
    </NTContext.Provider>
  );
};

export const useNetworkTables = () => useContext(NTContext);
