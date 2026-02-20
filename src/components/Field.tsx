import React, { useState, useRef, useEffect } from 'react';
import fieldImage from '../assets/2026 FRC.png';
import { useNetworkTables } from '../NetworkTablesContext';
import { NetworkTablesTopic, NetworkTablesTypeInfos } from 'ntcore-ts-client';

// A palette of distinct colors for locked waypoints
const WAYPOINT_COLORS = {
  Aim: '#FF00FF',   // Fuchsia
  Shoot: '#00FFFF', // Aqua
  Move: '#00FF00',  // Lime
  General: '#FFFF00' // Yellow
};

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
  pixel: { x: number; y: number };
  color: string;
  type: WaypointType;
};

const Field: React.FC = () => {
  const { nt, connected } = useNetworkTables();
  const imageRef = useRef<HTMLImageElement>(null);
  const [renderedImageDimensions, setRenderedImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [selectedWaypointIndex, setSelectedWaypointIndex] = useState<number | null>(null);
  const [settingType, setSettingType] = useState<WaypointType | null>(null);

  // Refs to hold the NetworkTables topics
  const waypointsTopicRef = useRef<NetworkTablesTopic<string> | null>(null);
  const clickXTopicRef = useRef<NetworkTablesTopic<number> | null>(null);
  const clickYTopicRef = useRef<NetworkTablesTopic<number> | null>(null);
  
  // New topics for robot actions
  const aimToWaypointXTopicRef = useRef<NetworkTablesTopic<number> | null>(null);
  const aimToWaypointYTopicRef = useRef<NetworkTablesTopic<number> | null>(null);
  const aimToWaypointTriggerTopicRef = useRef<NetworkTablesTopic<boolean> | null>(null);

  const passToWaypointXTopicRef = useRef<NetworkTablesTopic<number> | null>(null);
  const passToWaypointYTopicRef = useRef<NetworkTablesTopic<number> | null>(null);
  const passToWaypointTriggerTopicRef = useRef<NetworkTablesTopic<boolean> | null>(null);

  const moveToWaypointXTopicRef = useRef<NetworkTablesTopic<number> | null>(null);
  const moveToWaypointYTopicRef = useRef<NetworkTablesTopic<number> | null>(null);
  const moveToWaypointTriggerTopicRef = useRef<NetworkTablesTopic<boolean> | null>(null);

  const fieldLengthFeet = 57.5; // X-axis
  const fieldWidthFeet = 26.4;  // Y-axis

  const getWaypointByType = (type: WaypointType) => {
    return waypoints.find(wp => wp.type === type);
  };

  // Effect to set up NetworkTables topics
  useEffect(() => {
    if (!nt || !connected) return;

    // Create topics and store them in refs
    waypointsTopicRef.current = nt.createTopic<string>('/dashboard/field/waypoints', NetworkTablesTypeInfos.kString);
    clickXTopicRef.current = nt.createTopic<number>('/dashboard/field/clickX', NetworkTablesTypeInfos.kDouble);
    clickYTopicRef.current = nt.createTopic<number>('/dashboard/field/clickY', NetworkTablesTypeInfos.kDouble);
    
    // Initialize new action topics
    aimToWaypointXTopicRef.current = nt.createTopic<number>('/dashboard/robot/aimWaypointX', NetworkTablesTypeInfos.kDouble);
    aimToWaypointYTopicRef.current = nt.createTopic<number>('/dashboard/robot/aimWaypointY', NetworkTablesTypeInfos.kDouble);
    aimToWaypointTriggerTopicRef.current = nt.createTopic<boolean>('/dashboard/robot/aimTrigger', NetworkTablesTypeInfos.kBoolean);
    
    passToWaypointXTopicRef.current = nt.createTopic<number>('/dashboard/robot/passWaypointX', NetworkTablesTypeInfos.kDouble);
    passToWaypointYTopicRef.current = nt.createTopic<number>('/dashboard/robot/passWaypointY', NetworkTablesTypeInfos.kDouble);
    passToWaypointTriggerTopicRef.current = nt.createTopic<boolean>('/dashboard/robot/passTrigger', NetworkTablesTypeInfos.kBoolean);
    
    moveToWaypointXTopicRef.current = nt.createTopic<number>('/dashboard/robot/moveWaypointX', NetworkTablesTypeInfos.kDouble);
    moveToWaypointYTopicRef.current = nt.createTopic<number>('/dashboard/robot/moveWaypointY', NetworkTablesTypeInfos.kDouble);
    moveToWaypointTriggerTopicRef.current = nt.createTopic<boolean>('/dashboard/robot/moveTrigger', NetworkTablesTypeInfos.kBoolean);
    
    // Asynchronously publish the topics
    const publishTopics = async () => {
      try {
        await waypointsTopicRef.current?.publish();
        await clickXTopicRef.current?.publish();
        await clickYTopicRef.current?.publish();
        
        await aimToWaypointXTopicRef.current?.publish();
        await aimToWaypointYTopicRef.current?.publish();
        await aimToWaypointTriggerTopicRef.current?.publish();
        
        await passToWaypointXTopicRef.current?.publish();
        await passToWaypointYTopicRef.current?.publish();
        await passToWaypointTriggerTopicRef.current?.publish();
        
        await moveToWaypointXTopicRef.current?.publish();
        await moveToWaypointYTopicRef.current?.publish();
        await moveToWaypointTriggerTopicRef.current?.publish();
      } catch (e) {
        console.error("Failed to publish field topics:", e);
      }
    };
    
    publishTopics();

    // Subscribe to remote waypoints if the simulation publishes them
    let subuid: number | undefined;
    try {
      if (waypointsTopicRef.current) {
        subuid = waypointsTopicRef.current.subscribe((val) => {
          if (!val) return;
          try {
            const parsed = JSON.parse(val) as Array<any>;
            const mapped: Waypoint[] = parsed.map((p) => {
              const pose = p.pose ?? { x: 0, y: 0 };
              const pixel = renderedImageDimensions
                ? { x: (pose.x / fieldLengthFeet) * renderedImageDimensions.width, y: (pose.y / fieldWidthFeet) * renderedImageDimensions.height }
                : { x: 0, y: 0 };
              return {
                status: 'locked',
                pose,
                pixel,
                color: p.color ?? WAYPOINT_COLORS.General,
                type: p.type ?? WaypointType.General,
              };
            });
            setWaypoints(mapped);
          } catch (e) {
            console.error('Failed to parse remote waypoints', e);
          }
        });
      }
    } catch (e) {
      console.warn('Could not subscribe to remote waypoints', e);
    }

    return () => {
      waypointsTopicRef.current?.unpublish();
      clickXTopicRef.current?.unpublish();
      clickYTopicRef.current?.unpublish();

      if (subuid !== undefined) {
        waypointsTopicRef.current?.unsubscribe(subuid);
      }

      aimToWaypointXTopicRef.current?.unpublish();
      aimToWaypointYTopicRef.current?.unpublish();
      aimToWaypointTriggerTopicRef.current?.unpublish();

      passToWaypointXTopicRef.current?.unpublish();
      passToWaypointYTopicRef.current?.unpublish();
      passToWaypointTriggerTopicRef.current?.unpublish();

      moveToWaypointXTopicRef.current?.unpublish();
      moveToWaypointYTopicRef.current?.unpublish();
      moveToWaypointTriggerTopicRef.current?.unpublish();
    };
  }, [nt, connected]);

  // Effect to get image dimensions for coordinate scaling
  useEffect(() => {
    const updateDimensions = () => {
      if (imageRef.current) {
        setRenderedImageDimensions({ width: imageRef.current.offsetWidth, height: imageRef.current.offsetHeight });
      }
    };
    if (imageRef.current) {
      if (imageRef.current.complete) updateDimensions();
      imageRef.current.addEventListener('load', updateDimensions);
    }
    window.addEventListener('resize', updateDimensions);
    return () => {
      if (imageRef.current) imageRef.current.removeEventListener('load', updateDimensions);
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Effect to update NetworkTables when locked waypoints change
  useEffect(() => {
    const lockedWaypoints = waypoints
      .filter(wp => wp.status === 'locked')
      .map(wp => ({ pose: wp.pose, color: wp.color, type: wp.type }));
      
    waypointsTopicRef.current?.setValue(JSON.stringify(lockedWaypoints));
  }, [waypoints]);

  const handleFieldClick = (event: React.MouseEvent<HTMLImageElement>) => {
    if (!renderedImageDimensions || !settingType) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const clickXInPixels = event.clientX - rect.left;
    const clickYInPixels = event.clientY - rect.top;

    const xFeet = (clickXInPixels / renderedImageDimensions.width) * fieldLengthFeet;
    const yFeet = (clickYInPixels / renderedImageDimensions.height) * fieldWidthFeet;
    
    const pose = { x: parseFloat(xFeet.toFixed(2)), y: parseFloat(yFeet.toFixed(2)) };

    // Update click topics
    clickXTopicRef.current?.setValue(pose.x);
    clickYTopicRef.current?.setValue(pose.y);

    const newWaypoint: Waypoint = {
      status: 'locked',
      pose,
      pixel: { x: clickXInPixels, y: clickYInPixels },
      color: WAYPOINT_COLORS[settingType],
      type: settingType
    };

    setWaypoints(prev => {
      // Remove existing waypoint of the same type if it exists
      const filtered = prev.filter(wp => wp.type !== settingType);
      return [...filtered, newWaypoint];
    });
    setSettingType(null);
  };

  const handleRobotAction = (
    xTopic: NetworkTablesTopic<number> | null,
    yTopic: NetworkTablesTopic<number> | null,
    triggerTopic: NetworkTablesTopic<boolean> | null,
    waypoint: Waypoint
  ) => {
    if (xTopic) xTopic.setValue(waypoint.pose.x);
    if (yTopic) yTopic.setValue(waypoint.pose.y);

    if (triggerTopic) {
      triggerTopic.setValue(true);
      setTimeout(() => triggerTopic.setValue(false), 200);
    }
  };

  const toggleSettingMode = (type: WaypointType) => {
    if (getWaypointByType(type)) {
      // If waypoint exists, remove it and stay in setting mode for that type
      setWaypoints(prev => prev.filter(wp => wp.type !== type));
      setSettingType(type);
      setSelectedWaypointIndex(null);
    } else {
      // If no waypoint, toggle setting mode
      setSettingType(prev => (prev === type ? null : type));
    }
  };

  const handleAimRobot = () => {
    const wp = getWaypointByType(WaypointType.Aim);
    if (!wp) return;
    handleRobotAction(aimToWaypointXTopicRef.current, aimToWaypointYTopicRef.current, aimToWaypointTriggerTopicRef.current, wp);
  };

  const handlePassToWaypoint = () => {
    const wp = getWaypointByType(WaypointType.Shoot);
    if (!wp) return;
    handleRobotAction(passToWaypointXTopicRef.current, passToWaypointYTopicRef.current, passToWaypointTriggerTopicRef.current, wp);
  };

  const handleMoveToWaypoint = () => {
    const wp = getWaypointByType(WaypointType.Move);
    if (!wp) return;
    handleRobotAction(moveToWaypointXTopicRef.current, moveToWaypointYTopicRef.current, moveToWaypointTriggerTopicRef.current, wp);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">2026 FRC Field</h2>
        {settingType && (
          <div className="bg-yellow-500 text-black px-4 py-1 rounded-full animate-pulse font-bold">
            Click Field to set {settingType} Waypoint
          </div>
        )}
      </div>
      
      <div style={{ position: 'relative', width: '100%', paddingBottom: `${(fieldWidthFeet / fieldLengthFeet) * 100}%`, overflow: 'hidden', border: '2px solid #444', borderRadius: '8px' }}>
        <img 
          ref={imageRef} 
          src={fieldImage} 
          alt="2026 FRC Field" 
          onClick={handleFieldClick} 
          style={{ cursor: settingType ? 'crosshair' : 'default', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }} 
        />
        {waypoints.map((wp, index) => (
          <div key={index} 
               style={{
                  position: 'absolute',
                  left: wp.pixel.x - 10,
                  top: wp.pixel.y - 10,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: wp.color,
                  border: `3px solid ${selectedWaypointIndex === index ? 'white' : 'rgba(0,0,0,0.5)'}`,
                  boxShadow: '0 0 10px rgba(0,0,0,0.5)',
                  cursor: 'pointer',
                  zIndex: 10,
                  transition: 'transform 0.2s',
                  transform: selectedWaypointIndex === index ? 'scale(1.2)' : 'scale(1)',
               }}
               onClick={(e) => {
                 e.stopPropagation();
                 setSelectedWaypointIndex(index);
               }}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="flex flex-col gap-2">
          <button
            onClick={() => toggleSettingMode(WaypointType.Aim)}
            className={`px-4 py-2 font-semibold rounded-lg shadow-md transition-colors ${settingType === WaypointType.Aim ? 'bg-yellow-400 text-black' : 'bg-purple-800 text-white hover:bg-purple-700'}`}
          >
            {getWaypointByType(WaypointType.Aim) ? 'Reset Aim Waypoint' : 'Set Aim Waypoint'}
          </button>
          <button
            onClick={handleAimRobot}
            disabled={!getWaypointByType(WaypointType.Aim)}
            className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed"
          >
            Aim Robot
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => toggleSettingMode(WaypointType.Shoot)}
            className={`px-4 py-2 font-semibold rounded-lg shadow-md transition-colors ${settingType === WaypointType.Shoot ? 'bg-yellow-400 text-black' : 'bg-blue-800 text-white hover:bg-blue-700'}`}
          >
            {getWaypointByType(WaypointType.Shoot) ? 'Reset Shoot Waypoint' : 'Set Shoot Waypoint'}
          </button>
          <button
            onClick={handlePassToWaypoint}
            disabled={!getWaypointByType(WaypointType.Shoot)}
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed"
          >
            Pass to Waypoint
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => toggleSettingMode(WaypointType.Move)}
            className={`px-4 py-2 font-semibold rounded-lg shadow-md transition-colors ${settingType === WaypointType.Move ? 'bg-yellow-400 text-black' : 'bg-green-800 text-white hover:bg-green-700'}`}
          >
            {getWaypointByType(WaypointType.Move) ? 'Reset Move Waypoint' : 'Set Move Waypoint'}
          </button>
          <button
            onClick={handleMoveToWaypoint}
            disabled={!getWaypointByType(WaypointType.Move)}
            className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed"
          >
            Move to Waypoint
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-6">
        {selectedWaypointIndex !== null && waypoints[selectedWaypointIndex] && (
          <div className="p-4 bg-gray-800 border-l-4 border-white rounded-r-lg">
            <h3 className="text-xl font-bold text-white mb-2">Selected: {waypoints[selectedWaypointIndex].type}</h3>
            <p className="text-gray-300">X: {waypoints[selectedWaypointIndex].pose.x.toFixed(2)} ft</p>
            <p className="text-gray-300">Y: {waypoints[selectedWaypointIndex].pose.y.toFixed(2)} ft</p>
            <button 
              onClick={() => {
                setWaypoints(prev => prev.filter((_, i) => i !== selectedWaypointIndex));
                setSelectedWaypointIndex(null);
              }}
              className="mt-2 text-sm text-red-400 hover:text-red-300 underline"
            >
              Remove Waypoint
            </button>
          </div>
        )}

        {waypoints.length > 0 && (
          <div className="p-4 bg-gray-800 rounded-lg">
            <h3 className="text-xl font-bold text-white mb-2">Active Waypoints:</h3>
            <ul className="space-y-2">
              {waypoints.map((wp, index) => (
                <li key={index} className="flex items-center text-gray-300 text-sm">
                  <span style={{ backgroundColor: wp.color }} className="w-3 h-3 rounded-full mr-2 shadow-sm"></span>
                  <span className="font-semibold w-16">{wp.type}:</span>
                  <span>({wp.pose.x.toFixed(2)}, {wp.pose.y.toFixed(2)})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Field;
