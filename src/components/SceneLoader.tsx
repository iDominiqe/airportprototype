import React from 'react';
import { Check, Plane } from 'lucide-react';
import { PreloadStage } from '../hooks/useScenePreloader';
import { DotMatrixDigits } from './DotMatrixDigits';

interface SceneLoaderProps {
  stages: PreloadStage[];
  progress: number;
  sceneReady: boolean;
}

const TOTAL_TICKS = 34;

export const SceneLoader: React.FC<SceneLoaderProps> = ({
  stages,
  progress,
  sceneReady,
}) => {
  const [hidden, setHidden] = React.useState(false);

  React.useEffect(() => {
    if (!sceneReady) return;
    const t = setTimeout(() => setHidden(true), 550);
    return () => clearTimeout(t);
  }, [sceneReady]);

  if (hidden) return null;

  const activeTicks = Math.round((progress / 100) * TOTAL_TICKS);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-500 ${
        sceneReady ? 'opacity-0 scale-[1.02] pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        background:
          'radial-gradient(circle at 20% 20%, rgba(167, 243, 208, 0.45), transparent 45%), radial-gradient(circle at 80% 25%, rgba(191, 219, 254, 0.55), transparent 45%), radial-gradient(circle at 50% 85%, rgba(254, 215, 170, 0.45), transparent 50%), #eef2f7',
      }}
    >
      <div className="w-full max-w-md rounded-[30px] bg-white/85 backdrop-blur-2xl border border-white/90 shadow-2xl shadow-slate-900/10 p-6 space-y-5 text-slate-900">
        {/* Top Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400 via-cyan-300 to-violet-400 flex items-center justify-center shadow-md shadow-sky-400/20">
              <Plane className="w-5 h-5 text-slate-950 -rotate-45" />
            </div>
            <div>
              <div className="font-display font-extrabold text-base tracking-tight text-slate-900">
                RMO SKYHUB V2
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                CHIȘINĂU INT&apos;L · LUKK 3D ENGINE
              </div>
            </div>
          </div>

          <div className="px-2.5 py-1 rounded-full bg-slate-900/5 border border-slate-900/10 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[10px] font-semibold text-slate-700">
              PREWARM
            </span>
          </div>
        </div>

        {/* Iridescent Aura Percentage Card */}
        <div className="rounded-2xl p-4 relative overflow-hidden border border-white/80 aura-hero flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-700">
              Initializing Parametric 3D Fleet
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              A380 Superjumbo · A350 XWB · Dual Runways
            </div>
          </div>
          <div className="flex items-baseline gap-1 text-slate-900">
            <DotMatrixDigits value={`${progress}%`} dotSize={3.2} color="#0f172a" />
          </div>
        </div>

        {/* Segmented Vertical-Tick Progress Bar (Reference Image 6 style) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>SCENE PIPELINE</span>
            <span>{progress}%</span>
          </div>
          <div className="flex items-center justify-between gap-[3px] h-5 px-1">
            {Array.from({ length: TOTAL_TICKS }).map((_, idx) => {
              const filled = idx < activeTicks;
              const ratio = idx / TOTAL_TICKS;
              const color = !filled
                ? 'rgba(15, 23, 42, 0.1)'
                : ratio < 0.35
                  ? '#38bdf8'
                  : ratio < 0.7
                    ? '#818cf8'
                    : '#10b981';
              return (
                <span
                  key={idx}
                  className="flex-1 h-4 rounded-full transition-colors duration-200"
                  style={{ backgroundColor: color }}
                />
              );
            })}
          </div>
        </div>

        {/* 5 Real Asset Preload Stages */}
        <div className="space-y-1.5">
          {stages.map((st) => (
            <div
              key={st.id}
              className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/[0.035] border border-slate-900/[0.06] text-xs"
            >
              <span className="text-slate-700 font-medium truncate pr-2">{st.label}</span>
              <span
                className={`shrink-0 px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold flex items-center gap-1 ${
                  st.status === 'done'
                    ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/25'
                    : st.status === 'loading'
                      ? 'bg-sky-500/15 text-sky-700 border border-sky-500/25'
                      : 'bg-slate-200/70 text-slate-500'
                }`}
              >
                {st.status === 'done' && <Check className="w-3 h-3" />}
                {st.status === 'done' ? 'Ready' : st.status === 'loading' ? 'Loading' : 'Queued'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
