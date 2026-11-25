import React from 'react';
import {
  Camera,
  Eye,
  EyeOff,
  Globe2,
  Layers,
  Moon,
  Plane,
  Sparkles,
  Sun,
  Sunset,
  TowerControl,
} from 'lucide-react';
import { CameraPreset, GraphicsQuality, LightingMode, TakeoffPhase } from '../types/aviation';

interface TopHeaderBarProps {
  cameraPreset: CameraPreset;
  onSelectCamera: (preset: CameraPreset) => void;
  lightingMode: LightingMode;
  onSelectLighting: (mode: LightingMode) => void;
  quality: GraphicsQuality;
  onSelectQuality: (quality: GraphicsQuality) => void;
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
  { id: 'overview', label: 'Airport Overview (4 Runways)', shortLabel: '4 Runways', icon: Camera },
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
  quality,
  onSelectQuality,
  hudCollapsed,
  onToggleHud,
  takeoffPhase,
}) => {
  return (
    <header className="pointer-events-none fixed top-0 left-0 right-0 z-30 p-3 md:px-4 md:py-3 flex flex-wrap lg:flex-nowrap items-center justify-between gap-2">
      {/* Brand + Live Tower Pill */}
      <div className="pointer-events-auto bento-card rounded-full px-3 py-1.5 flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 via-cyan-300 to-violet-400 flex items-center justify-center shadow-sm">
          <Plane className="w-3.5 h-3.5 text-slate-950 -rotate-45" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-display font-extrabold tracking-tight text-sm ink-primary whitespace-nowrap">
            RMO SKYHUB
          </span>
          <span className="hidden 2xl:inline text-[11px] ink-muted whitespace-nowrap">
            Chișinău · LUKK
          </span>
        </div>

        <div className="hidden 2xl:flex items-center gap-1.5 pl-2 ml-0.5 border-l border-slate-400/30">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-beacon" />
          <span className="font-mono text-[10px] font-semibold ink-secondary whitespace-nowrap">
            {takeoffPhase === 'idle' ? 'RMO Tower : Live' : '08R Takeoff : Active'}
          </span>
        </div>
      </div>

      {/* Quick Camera Presets */}
      <nav
        aria-label="Camera Presets"
        className="pointer-events-auto bento-card rounded-full p-1 flex items-center gap-1 overflow-x-auto max-w-full shrink"
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
              style={
                active
                  ? { backgroundColor: 'var(--pill-active-bg)', color: 'var(--pill-active-ink)' }
                  : undefined
              }
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                active ? 'font-semibold shadow-sm' : 'ink-secondary hover:bg-slate-500/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden 2xl:inline">{btn.label}</span>
              <span className="2xl:hidden">{btn.shortLabel}</span>
            </button>
          );
        })}
      </nav>

      {/* Graphics Quality (HD / Clay Low-PC) + Lighting + Hide Toggle */}
      <div className="pointer-events-auto flex items-center gap-1.5 shrink-0">
        {/* HD PBR vs Clay Low-PC Toggle */}
        <div
          role="group"
          aria-label="3D Graphics Quality"
          className="bento-card rounded-full p-1 flex items-center gap-0.5"
        >
          <button
            type="button"
            onClick={() => onSelectQuality('hd')}
            title="HD PBR Textures, Shadows & Bloom"
            style={
              quality === 'hd'
                ? { backgroundColor: 'var(--pill-active-bg)', color: 'var(--pill-active-ink)' }
                : undefined
            }
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
              quality === 'hd' ? 'font-semibold shadow-sm' : 'ink-secondary hover:bg-slate-500/10'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>HD</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectQuality('clay')}
            title="Clay Low-PC Architectural Maquette Mode"
            style={
              quality === 'clay'
                ? { backgroundColor: 'var(--pill-active-bg)', color: 'var(--pill-active-ink)' }
                : undefined
            }
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
              quality === 'clay' ? 'font-semibold shadow-sm' : 'ink-secondary hover:bg-slate-500/10'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Clay</span>
          </button>
        </div>

        {/* Day / Sunset / Night */}
        <div
          role="group"
          aria-label="Environment Lighting"
          className="bento-card rounded-full p-1 flex items-center gap-0.5"
        >
          {LIGHTING_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = lightingMode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelectLighting(opt.id)}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  active ? 'font-semibold shadow-sm' : 'ink-secondary hover:bg-slate-500/10'
                }`}
                style={
                  active
                    ? { backgroundColor: 'var(--pill-active-bg)', color: 'var(--pill-active-ink)' }
                    : undefined
                }
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">{opt.label}</span>
              </button>
            );
          })}
        </div>

        {takeoffPhase === 'idle' && (
          <button
            type="button"
            onClick={onToggleHud}
            title={hudCollapsed ? 'Show Booking Console' : 'Hide Booking Console'}
            className="bento-elevated rounded-full p-2 ink-primary hover:opacity-80 transition-all cursor-pointer"
          >
            {hudCollapsed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        )}
      </div>
    </header>
  );
};
