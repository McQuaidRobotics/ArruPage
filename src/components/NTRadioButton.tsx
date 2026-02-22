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
        // Stagger the initial start to avoid overwhelming the server
        await new Promise(r => setTimeout(r, Math.random() * 1000));

        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                await ntTopic.publish();
                
                // If we reach here, publish succeeded
                if (ntTopic.getValue() === null) {
                    ntTopic.setValue(offValue);
                } else {
                    setCurrentValue(ntTopic.getValue() as string);
                }
                return; // Exit success
            } catch (err) {
                attempts++;
                console.warn(`Publish attempt ${attempts} failed for ${topic}. Retrying...`);
                if (attempts === maxAttempts) {
                    console.error(`Failed to publish ${topic} after ${maxAttempts} tries:`, err);
                } else {
                    await new Promise(r => setTimeout(r, 1000)); // Wait before retry
                }
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
