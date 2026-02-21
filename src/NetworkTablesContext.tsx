import React, { createContext, useEffect, useState, useMemo } from 'react';
import { NetworkTables } from 'ntcore-ts-client';

interface NetworkTablesContextType {
  nt: NetworkTables | null;
  connected: boolean;
}

export const NTContext = createContext<NetworkTablesContextType>({ nt: null, connected: false });

export const NetworkTablesProvider: React.FC<{ children: React.ReactNode; robotIp: string }> = ({ children, robotIp }) => {
  const nt = useMemo(() => NetworkTables.getInstanceByURI(robotIp), [robotIp]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const onConnectionChanged = (isConnected: boolean) => {
      setConnected(isConnected);
    };

    // addRobotConnectionListener returns an unsubscribe function
    const unsubscribe = nt.addRobotConnectionListener(onConnectionChanged, true);

    return () => {
      unsubscribe();
    };
  }, [nt]);

  return (
    <NTContext.Provider value={{ nt, connected }}>
      {children}
    </NTContext.Provider>
  );
};
