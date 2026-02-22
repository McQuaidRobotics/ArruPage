import React, { useEffect, useState, useRef } from 'react';
import { useNetworkTables } from '../useNetworkTables';
import { NetworkTablesTypeInfos, NetworkTablesTopic } from 'ntcore-ts-client';

interface NTMomentaryButtonProps {
  topic: string;
  label: string;
  sendValue?: string | number | boolean; // Optional value to send on press
}

export const NTMomentaryButton: React.FC<NTMomentaryButtonProps> = ({ topic, label, sendValue }) => {
  const { nt, connected } = useNetworkTables();
  const [pressed, setPressed] = useState(false);
  const ntTopicRef = useRef<NetworkTablesTopic<boolean | string | number> | null>(null);

  useEffect(() => {
    if (!nt || !connected) return;
    const type = typeof sendValue === 'string' ? NetworkTablesTypeInfos.kString :
                 typeof sendValue === 'number' ? NetworkTablesTypeInfos.kDouble :
                 NetworkTablesTypeInfos.kBoolean;
    const ntTopic = nt.createTopic<boolean | string | number>(topic, type);
    ntTopicRef.current = ntTopic;
    
    const setup = async () => {
        await new Promise(r => setTimeout(r, Math.random() * 1000));
        let attempts = 0;
        while (attempts < 3) {
            try {
                await ntTopic.publish();
                ntTopic.setValue(false); // Default initial value to false for boolean topics
                setPressed(false);
                return;
            } catch {
                attempts++;
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    };

    setup();
    
    // Subscribe to changes to update UI, only if sending booleans
    const subuid = ntTopic.subscribe((val) => {
        if (typeof val === 'boolean' && val !== null) {
          setPressed(val);
        }
    });

    return () => {
        ntTopic.unsubscribe(subuid);
        ntTopicRef.current = null;
    };
  }, [nt, connected, topic, sendValue]);

  const handlePress = () => {
    const ntTopic = ntTopicRef.current;
    if (ntTopic) {
      ntTopic.setValue(sendValue !== undefined ? sendValue : true);
    }
  };

  const handleRelease = () => {
    const ntTopic = ntTopicRef.current;
    if (ntTopic && sendValue === undefined) { // Only send false on release if it's a boolean momentary button
      ntTopic.setValue(false);
    }
  };

  return (
    <button
      onMouseDown={handlePress}
      onMouseUp={handleRelease}
      onMouseLeave={pressed && sendValue === undefined ? handleRelease : undefined} // Only for boolean momentary
      onTouchStart={handlePress}
      onTouchEnd={handleRelease}
      className={`px-4 py-2 rounded-lg font-bold transition-all ${
        (pressed && sendValue === undefined) // Only 'pressed' style for boolean momentary
          ? 'bg-yellow-500 text-black scale-95 shadow-inner' 
          : 'bg-gray-700 text-white shadow-lg border-2 border-white/5'
      } w-full select-none`}
    >
      {label} {(pressed && sendValue === undefined) ? '(HOLDING)' : ''}
    </button>
  );
};
