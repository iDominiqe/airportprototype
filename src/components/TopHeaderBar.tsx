import React from 'react';
import {
  Camera,
  Eye,
  EyeOff,
  Globe2,
  Moon,
  Plane,
  Radio,
  Sun,
  Sunset,
  TowerControl,
} from 'lucide-react';
import { CameraPreset, LightingMode, TakeoffPhase } from '../types/aviation';

interface TopHeaderBarProps {
  cameraPreset: CameraPreset;
  onSelectCamera: (preset: CameraPreset) => void;
  lightingMode: LightingMode;
  onSelectLighting: (mode: LightingMode) => void;
  hudCollapsed: boolean;
  onToggleHud: () => void;
  takeoffPhase: TakeoffPhase;
}

const CAMERA_BUTTONS: Array<{
  id: CameraPreset;
  label: string;
  shortLabel: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'overview', label: 'Airport Overview (Dual Runways)', shortLabel: 'Dual Runways', icon: Camera },
  { id: 'tower', label: 'Control Tower View', shortLabel: 'ATC Tower', icon: TowerControl },
  { id: 'departure', label: 'Departure Runway Close-up', shortLabel: '08R Close-up', icon: Plane },
  { id: 'globe', label: 'Global Route Map', shortLabel: 'Global Map', icon: Globe2 },
];

const LIGHTING_OPTIONS: Array<{
  id: LightingMode;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'day', label: 'Day', icon: Sun },
  { id: 'sunset', label: 'Sunset', icon: Sunset },
  { id: 'night', label: 'Night', icon: Moon },
];

export const TopHeaderBar: React.FC<TopHeaderBarProps> = ({
  cameraPreset,
  onSelectCamera,
  lightingMode,
  onSelectLighting,
  hudCollapsed,
  onToggleHud,
  takeoffPhase,
}) => {
  return (
    <header className="pointer-events-none fixed top-0 left-0 right-0 z-30 p-3 md:px-4 md:py-3 flex flex-wrap lg:flex-nowrap items-center justify-between gap-2">
      {/* Brand & Live RMO ATC Status */}
      <div className="pointer-events-auto glass-panel rounded-2xl px-3 py-1.5 flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/25">
          <Plane className="w-4 h-4 text-slate-950 -rotate-45" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display font-extrabold tracking-tight text-sm text-white whitespace-nowrap">
              RMO SKYHUB
            </span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-sky-500/20 text-sky-300 border border-sky-400/30">
              LUKK · 3D
            </span>
          </div>
          <p className="text-[10px] text-slate-300/90 hidden xl:block whitespace-nowrap">
            Chișinău International Airport · Moldova
          </p>
        </div>

        <div className="hidden 2xl:flex items-center gap-1.5 pl-2.5 ml-1 border-l border-slate-500/30">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-beacon" />
          <span className="font-mono text-[10px] text-emerald-300 uppercase tracking-wider whitespace-nowrap">
            {takeoffPhase === 'idle'
              ? '08L ARR · 08R DEP ACTIVE'
              : '08R TAKEOFF PRIORITY'}
          </span>
        </div>
      </div>

      {/* Quick Camera Presets */}
      <nav
        aria-label="Camera Presets"
        className="pointer-events-auto glass-panel rounded-2xl p-1 flex items-center gap-1 overflow-x-auto max-w-full shrink"
      >
        {CAMERA_BUTTONS.map((btn) => {
          const Icon = btn.icon;
          const active = cameraPreset === btn.id;
          return (
            <button
              key={btn.id}
              type="button"
              onClick={() => onSelectCamera(btn.id)}
              title={btn.label}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-sky-400 text-slate-950 font-semibold shadow-md shadow-sky-500/30'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden 2xl:inline">{btn.label}</span>
              <span className="2xl:hidden">{btn.shortLabel}</span>
            </button>
          );
        })}
      </nav>

      {/* Environment Lighting Toggle + Panel Hide Toggle */}
      <div className="pointer-events-auto flex items-center gap-1.5 shrink-0">
        <div
          role="group"
          aria-label="Environment Lighting"
          className="glass-panel rounded-2xl p-1 flex items-center gap-1"
        >
          {LIGHTING_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = lightingMode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelectLighting(opt.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  active
                    ? opt.id === 'sunset'
                      ? 'bg-amber-400 text-slate-950 font-semibold'
                      : opt.id === 'night'
                        ? 'bg-indigo-400 text-slate-950 font-semibold'
                        : 'bg-sky-400 text-slate-950 font-semibold'
                    : 'text-slate-200 hover:bg-white/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{opt.label}</span>
              </button>
            );
          })}
        </div>

        {takeoffPhase === 'idle' && (
          <button
            type="button"
            onClick={onToggleHud}
            title={hudCollapsed ? 'Show Booking Console' : 'Hide Booking Console'}
            className="glass-elevated rounded-2xl p-2 text-white hover:text-sky-300 hover:bg-slate-800/90 transition-all cursor-pointer"
          >
            {hudCollapsed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        )}
      </div>
    </header>
  );
};
