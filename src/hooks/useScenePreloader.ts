import { useCallback, useEffect, useRef, useState } from 'react';
import { prewarmAllAircraftGeometries } from '../scene/aircraftGeometry';
import { prewarmAllAircraftTextures } from '../scene/aircraftTextures';
import {
  getApronTexture,
  getGlobeTexture,
  getRunwayTexture,
  getTerminalSignTexture,
} from '../scene/textures';

export interface PreloadStage {
  id: string;
  label: string;
  status: 'queued' | 'loading' | 'done';
}

const INITIAL_STAGES: PreloadStage[] = [
  { id: 'runways', label: 'Dual-Runway & Architectural PBR Textures', status: 'queued' },
  { id: 'skins', label: 'Airbus A380 / A350 / B787 Livery Skins', status: 'queued' },
  { id: 'meshes', label: 'Parametric Airfoil & Fuselage Meshes', status: 'queued' },
  { id: 'globe', label: 'Orbital Coastlines & Great-Circle Arcs', status: 'queued' },
  { id: 'webgl', label: 'WebGL PBR Pipeline & Bloom Calibration', status: 'queued' },
];

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

export function useScenePreloader() {
  const [stages, setStages] = useState<PreloadStage[]>(INITIAL_STAGES);
  const [progress, setProgress] = useState(0);
  const [assetsDone, setAssetsDone] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const startedRef = useRef(false);

  const setStageState = (idx: number, status: PreloadStage['status']) => {
    setStages((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, status } : s))
    );
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;

    const runPipeline = async () => {
      await nextFrame();
      if (cancelled) return;

      // Stage 0: Runways & Terminal PBR Textures
      setStageState(0, 'loading');
      setProgress(12);
      await nextFrame();
      getRunwayTexture('left');
      getRunwayTexture('right');
      getApronTexture();
      getTerminalSignTexture();
      if (cancelled) return;
      setStageState(0, 'done');
      setProgress(28);

      // Stage 1: Aircraft Livery CanvasTextures
      setStageState(1, 'loading');
      await nextFrame();
      prewarmAllAircraftTextures();
      if (cancelled) return;
      setStageState(1, 'done');
      setProgress(50);

      // Stage 2: Parametric 3D Aircraft Geometries
      setStageState(2, 'loading');
      await nextFrame();
      prewarmAllAircraftGeometries();
      if (cancelled) return;
      setStageState(2, 'done');
      setProgress(72);

      // Stage 3: Orbital World Globe Texture
      setStageState(3, 'loading');
      await nextFrame();
      getGlobeTexture();
      if (cancelled) return;
      setStageState(3, 'done');
      setProgress(88);

      // Stage 4: Wait for WebGL first frame
      setStageState(4, 'loading');
      setAssetsDone(true);
    };

    runPipeline();

    return () => {
      cancelled = true;
    };
  }, []);

  const markCanvasCreated = useCallback(() => {
    setCanvasReady(true);
  }, []);

  useEffect(() => {
    if (!assetsDone || !canvasReady) return;
    setStages((prev) => prev.map((s) => ({ ...s, status: 'done' })));
    setProgress(100);
    const timer = setTimeout(() => {
      setSceneReady(true);
    }, 360);
    return () => clearTimeout(timer);
  }, [assetsDone, canvasReady]);

  return {
    stages,
    progress,
    sceneReady,
    markCanvasCreated,
  };
}
