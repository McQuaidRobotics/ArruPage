import React, { useState, useRef, useEffect, useMemo } from 'react';
import fieldImage from '../assets/2026 FRC.png';
import { useNetworkTables } from '../useNetworkTables';
import { NetworkTablesTopic, NetworkTablesTypeInfos } from 'ntcore-ts-client';

// A palette of distinct colors for locked waypoints
const WAYPOINT_COLORS = {
  Pass: '#FF00FF', // Fuchsia
  Move: '#00FF00',  // Lime
  General: '#FFFF00' // Yellow
} as const;

export const WaypointType = {
  Pass: 'Pass',
  Move: 'Move',
  General: 'General',
} as const;

export type WaypointType = (typeof WaypointType)[keyof typeof WaypointType];

type Waypoint = {
  status: "current" | "locked";
  pose: { x: number; y: number; theta: number };
  color: string;
  type: WaypointType;
};

const Field: React.FC = () => {
  const { nt, connected } = useNetworkTables();
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [selectedWaypointIndex, setSelectedWaypointIndex] = useState<number | null>(null);
  const [settingType, setSettingType] = useState<WaypointType | null>(null);
  const [activeActions, setActiveActions] = useState<{ [key: string]: boolean }>({});
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const fieldLengthFeet = 57.5; // X-axis
  const fieldWidthFeet = 26.4;  // Y-axis

  // Topic Refs
  const topicsRef = useRef<{
    waypoints?: NetworkTablesTopic<string>;
    export?: NetworkTablesTopic<string>;
    clickX?: NetworkTablesTopic<number>;
    clickY?: NetworkTablesTopic<number>;
    moveX?: NetworkTablesTopic<number>;
    moveY?: NetworkTablesTopic<number>;
    moveTrigger?: NetworkTablesTopic<boolean>;
    passX?: NetworkTablesTopic<number>;
    passY?: NetworkTablesTopic<number>;
    passTrigger?: NetworkTablesTopic<boolean>;
  }>({});

  const getWaypointByType = (type: WaypointType) => {
    return waypoints.find(wp => wp.type === type);
  };

  // Helper to convert pose to pixel
  const poseToPixel = useMemo(() => (pose: { x: number; y: number }) => {
    if (!dimensions) return { x: 0, y: 0 };
    return {
      x: (pose.x / fieldLengthFeet) * dimensions.width,
      y: dimensions.height - (pose.y / fieldWidthFeet) * dimensions.height
    };
  }, [dimensions, fieldLengthFeet, fieldWidthFeet]);

  // Effect to set up NetworkTables topics
  useEffect(() => {
    if (!nt || !connected) return;

    const ntTopics = {
      waypoints: nt.createTopic<string>('/dashboard/field/waypoints', NetworkTablesTypeInfos.kString),
      export: nt.createTopic<string>('/dashboard/field/export', NetworkTablesTypeInfos.kString),
      clickX: nt.createTopic<number>('/dashboard/field/clickX', NetworkTablesTypeInfos.kDouble),
      clickY: nt.createTopic<number>('/dashboard/field/clickY', NetworkTablesTypeInfos.kDouble),
      moveX: nt.createTopic<number>('/dashboard/robot/moveWaypointX', NetworkTablesTypeInfos.kDouble),
      moveY: nt.createTopic<number>('/dashboard/robot/moveWaypointY', NetworkTablesTypeInfos.kDouble),
      moveTrigger: nt.createTopic<boolean>('/dashboard/robot/moveTrigger', NetworkTablesTypeInfos.kBoolean),
      passX: nt.createTopic<number>('/dashboard/robot/passWaypointX', NetworkTablesTypeInfos.kDouble),
      passY: nt.createTopic<number>('/dashboard/robot/passWaypointY', NetworkTablesTypeInfos.kDouble),
      passTrigger: nt.createTopic<boolean>('/dashboard/robot/passTrigger', NetworkTablesTypeInfos.kBoolean),
    };

    topicsRef.current = ntTopics;

    const setup = async () => {
      try {
        await Promise.all(Object.values(ntTopics).map(t => t.publish()));
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
        
        const mapped: Waypoint[] = parsed.map((p: { pose?: { x: number; y: number; theta?: number }; color?: string; type?: WaypointType }) => ({
          status: 'locked',
          pose: {
            x: p.pose?.x ?? 0,
            y: p.pose?.y ?? 0,
            theta: p.pose?.theta ?? 0
          },
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

  const getPoseFromEvent = (clientX: number, clientY: number) => {
    if (!dimensions || !containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const xPx = clientX - rect.left;
    const yPx = clientY - rect.top;

    const xFeet = Math.max(0, Math.min(fieldLengthFeet, (xPx / dimensions.width) * fieldLengthFeet));
    const yFeet = Math.max(0, Math.min(fieldWidthFeet, ((dimensions.height - yPx) / dimensions.height) * fieldWidthFeet));
    
    return { x: parseFloat(xFeet.toFixed(2)), y: parseFloat(yFeet.toFixed(2)), theta: 0 };
  };

  const handleFieldClick = (event: React.MouseEvent<HTMLImageElement>) => {
    if (draggingIndex !== null) return;
    if (!settingType) return;
    
    const pose = getPoseFromEvent(event.clientX, event.clientY);
    if (!pose) return;

    topicsRef.current.clickX?.setValue(pose.x);
    topicsRef.current.clickY?.setValue(pose.y);

    const newWaypoint: Waypoint = {
      status: 'locked',
      pose,
      color: WAYPOINT_COLORS[settingType as keyof typeof WAYPOINT_COLORS] || WAYPOINT_COLORS.General,
      type: settingType
    };

    setWaypoints(prev => [...prev.filter(wp => wp.type !== settingType), newWaypoint]);
    setSettingType(null);
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, index: number) => {
    e.stopPropagation();
    setDraggingIndex(index);
    setSelectedWaypointIndex(index);
  };

  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    if (draggingIndex === null) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    
    const pose = getPoseFromEvent(clientX, clientY);
    if (pose) {
      setWaypoints(prev => {
        const next = [...prev];
        next[draggingIndex] = { ...next[draggingIndex], pose: { ...next[draggingIndex].pose, x: pose.x, y: pose.y } };
        return next;
      });
    }
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
  };

  useEffect(() => {
    if (draggingIndex !== null) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [draggingIndex]);

  const handleExport = () => {
    const moveWp = getWaypointByType(WaypointType.Move);
    const passWp = getWaypointByType(WaypointType.Pass);
    
    const commands: string[] = [];
    if (moveWp) {
      commands.push(`DRIVE TO: ${moveWp.pose.x}, ${moveWp.pose.y}, ${moveWp.pose.theta}`);
    }
    if (passWp) {
      commands.push(`AIM AT: ${passWp.pose.x}, ${passWp.pose.y}, ${passWp.pose.theta}`);
    }
    
    const exportString = commands.join('; ');
    if (topicsRef.current.export) {
      topicsRef.current.export.setValue(exportString);
    }
    navigator.clipboard.writeText(exportString);
    alert(`Exported: ${exportString}`);
  };

  const startAction = (type: 'Move' | 'Pass') => {
    const wp = getWaypointByType(WaypointType[type]);
    if (!wp) return;

    if (type === 'Move') {
      topicsRef.current.moveX?.setValue(wp.pose.x);
      topicsRef.current.moveY?.setValue(wp.pose.y);
      topicsRef.current.moveTrigger?.setValue(true);
    } else {
      topicsRef.current.passX?.setValue(wp.pose.x);
      topicsRef.current.passY?.setValue(wp.pose.y);
      topicsRef.current.passTrigger?.setValue(true);
    }
    setActiveActions(prev => ({ ...prev, [type]: true }));
  };

  const stopAction = (type: 'Move' | 'Pass') => {
    if (type === 'Move') {
      topicsRef.current.moveTrigger?.setValue(false);
    } else {
      topicsRef.current.passTrigger?.setValue(false);
    }
    setActiveActions(prev => ({ ...prev, [type]: false }));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">2026 FRC Field</h2>
        {settingType && (
          <div className="bg-yellow-500 text-black px-4 py-1 rounded-full animate-pulse font-bold">
            Click Field to set {settingType}
          </div>
        )}
      </div>
      
      {/* Field and Side Controls */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Field Map */}
        <div ref={containerRef}
             className="relative flex-grow border-2 border-gray-700 rounded-lg overflow-hidden bg-gray-900 z-10" 
             style={{ aspectRatio: `${fieldLengthFeet}/${fieldWidthFeet}` }}>
          <img 
            ref={imageRef} 
            src={fieldImage} 
            alt="Field" 
            onClick={handleFieldClick} 
            draggable="false" 
            className={`w-full h-full object-contain select-none ${
              settingType ? 'cursor-crosshair' : ''
            }`}
          />
          {waypoints.map((wp, i) => {
            const pixel = poseToPixel(wp.pose);
            return (
              <div key={i} 
                   onMouseDown={(e) => handleDragStart(e, i)}
                   onTouchStart={(e) => handleDragStart(e, i)}
                   className={`absolute w-6 h-6 rounded-full border-2 cursor-grab active:cursor-grabbing z-20 transition-transform hover:scale-125 ${selectedWaypointIndex === i ? 'border-white scale-125 shadow-white/50 shadow-lg' : 'border-black/50'}`}
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

        {/* Right Sidebar: Waypoint Setting */}
        <div className="lg:w-64 flex flex-col gap-4 shrink-0 z-0">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest px-2">Waypoint Settings</h3>
          <div className="flex flex-col gap-4">
            {(['Move', 'Pass'] as WaypointType[]).map(type => (
              <button
                key={type}
                onClick={() => {
                  if (getWaypointByType(type)) {
                    setWaypoints(prev => prev.filter(wp => wp.type !== type));
                    setSettingType(type);
                  } else {
                    setSettingType(prev => prev === type ? null : type);
                  }
                }}
                className={`w-full px-4 py-6 text-base font-black uppercase tracking-tighter rounded-xl transition-all border-2 shadow-lg ${
                  settingType === type 
                    ? 'bg-yellow-500 text-black border-yellow-400 scale-95 shadow-yellow-500/20' 
                    : 'bg-gray-800 text-white border-gray-700 hover:bg-gray-700 hover:border-gray-600'
                }`}
              >
                {getWaypointByType(type) ? `Reset ${type}` : `Set ${type}`}
              </button>
            ))}
          </div>
          
          {/* Export Button moved here too for utility */}
          <button
            onClick={handleExport}
            disabled={waypoints.length === 0}
            className="w-full mt-4 py-3 bg-blue-900/40 hover:bg-blue-800/60 disabled:bg-gray-800/20 disabled:text-gray-600 text-blue-300 font-bold rounded-lg transition-all active:scale-[0.98] border border-blue-500/30 text-xs"
          >
            Export All Waypoints
          </button>
        </div>
      </div>

      {/* Large Bottom Action Buttons */}
      <div className="flex flex-col gap-4">
        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onMouseDown={() => startAction('Move')}
            onMouseUp={() => stopAction('Move')}
            onMouseLeave={() => activeActions.Move && stopAction('Move')}
            onTouchStart={() => startAction('Move')}
            onTouchEnd={() => stopAction('Move')}
            disabled={!getWaypointByType(WaypointType.Move)}
            className={`w-full py-8 text-2xl font-black uppercase tracking-widest rounded-2xl transition-all shadow-2xl border-4 select-none ${
              activeActions.Move 
                ? 'bg-green-500 text-black border-green-400 scale-95' 
                : 'bg-green-700 text-white border-green-600 hover:bg-green-600 disabled:opacity-30 disabled:cursor-not-allowed shadow-green-900/20'
            }`}
          >
            {activeActions.Move ? 'Driving...' : 'Drive To (HOLD)'}
          </button>

          <button
            onClick={() => activeActions.Pass ? stopAction('Pass') : startAction('Pass')}
            disabled={!getWaypointByType(WaypointType.Pass)}
            className={`w-full py-8 text-2xl font-black uppercase tracking-widest rounded-2xl transition-all shadow-2xl border-4 select-none ${
              activeActions.Pass 
                ? 'bg-pink-500 text-black border-pink-400 scale-95' 
                : 'bg-pink-700 text-white border-pink-600 hover:bg-pink-600 disabled:opacity-30 disabled:cursor-not-allowed shadow-pink-900/20'
            }`}
          >
            {activeActions.Pass ? 'Passing...' : 'Custom Pass Location'}
          </button>
        </div>
      </div>

      {selectedWaypointIndex !== null && waypoints[selectedWaypointIndex] && (
        <div className="p-4 bg-gray-800 rounded-lg border-l-4 border-blue-500 flex justify-between items-center">
          <div>
            <h3 className="font-bold">{waypoints[selectedWaypointIndex].type} Waypoint</h3>
            <p className="text-sm text-gray-400">
              X: {waypoints[selectedWaypointIndex].pose.x} ft, 
              Y: {waypoints[selectedWaypointIndex].pose.y} ft, 
              θ: {waypoints[selectedWaypointIndex].pose.theta}°
            </p>
          </div>
          <button onClick={() => setSelectedWaypointIndex(null)} className="text-gray-500 hover:text-white">Close</button>
        </div>
      )}

      {waypoints.length > 0 && (
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-3">Active Waypoints</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {waypoints.map((wp, index) => (
              <div key={index} 
                   onClick={() => setSelectedWaypointIndex(index)}
                   className={`flex items-center justify-between p-2 rounded bg-gray-900/50 border cursor-pointer transition-colors ${selectedWaypointIndex === index ? 'border-blue-500 bg-gray-900' : 'border-gray-700 hover:border-gray-600'}`}>
                <div className="flex items-center gap-2">
                  <div style={{ backgroundColor: wp.color }} className="w-3 h-3 rounded-full shadow-sm" />
                  <span className="font-semibold text-sm">{wp.type}</span>
                </div>
                <div className="font-mono text-xs text-gray-400">
                  ({wp.pose.x.toFixed(1)}, {wp.pose.y.toFixed(1)}, {wp.pose.theta.toFixed(0)}°)
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
