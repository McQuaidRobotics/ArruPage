import React, { useEffect, useState } from 'react';
import { useNetworkTables } from '../useNetworkTables';
import { NetworkTablesTypeInfos } from 'ntcore-ts-client';

interface NTNumberReadoutProps {
  topic: string;
  label: string;
  unit?: string;
  precision?: number;
}

export const NTNumberReadout: React.FC<NTNumberReadoutProps> = ({ 
  topic, 
  label, 
  unit = '', 
  precision = 2 
}) => {
  const { nt } = useNetworkTables();
  const [value, setValue] = useState<number>(0);

  useEffect(() => {
    if (!nt) return;

    // Use kDouble for most FRC numbers (voltage, distance, etc.)
    const ntTopic = nt.createTopic<number>(topic, NetworkTablesTypeInfos.kDouble, 0);
    
    const subuid = ntTopic.subscribe((newValue) => {
      if (newValue !== null) setValue(newValue);
    });

    return () => {
      ntTopic.unsubscribe(subuid);
    };
  }, [nt, topic]);

  return (
    <div className="bg-gray-700/50 p-4 rounded-lg border border-white/5 flex justify-between items-center">
      <span className="text-gray-400 font-medium">{label}</span>
      <span className="text-2xl font-mono font-bold text-blue-300">
        {value.toFixed(precision)}
        <span className="text-sm ml-1 text-gray-500">{unit}</span>
      </span>
    </div>
  );
};
