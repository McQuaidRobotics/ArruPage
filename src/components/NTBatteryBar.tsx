import React, { useEffect, useState } from 'react';
import { useNetworkTables } from '../useNetworkTables';
import { NetworkTablesTypeInfos } from 'ntcore-ts-client';

interface NTBatteryBarProps {
  topic: string;
  label: string;
}

export const NTBatteryBar: React.FC<NTBatteryBarProps> = ({ topic, label }) => {
  const { nt } = useNetworkTables();
  const [value, setValue] = useState<number>(0);

  useEffect(() => {
    if (!nt) return;

    const ntTopic = nt.createTopic<number>(topic, NetworkTablesTypeInfos.kDouble, 0);
    
    const subuid = ntTopic.subscribe((newValue) => {
      if (newValue !== null) setValue(newValue);
    });

    return () => {
      ntTopic.unsubscribe(subuid);
    };
  }, [nt, topic]);

  // Constraints
  const minV = 0;
  const maxV = 13;
  const brownoutV = 6.8;

  // Percentage for the bar
  const percentage = Math.min(Math.max((value / maxV) * 100, 0), 100);
  const brownoutPercentage = (brownoutV / maxV) * 100;

  // Determine color
  const getColor = () => {
    if (value <= brownoutV) return 'bg-red-500';
    if (value < 11) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTextColor = () => {
    if (value <= brownoutV) return 'text-red-400';
    if (value < 11) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="bg-gray-800/40 p-3 rounded-lg border border-white/5 space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-gray-400 font-bold uppercase tracking-wider text-xs">{label}</span>
        <span className={`text-xl font-mono font-black ${getTextColor()}`}>
          {value.toFixed(2)}
          <span className="text-xs ml-0.5 opacity-60">V</span>
        </span>
      </div>

      <div className="relative h-3 w-full bg-gray-900 rounded-full overflow-hidden border border-gray-800 shadow-inner">
        {/* Brownout line */}
        <div 
          className="absolute h-full w-0.5 bg-red-600/50 z-10" 
          style={{ left: `${brownoutPercentage}%` }}
        >
          <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[7px] text-red-500 font-bold uppercase">Brownout</span>
        </div>

        {/* Battery Fill */}
        <div 
          className={`h-full transition-all duration-300 ease-out shadow-lg ${getColor()}`}
          style={{ width: `${percentage}%` }}
        />
        
        {/* Subtle segments/grid lines */}
        <div className="absolute inset-0 flex justify-between px-0.5 pointer-events-none opacity-10">
            {[...Array(13)].map((_, i) => (
                <div key={i} className="h-full w-[1px] bg-white"></div>
            ))}
        </div>
      </div>

      <div className="flex justify-between text-[8px] text-gray-500 font-mono leading-none">
        <span>0V</span>
        <span>6.5V</span>
        <span>13V</span>
      </div>
    </div>
  );
};
