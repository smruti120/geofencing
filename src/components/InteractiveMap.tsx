import React from 'react';
import { GeofenceZone } from '../types';
import { MOCK_GEOFENCES } from '../data';
import { MapPin, Navigation, Compass, ShieldCheck, ShieldAlert } from 'lucide-react';

interface InteractiveMapProps {
  currentLat: number;
  currentLng: number;
  onLocationChange: (lat: number, lng: number) => void;
  gpsAccuracy: number;
  activeZone: GeofenceZone | null;
}

// Simple flat earth distance approximation in meters for localized campus use
export function getDistanceInMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  currentLat,
  currentLng,
  onLocationChange,
  gpsAccuracy,
  activeZone
}) => {
  // Map boundaries for drawing the vector representation
  // Center: Lat 37.4275, Lng -122.1697 (from Stanford-like coordinates)
  // Bound coordinates to a 400px x 300px box for rendering
  const mapCenterLat = 37.4275;
  const mapCenterLng = -122.1697;
  const latSpan = 0.005; // Height of the map in degrees
  const lngSpan = 0.008; // Width of the map in degrees

  // Convert Lat/Lng to SVG coordinates (0 to 100%)
  const getSvgCoords = (lat: number, lng: number) => {
    const x = 50 + ((lng - mapCenterLng) / (lngSpan / 2)) * 50;
    const y = 50 - ((lat - mapCenterLat) / (latSpan / 2)) * 50;
    return { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) };
  };

  const userCoords = getSvgCoords(currentLat, currentLng);

  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    // Reverse projection
    const lng = mapCenterLng + ((clickX - 50) / 50) * (lngSpan / 2);
    const lat = mapCenterLat - ((clickY - 50) / 50) * (latSpan / 2);

    onLocationChange(lat, lng);
  };

  // Quick teleport presets
  const presets = [
    { name: 'Science Labs', lat: 37.4280, lng: -122.1700, desc: 'Inside Zone 1' },
    { name: 'Admin Center', lat: 37.4268, lng: -122.1685, desc: 'Inside Zone 2' },
    { name: 'Library Quad', lat: 37.4272, lng: -122.1712, desc: 'Inside Zone 3' },
    { name: 'Security Gate', lat: 37.4255, lng: -122.1670, desc: 'Inside Zone 4' },
    { name: 'Off-Campus (Cafe)', lat: 37.4242, lng: -122.1745, desc: 'Out of Geofence' }
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl text-white flex flex-col h-full">
      {/* Map Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-wide uppercase text-slate-200">GPS Geofence Sandbox</h3>
            <p className="text-xs text-slate-400">Drag/Click anywhere to simulate location drift</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 px-2 py-1.5 rounded-lg border border-slate-800">
          <div className={`w-2.5 h-2.5 rounded-full ${activeZone ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`}></div>
          <span className="text-xs font-medium font-mono">
            {activeZone ? 'ON-CAMPUS' : 'OFF-CAMPUS'}
          </span>
        </div>
      </div>

      {/* Main SVG Interactive Map Area */}
      <div className="relative flex-1 min-h-[250px] bg-slate-950 select-none">
        {/* Background Grid & Watermark */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] opacity-25"></div>

        <svg
          className="w-full h-full cursor-crosshair absolute inset-0"
          onClick={handleMapClick}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Draw Campus Boundaries */}
          <rect x="15" y="10" width="70" height="75" rx="8" fill="none" stroke="#475569" strokeWidth="0.5" strokeDasharray="2 2" />
          <text x="50" y="9" textAnchor="middle" fill="#475569" fontSize="2.2" letterSpacing="0.1em" fontWeight="bold">
            UNIVERSITY INNER PERIMETER
          </text>

          {/* Campus Roads / Walkways (mock) */}
          <line x1="20" y1="50" x2="80" y2="50" stroke="#1e293b" strokeWidth="3" />
          <line x1="50" y1="15" x2="50" y2="85" stroke="#1e293b" strokeWidth="3" />
          <line x1="30" y1="25" x2="70" y2="75" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="1 1" opacity="0.5" />

          {/* Render Geofence Radii Circles */}
          {MOCK_GEOFENCES.map((zone) => {
            const zCoords = getSvgCoords(zone.latitude, zone.longitude);
            // Map distance meters to radius in SVG space (approximation)
            // We want zone radius 80m to be roughly 14% of map dimension
            const svgRadius = (zone.radius / 80) * 14;
            const isTargetZone = activeZone?.id === zone.id;

            return (
              <g key={zone.id}>
                {/* Radius Ring */}
                <circle
                  cx={zCoords.x}
                  cy={zCoords.y}
                  r={svgRadius}
                  fill={isTargetZone ? 'rgba(16, 185, 129, 0.07)' : 'rgba(99, 102, 241, 0.04)'}
                  stroke={isTargetZone ? '#10b981' : '#6366f1'}
                  strokeWidth={isTargetZone ? '0.8' : '0.4'}
                  strokeDasharray={isTargetZone ? '1.5 0.5' : '1 2'}
                  className="transition-all duration-300"
                />
                {/* Center Anchor Point */}
                <circle
                  cx={zCoords.x}
                  cy={zCoords.y}
                  r="1"
                  fill={isTargetZone ? '#10b981' : '#818cf8'}
                />
                {/* Label */}
                <text
                  x={zCoords.x}
                  y={zCoords.y - svgRadius - 2.2}
                  textAnchor="middle"
                  fill={isTargetZone ? '#34d399' : '#94a3b8'}
                  fontSize="2.2"
                  fontWeight={isTargetZone ? 'bold' : 'normal'}
                >
                  {zone.name} ({zone.radius}m)
                </text>
              </g>
            );
          })}

          {/* User Location Marker */}
          <g className="transition-all duration-500 ease-out">
            {/* Radar ring */}
            <circle
              cx={userCoords.x}
              cy={userCoords.y}
              r="4.5"
              fill="none"
              stroke={activeZone ? '#10b981' : '#f59e0b'}
              strokeWidth="0.5"
              className="animate-ping"
              style={{ transformOrigin: `${userCoords.x}px ${userCoords.y}px` }}
            />
            {/* Solid Pin */}
            <circle
              cx={userCoords.x}
              cy={userCoords.y}
              r="1.8"
              fill={activeZone ? '#10b981' : '#f59e0b'}
              className="shadow-lg"
            />
            <circle
              cx={userCoords.x}
              cy={userCoords.y}
              r="0.8"
              fill="#ffffff"
            />
          </g>
        </svg>

        {/* Bottom Overlay with Coordinates and Status */}
        <div className="absolute bottom-3 left-3 right-3 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 text-xs flex flex-col gap-2 shadow-xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Navigation className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold text-slate-300">GPS Telemetry</span>
            </div>
            <span className="font-mono text-slate-400">
              {currentLat.toFixed(6)}°N, {currentLng.toFixed(6)}°W
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
              <span className="text-slate-500 block">Accuracy (3D Fix)</span>
              <span className="font-mono font-bold text-slate-300">± {gpsAccuracy.toFixed(1)} meters</span>
            </div>
            <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
              <span className="text-slate-500 block">Active Gate Lock</span>
              <span className="font-semibold truncate text-slate-300 block">
                {activeZone ? activeZone.name : 'None (Outside Geofence)'}
              </span>
            </div>
          </div>

          {activeZone ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg flex items-center gap-2 text-emerald-400">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Authorized zone. Auto-clock-in enabled, gate pass valid here.</span>
            </div>
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg flex items-center gap-2 text-amber-400">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Outside official sector. Shift check-in locked; requires gate pass validation.</span>
            </div>
          )}
        </div>
      </div>

      {/* Presets Control Panel */}
      <div className="p-3 bg-slate-950 border-t border-slate-800">
        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-2">
          Simulate Teleport Presets (Quick Test)
        </span>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset) => {
            const isHere =
              Math.abs(currentLat - preset.lat) < 0.0002 && Math.abs(currentLng - preset.lng) < 0.0002;
            return (
              <button
                key={preset.name}
                onClick={() => onLocationChange(preset.lat, preset.lng)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 ${
                  isHere
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-[1.02]'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <MapPin className={`w-3 h-3 ${isHere ? 'text-white animate-bounce' : 'text-slate-500'}`} />
                <div>
                  <span className="block leading-tight font-semibold">{preset.name}</span>
                  <span className="text-[8px] opacity-70 block font-mono">{preset.desc}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
