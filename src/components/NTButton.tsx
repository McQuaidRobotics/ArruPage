import React, { useEffect, useState, useRef } from 'react';
import { useNetworkTables } from '../NetworkTablesContext';
import { NetworkTablesTypeInfos, NetworkTablesTopic } from 'ntcore-ts-client';

interface NTButtonProps {
  topic: string;
  label: string;
  initialValue?: boolean;
}

export const NTButton: React.FC<NTButtonProps> = ({ topic, label, initialValue = false }) => {
  const { nt, connected } = useNetworkTables();
  const [value, setValue] = useState<boolean>(initialValue);
  const ntTopicRef = useRef<NetworkTablesTopic<boolean> | null>(null);

  useEffect(() => {
    if (!nt || !connected) return;

    const ntTopic = nt.createTopic<boolean>(topic, NetworkTablesTypeInfos.kBoolean);
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
                    ntTopic.setValue(initialValue);
                } else {
                    setValue(ntTopic.getValue() as boolean);
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
      if (newValue !== null) setValue(newValue);
    });

    return () => {
      ntTopic.unsubscribe(subuid);
      ntTopicRef.current = null;
    };
  }, [nt, connected, topic, initialValue]);

  const handleClick = () => {
    const ntTopic = ntTopicRef.current;
    if (!ntTopic) return;
    
    // We already published in useEffect, so we just set the value here
    ntTopic.setValue(!value);
  };

  return (
    <button
      onClick={handleClick}
      className={`px-4 py-2 rounded-lg font-bold transition-colors ${
        value ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
      } hover:opacity-80 active:scale-95 w-full shadow-lg border-2 border-white/10`}
    >
      {label}: {value ? 'ON' : 'OFF'}
    </button>
  );
};
