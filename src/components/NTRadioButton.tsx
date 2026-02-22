import React, { useEffect, useState, useRef } from 'react';
import { useNetworkTables } from '../useNetworkTables';
import { NetworkTablesTypeInfos, NetworkTablesTopic } from 'ntcore-ts-client';

interface NTRadioButtonProps {
  topic: string;
  label: string;
  value: string;
  offValue?: string;
}

export const NTRadioButton: React.FC<NTRadioButtonProps> = ({ topic, label, value, offValue = "" }) => {
  const { nt, connected } = useNetworkTables();
  const [currentValue, setCurrentValue] = useState<string | null>(null);
  const ntTopicRef = useRef<NetworkTablesTopic<string> | null>(null);

  useEffect(() => {
    if (!nt || !connected) return;

    const ntTopic = nt.createTopic<string>(topic, NetworkTablesTypeInfos.kString);
    ntTopicRef.current = ntTopic;

    const setup = async () => {
      await ntTopic.publish();
      if (ntTopic.getValue() === null) {
        ntTopic.setValue(offValue);
      } else {
        setCurrentValue(ntTopic.getValue() as string);
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
  }, [nt, connected, topic, offValue]);

  const handleClick = () => {
    const ntTopic = ntTopicRef.current;
    if (!ntTopic) return;

    if (currentValue === value) {
      ntTopic.setValue(offValue);
    } else {
      ntTopic.setValue(value);
    }
  };

  const isOn = currentValue === value;

  return (
    <button
      onClick={handleClick}
      className={`px-4 py-2 rounded-lg font-bold transition-colors ${
        isOn ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
      } hover:opacity-80 active:scale-95 w-full shadow-lg border-2 border-white/10`}
    >
      {label}: {isOn ? 'ON' : 'OFF'}
    </button>
  );
};
