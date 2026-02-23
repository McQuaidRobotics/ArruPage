import React, { useEffect, useState, useRef } from 'react';
import { useNetworkTables } from '../useNetworkTables';
import { NetworkTablesTypeInfos, NetworkTablesTopic } from 'ntcore-ts-client';

interface NTRadioButtonProps {
  topic: string;
  label: string;
  value: string | number;
}

export const NTRadioButton: React.FC<NTRadioButtonProps> = ({ topic, label, value }) => {
  const { nt, connected } = useNetworkTables();
  const [currentValue, setCurrentValue] = useState<string | number | null>(null);
  const ntTopicRef = useRef<NetworkTablesTopic<string | number> | null>(null);

  useEffect(() => {
    if (!nt || !connected) return;

    const type = typeof value === 'number' ? NetworkTablesTypeInfos.kDouble : NetworkTablesTypeInfos.kString;
    const ntTopic = nt.createTopic<string | number>(topic, type);
    ntTopicRef.current = ntTopic;

    const setup = async () => {
        await new Promise(r => setTimeout(r, Math.random() * 1000));
        let attempts = 0;
        while (attempts < 3) {
            try {
                await ntTopic.publish();
                const val = ntTopic.getValue();
                if (val !== null) {
                    setCurrentValue(val);
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
      if (newValue !== null) setCurrentValue(newValue);
    });

    return () => {
      ntTopic.unsubscribe(subuid);
      ntTopicRef.current = null;
    };
  }, [nt, connected, topic, value]);

  const handleClick = () => {
    const ntTopic = ntTopicRef.current;
    if (!ntTopic) return;
    ntTopic.setValue(value);
  };

  const isOn = currentValue === value;

  return (
    <button
      onClick={handleClick}
      className={`px-4 py-3 rounded-xl font-bold transition-all duration-200 shadow-lg border-2 select-none active:scale-95 w-full ${
        isOn 
          ? 'bg-purple-600 text-white border-purple-400 scale-[1.02] ring-2 ring-purple-500/20' 
          : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-gray-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <span>{label}</span>
        {isOn && (
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
        )}
      </div>
    </button>
  );
};
