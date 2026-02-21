import React, { useEffect, useState, useRef } from 'react';
import { useNetworkTables } from '../useNetworkTables';
import { NetworkTablesTypeInfos, NetworkTablesTopic } from 'ntcore-ts-client';

interface NTSliderProps {
  topic: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
}

export const NTSlider: React.FC<NTSliderProps> = ({ 
  topic, 
  label, 
  min = 0, 
  max = 1, 
  step = 0.01 
}) => {
  const { nt, connected } = useNetworkTables();
  const [value, setValue] = useState<number>(min);
  const ntTopicRef = useRef<NetworkTablesTopic<number> | null>(null);

  useEffect(() => {
    if (!nt || !connected) return;

    const ntTopic = nt.createTopic<number>(topic, NetworkTablesTypeInfos.kDouble);
    ntTopicRef.current = ntTopic;
    
    const setup = async () => {
        await new Promise(r => setTimeout(r, Math.random() * 1000));
        let attempts = 0;
        while (attempts < 3) {
            try {
                await ntTopic.publish();
                if (ntTopic.getValue() === null) {
                    ntTopic.setValue(min);
                } else {
                    setValue(ntTopic.getValue() as number);
                }
                return;
            } catch {
                attempts++;
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    };

    setup();

    const subuid = ntTopic.subscribe((newValue) => {
      if (newValue !== null) setValue(newValue);
    });

    return () => {
      ntTopic.unsubscribe(subuid);
      ntTopicRef.current = null;
    };
  }, [nt, connected, topic, min]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    setValue(newValue);
    
    const ntTopic = ntTopicRef.current;
    if (ntTopic) {
      ntTopic.setValue(newValue);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <label className="text-xl font-semibold text-gray-200">{label}</label>
        <span className="text-blue-400 font-mono font-bold text-xl">
          {value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};
