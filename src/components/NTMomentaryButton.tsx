import React, { useEffect, useState, useRef } from 'react';
import { useNetworkTables } from '../useNetworkTables';
import { NetworkTablesTypeInfos, NetworkTablesTopic } from 'ntcore-ts-client';

interface NTMomentaryButtonProps {
  topic: string;
  label: string;
}

export const NTMomentaryButton: React.FC<NTMomentaryButtonProps> = ({ topic, label }) => {
  const { nt, connected } = useNetworkTables();
  const [pressed, setPressed] = useState(false);
  const ntTopicRef = useRef<NetworkTablesTopic<boolean> | null>(null);

  useEffect(() => {
    if (!nt || !connected) return;
    const ntTopic = nt.createTopic<boolean>(topic, NetworkTablesTypeInfos.kBoolean);
    ntTopicRef.current = ntTopic;
    
    const setup = async () => {
        await new Promise(r => setTimeout(r, Math.random() * 1000));
        let attempts = 0;
        while (attempts < 3) {
            try {
                await ntTopic.publish();
                ntTopic.setValue(false);
                setPressed(false);
                return;
            } catch (_err) {
                attempts++;
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    };

    setup();
    
    const subuid = ntTopic.subscribe((val) => {
        if (val !== null) setPressed(val);
    });

    return () => {
        ntTopic.unsubscribe(subuid);
        ntTopicRef.current = null;
    };
  }, [nt, connected, topic]);

  const handlePress = () => {
    const ntTopic = ntTopicRef.current;
    if (ntTopic) {
      ntTopic.setValue(true);
    }
  };

  const handleRelease = () => {
    const ntTopic = ntTopicRef.current;
    if (ntTopic) {
      ntTopic.setValue(false);
    }
  };

  return (
    <button
      onMouseDown={handlePress}
      onMouseUp={handleRelease}
      onMouseLeave={pressed ? handleRelease : undefined} // Safety: release if mouse leaves button
      onTouchStart={handlePress}
      onTouchEnd={handleRelease}
      className={`px-4 py-2 rounded-lg font-bold transition-all ${
        pressed 
          ? 'bg-yellow-500 text-black scale-95 shadow-inner' 
          : 'bg-gray-700 text-white shadow-lg border-2 border-white/5'
      } w-full select-none`}
    >
      {label} {pressed ? '(HOLDING)' : ''}
    </button>
  );
};
