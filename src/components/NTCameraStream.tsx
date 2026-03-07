import React, { useEffect, useState } from 'react';
import { useNetworkTables } from '../useNetworkTables';
import { NetworkTablesTypeInfos } from 'ntcore-ts-client';

interface NTCameraStreamProps {
  label: string;
  topic?: string; // Optional: NT topic that holds the stream URL
  defaultUrl?: string; // Optional: Static fallback URL
}

export const NTCameraStream: React.FC<NTCameraStreamProps> = ({ 
  label, 
  topic, 
  defaultUrl = '' 
}) => {
  const { nt, connected } = useNetworkTables();
  const [streamUrl, setStreamUrl] = useState<string>(defaultUrl);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!nt || !topic) return;

    const ntTopic = nt.createTopic<string>(topic, NetworkTablesTypeInfos.kString, defaultUrl);
    
    const subuid = ntTopic.subscribe((newValue) => {
      if (newValue) {
        // Clean up URL if it comes in as a raw array or with extra quotes
        setStreamUrl(newValue.replace(/"/g, ''));
        setIsError(false);
      }
    });

    return () => {
      ntTopic.unsubscribe(subuid);
    };
  }, [nt, topic, defaultUrl]);

  const handleImageError = () => {
    setIsError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setIsError(false);
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-xl flex flex-col">
      <div className="bg-gray-700/50 px-4 py-2 flex justify-between items-center border-b border-gray-700">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-400">{label}</span>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected && !isError ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-[10px] text-gray-400 font-mono">
            {connected && !isError ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
        {streamUrl && !isError ? (
          <img 
            src={streamUrl} 
            alt={label}
            className="w-full h-full object-contain"
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
        ) : (
          <div className="text-center p-6">
            <div className="text-gray-600 mb-2">
              <svg className="w-12 h-12 mx-auto mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
                {isError ? 'Stream Connection Failed' : 'No Camera Stream'}
              </p>
              <p className="text-[10px] text-gray-700 mt-1 font-mono">{streamUrl || 'URL NOT PROVIDED'}</p>
            </div>
            {isError && (
               <button 
                 onClick={() => { setIsError(false); setIsLoading(true); }}
                 className="mt-2 text-[10px] px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors uppercase font-bold"
               >
                 Retry
               </button>
            )}
          </div>
        )}

        {isLoading && !isError && streamUrl && (
          <div className="absolute inset-0 bg-black flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
};
