import React, {useEffect, useState} from "react";
import { useNetworkTables } from "../NetworkTablesContext";
import { NetworkTablesTypeInfos } from "ntcore-ts-client";

interface NTClockProps {
    topic: string;
    label: string;
    unit?: string;
    precision?: number;
}

export const NTClock: React.FC<NTClockProps> = ({ topic, label }) => {
    const {nt} = useNetworkTables();
    const [time, setTime] = useState<number>(0);
    const [mode, setMode] = useState<string>("disabled");

    useEffect(() => {
        if (!nt) return;

        const timeNtTopic = nt.createTopic<number>(topic + "/time", NetworkTablesTypeInfos.kDouble, 0.0);
        const modeNtTopic = nt.createTopic<string>(topic + "/mode", NetworkTablesTypeInfos.kString, "OFFLINE");

        const timeSubber = timeNtTopic.subscribe((timeValue) => {
            if (timeValue !== null) setTime(timeValue);
        });

        const modeSubber = modeNtTopic.subscribe((modeValue) => {
            if (modeValue !== null && modeValue !== "") setMode(modeValue);
        });

        // Pull current values immediately if they already exist in the cache
        const initialTime = timeNtTopic.getValue();
        const initialMode = modeNtTopic.getValue();
        if (initialTime !== null) setTime(initialTime);
        if (initialMode !== null && initialMode !== "") setMode(initialMode);

        return () => {
            timeNtTopic.unsubscribe(timeSubber);
            modeNtTopic.unsubscribe(modeSubber);
        }
    }, [nt, topic]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col items-center justify-center min-w-[200px] shadow-lg">
            {/* Game Mode Label */}
            <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${
                mode.toLowerCase() === 'auton' ? 'text-yellow-400' : 
                mode.toLowerCase() === 'teleop' ? 'text-green-400' : 
                'text-red-500'
            }`}>
                {mode}
            </div>

            {/* Big Clock Face */}
            <div className={`text-5xl font-mono font-black tabular-nums transition-colors duration-500 ${
                mode.toLowerCase() === 'teleop' ? 'text-green-400' : 'text-red-500'
            }`}>
                {formatTime(time)}
            </div>

            {/* Bottom Label */}
            <div className="text-[10px] text-gray-500 mt-2 uppercase font-bold tracking-tighter">
                {label}
            </div>
        </div>
    );
};