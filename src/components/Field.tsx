import React, { useState, useRef, useEffect, useMemo } from 'react';
import fieldImage from '../assets/2026 FRC.png';
import { useNetworkTables } from '../useNetworkTables';
import { NetworkTablesTopic, NetworkTablesTypeInfos } from 'ntcore-ts-client';

// A palette of distinct colors for locked waypoints
const WAYPOINT_COLORS = {
  Aim: '#FF00FF',   // Fuchsia
  Shoot: '#00FFFF', // Aqua
  Move: '#00FF00',  // Lime
  General: '#FFFF00' // Yellow
} as const;

export const WaypointType = {
  Aim: 'Aim',
  Shoot: 'Shoot',
  Move: 'Move',
  General: 'General',
} as const;

export type WaypointType = (typeof WaypointType)[keyof typeof WaypointType];

type Waypoint = {
  status: "current" | "locked";
  pose: { x: number; y: number };
  color: string;
  type: WaypointType;
};

const Field: React.FC = () => {
  const { nt, connected } = useNetworkTables();
  const imageRef = useRef<HTMLImageElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [selectedWaypointIndex, setSelectedWaypointIndex] = useState<number | null>(null);
  const [settingType, setSettingType] = useState<WaypointType | null>(null);

  const fieldLengthFeet = 57.5; // X-axis
  const fieldWidthFeet = 26.4;  // Y-axis

  // Topic Refs
  const topicsRef = useRef<{
    waypoints?: NetworkTablesTopic<string>;
    clickX?: NetworkTablesTopic<number>;
    clickY?: NetworkTablesTopic<number>;
    aimX?: NetworkTablesTopic<number>;
    aimY?: NetworkTablesTopic<number>;
    aimTrigger?: NetworkTablesTopic<boolean>;
    passX?: NetworkTablesTopic<number>;
    passY?: NetworkTablesTopic<number>;
    passTrigger?: NetworkTablesTopic<boolean>;
    moveX?: NetworkTablesTopic<number>;
    moveY?: NetworkTablesTopic<number>;
    moveTrigger?: NetworkTablesTopic<boolean>;
  }>({});

  const getWaypointByType = (type: WaypointType) => {
    return waypoints.find(wp => wp.type === type);
  };

  // Helper to convert pose to pixel
  const poseToPixel = useMemo(() => (pose: { x: number; y: number }) => {
    if (!dimensions) return { x: 0, y: 0 };
    return {
      x: (pose.x / fieldLengthFeet) * dimensions.width,
      y: (pose.y / fieldWidthFeet) * dimensions.height
    };
  }, [dimensions, fieldLengthFeet, fieldWidthFeet]);

  // Effect to set up NetworkTables topics
  useEffect(() => {
    if (!nt || !connected) return;

    const ntTopics = {
      waypoints: nt.createTopic<string>('/dashboard/field/waypoints', NetworkTablesTypeInfos.kString),
      clickX: nt.createTopic<number>('/dashboard/field/clickX', NetworkTablesTypeInfos.kDouble),
      clickY: nt.createTopic<number>('/dashboard/field/clickY', NetworkTablesTypeInfos.kDouble),
      aimX: nt.createTopic<number>('/dashboard/robot/aimWaypointX', NetworkTablesTypeInfos.kDouble),
      aimY: nt.createTopic<number>('/dashboard/robot/aimWaypointY', NetworkTablesTypeInfos.kDouble),
      aimTrigger: nt.createTopic<boolean>('/dashboard/robot/aimTrigger', NetworkTablesTypeInfos.kBoolean),
      passX: nt.createTopic<number>('/dashboard/robot/passWaypointX', NetworkTablesTypeInfos.kDouble),
      passY: nt.createTopic<number>('/dashboard/robot/passWaypointY', NetworkTablesTypeInfos.kDouble),
      passTrigger: nt.createTopic<boolean>('/dashboard/robot/passTrigger', NetworkTablesTypeInfos.kBoolean),
      moveX: nt.createTopic<number>('/dashboard/robot/moveWaypointX', NetworkTablesTypeInfos.kDouble),
      moveY: nt.createTopic<number>('/dashboard/robot/moveWaypointY', NetworkTablesTypeInfos.kDouble),
      moveTrigger: nt.createTopic<boolean>('/dashboard/robot/moveTrigger', NetworkTablesTypeInfos.kBoolean),
    };

    topicsRef.current = ntTopics;

    const setup = async () => {
      try {
        await Promise.all([
          ntTopics.waypoints.publish(),
          ntTopics.clickX.publish(),
          ntTopics.clickY.publish(),
          ntTopics.aimX.publish(),
          ntTopics.aimY.publish(),
          ntTopics.aimTrigger.publish(),
          ntTopics.passX.publish(),
          ntTopics.passY.publish(),
          ntTopics.passTrigger.publish(),
          ntTopics.moveX.publish(),
          ntTopics.moveY.publish(),
          ntTopics.moveTrigger.publish(),
        ]);
      } catch (e) {
        console.warn("Failed to publish some topics", e);
      }
    };

    setup();

    const subuid = ntTopics.waypoints.subscribe((val) => {
      if (!val) return;
      try {
        const parsed = JSON.parse(val);
        if (!Array.isArray(parsed)) return;
        
        const mapped: Waypoint[] = parsed.map((p: { pose?: { x: number; y: number }; color?: string; type?: WaypointType }) => ({
          status: 'locked',
          pose: p.pose ?? { x: 0, y: 0 },
          color: p.color ?? WAYPOINT_COLORS.General,
          type: p.type ?? WaypointType.General,
        }));

        setWaypoints(prev => {
          const currentStr = JSON.stringify(prev.map(wp => ({ pose: wp.pose, type: wp.type })));
          const newStr = JSON.stringify(mapped.map(wp => ({ pose: wp.pose, type: wp.type })));
          return currentStr === newStr ? prev : mapped;
        });
      } catch (e) {
        console.error('Failed to parse waypoints', e);
      }
    });

    return () => {
      ntTopics.waypoints.unsubscribe(subuid);
      // We don't necessarily need to unpublish everything on every re-run of this effect
      // but if nt or connected changed, it's safer.
      Object.values(ntTopics).forEach(t => t.unpublish());
      topicsRef.current = {};
    };
  }, [nt, connected]);

  // Handle image resize
  useEffect(() => {
    const updateDimensions = () => {
      if (imageRef.current) {
        setDimensions({ width: imageRef.current.offsetWidth, height: imageRef.current.offsetHeight });
      }
    };
    const img = imageRef.current;
    if (img) {
      if (img.complete) updateDimensions();
      img.addEventListener('load', updateDimensions);
    }
    window.addEventListener('resize', updateDimensions);
    return () => {
      if (img) img.removeEventListener('load', updateDimensions);
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Update NT when waypoints change
  useEffect(() => {
    const topic = topicsRef.current.waypoints;
    if (!topic) return;

    const locked = waypoints.map(wp => ({ pose: wp.pose, color: wp.color, type: wp.type }));
    const json = JSON.stringify(locked);
    
    if (topic.getValue() !== json) {
      topic.setValue(json);
    }
  }, [waypoints]);

  const handleFieldClick = (event: React.MouseEvent<HTMLImageElement>) => {
    if (!dimensions || !settingType) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const xPx = event.clientX - rect.left;
    const yPx = event.clientY - rect.top;

    const xFeet = (xPx / dimensions.width) * fieldLengthFeet;
    const yFeet = (yPx / dimensions.height) * fieldWidthFeet;
    
    const pose = { x: parseFloat(xFeet.toFixed(2)), y: parseFloat(yFeet.toFixed(2)) };

    topicsRef.current.clickX?.setValue(pose.x);
    topicsRef.current.clickY?.setValue(pose.y);

    const newWaypoint: Waypoint = {
      status: 'locked',
      pose,
      color: WAYPOINT_COLORS[settingType],
      type: settingType
    };

    setWaypoints(prev => [...prev.filter(wp => wp.type !== settingType), newWaypoint]);
    setSettingType(null);
  };

  const runAction = (xTopic?: NetworkTablesTopic<number>, yTopic?: NetworkTablesTopic<number>, trigger?: NetworkTablesTopic<boolean>, wp?: Waypoint) => {
    if (!wp) return;
    xTopic?.setValue(wp.pose.x);
    yTopic?.setValue(wp.pose.y);
    if (trigger) {
      trigger.setValue(true);
      setTimeout(() => trigger.setValue(false), 200);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">2026 FRC Field</h2>
        {settingType && (
          <div className="bg-yellow-500 text-black px-4 py-1 rounded-full animate-pulse font-bold">
            Click Field to set {settingType}
          </div>
        )}
      </div>
      
      <div className="relative w-full border-2 border-gray-700 rounded-lg overflow-hidden bg-gray-900" 
           style={{ aspectRatio: `${fieldLengthFeet}/${fieldWidthFeet}` }}>
        <img 
          ref={imageRef} 
          src={fieldImage} 
          alt="Field" 
          onClick={handleFieldClick} 
          className={`w-full h-full object-contain ${settingType ? 'cursor-crosshair' : ''}`}
        />
        {waypoints.map((wp, i) => {
          const pixel = poseToPixel(wp.pose);
          return (
            <div key={i} 
                 onClick={(e) => { e.stopPropagation(); setSelectedWaypointIndex(i); }}
                 className={`absolute w-5 h-5 rounded-full border-2 cursor-pointer z-10 transition-transform hover:scale-125 ${selectedWaypointIndex === i ? 'border-white scale-125 shadow-white/50 shadow-lg' : 'border-black/50'}`}
                 style={{ 
                   left: pixel.x, 
                   top: pixel.y, 
                   backgroundColor: wp.color,
                   transform: `translate(-50%, -50%) ${selectedWaypointIndex === i ? 'scale(1.2)' : 'scale(1)'}`
                 }}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-4 mt-2">
        {(['Aim', 'Shoot', 'Move'] as WaypointType[]).map(type => (
          <div key={type} className="flex flex-col gap-2">
            <button
              onClick={() => {
                if (getWaypointByType(type)) {
                  setWaypoints(prev => prev.filter(wp => wp.type !== type));
                  setSettingType(type);
                } else {
                  setSettingType(prev => prev === type ? null : type);
                }
              }}
              className={`px-3 py-2 text-sm font-bold rounded-lg transition-colors ${settingType === type ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
            >
              {getWaypointByType(type) ? `Reset ${type}` : `Set ${type}`}
            </button>
            <button
              disabled={!getWaypointByType(type)}
              onClick={() => {
                const wp = getWaypointByType(type);
                if (type === 'Aim') runAction(topicsRef.current.aimX, topicsRef.current.aimY, topicsRef.current.aimTrigger, wp);
                if (type === 'Shoot') runAction(topicsRef.current.passX, topicsRef.current.passY, topicsRef.current.passTrigger, wp);
                if (type === 'Move') runAction(topicsRef.current.moveX, topicsRef.current.moveY, topicsRef.current.moveTrigger, wp);
              }}
              className="px-3 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {type === 'Aim' ? 'Aim Robot' : type === 'Shoot' ? 'Pass/Shoot' : 'Move Robot'}
            </button>
          </div>
        ))}
      </div>

      {selectedWaypointIndex !== null && waypoints[selectedWaypointIndex] && (
        <div className="p-4 bg-gray-800 rounded-lg border-l-4 border-blue-500 flex justify-between items-center">
          <div>
            <h3 className="font-bold">{waypoints[selectedWaypointIndex].type} Waypoint</h3>
            <p className="text-sm text-gray-400">X: {waypoints[selectedWaypointIndex].pose.x} ft, Y: {waypoints[selectedWaypointIndex].pose.y} ft</p>
          </div>
          <button onClick={() => setSelectedWaypointIndex(null)} className="text-gray-500 hover:text-white">Close</button>
        </div>
      )}

      {waypoints.length > 0 && (
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-3">Active Waypoints</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {waypoints.map((wp, index) => (
              <div key={index} 
                   onClick={() => setSelectedWaypointIndex(index)}
                   className={`flex items-center justify-between p-2 rounded bg-gray-900/50 border cursor-pointer transition-colors ${selectedWaypointIndex === index ? 'border-blue-500 bg-gray-900' : 'border-gray-700 hover:border-gray-600'}`}>
                <div className="flex items-center gap-2">
                  <div style={{ backgroundColor: wp.color }} className="w-3 h-3 rounded-full shadow-sm" />
                  <span className="font-semibold text-sm">{wp.type}</span>
                </div>
                <div className="font-mono text-xs text-gray-400">
                  ({wp.pose.x.toFixed(1)}, {wp.pose.y.toFixed(1)})
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Field;
