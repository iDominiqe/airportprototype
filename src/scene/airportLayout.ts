import * as THREE from 'three';

export const GATE_COORDS: Record<string, { x: number; z: number }> = {
  G1: { x: -40, z: 6.5 },
  G2: { x: -24, z: 6.5 },
  G3: { x: -8, z: 6.5 },
  G4: { x: 8, z: 6.5 },
  G5: { x: 24, z: 6.5 },
  G6: { x: 40, z: 6.5 },
};

export const APRON_TAXI_Z = 18;
export const RUNWAY_SOUTH_ARR_Z = 38; // 08L / 26R
export const RUNWAY_SOUTH_DEP_Z = 64; // 08R / 26L
export const RUNWAY_NORTH_Z = -82;    // 09L / 27R
export const RUNWAY_EAST_X = 128;     // 17 / 35

export const RUNWAY_LENGTH = 204;
export const RUNWAY_NORTH_LENGTH = 196;
export const RUNWAY_EAST_LENGTH = 158;
export const RUNWAY_WIDTH = 10.5;

export const WEST_ENTRY_X = -92;
export const EAST_EXIT_X = 52;
export const NORTH_TAXI_Z = -66;
export const EAST_TAXI_X = 112;

export function createSmoothPath(points: Array<[number, number, number]>): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(
    points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    false,
    'catmullrom',
    0.35
  );
}
