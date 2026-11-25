import * as THREE from 'three';
import { AircraftVariant } from '../types/aviation';

export interface AircraftSpec {
  length: number;
  radius: number;
  wingspan: number;
  rootChord: number;
  tipChord: number;
  sweep: number;
  dihedral: number;
  engineRadius: number;
  engineStations: Array<{ z: number; x: number; y: number }>;
  wingletType: 'fence' | 'curved' | 'raked' | 'sharklet' | 'scimitar';
  darkCockpitMask: boolean;
  doubleDeck: boolean;
  tailHeight: number;
}

export const AIRCRAFT_SPECS: Record<AircraftVariant, AircraftSpec> = {
  a380: {
    length: 8.2,
    radius: 0.56,
    wingspan: 4.8,
    rootChord: 2.05,
    tipChord: 0.55,
    sweep: 1.95,
    dihedral: 0.38,
    engineRadius: 0.24,
    engineStations: [
      { z: 1.48, x: 0.42, y: 0.48 },
      { z: 2.68, x: -0.22, y: 0.58 },
    ],
    wingletType: 'fence',
    darkCockpitMask: false,
    doubleDeck: true,
    tailHeight: 2.15,
  },
  a350: {
    length: 7.7,
    radius: 0.45,
    wingspan: 4.35,
    rootChord: 1.72,
    tipChord: 0.44,
    sweep: 1.85,
    dihedral: 0.36,
    engineRadius: 0.27,
    engineStations: [{ z: 1.56, x: 0.48, y: 0.42 }],
    wingletType: 'curved',
    darkCockpitMask: true,
    doubleDeck: false,
    tailHeight: 1.75,
  },
  b787: {
    length: 7.3,
    radius: 0.44,
    wingspan: 4.15,
    rootChord: 1.62,
    tipChord: 0.42,
    sweep: 1.78,
    dihedral: 0.38,
    engineRadius: 0.25,
    engineStations: [{ z: 1.5, x: 0.46, y: 0.4 }],
    wingletType: 'raked',
    darkCockpitMask: false,
    doubleDeck: false,
    tailHeight: 1.68,
  },
  a320: {
    length: 5.35,
    radius: 0.32,
    wingspan: 2.95,
    rootChord: 1.15,
    tipChord: 0.34,
    sweep: 1.12,
    dihedral: 0.24,
    engineRadius: 0.18,
    engineStations: [{ z: 1.02, x: 0.34, y: 0.28 }],
    wingletType: 'sharklet',
    darkCockpitMask: true,
    doubleDeck: false,
    tailHeight: 1.25,
  },
  b737: {
    length: 5.55,
    radius: 0.32,
    wingspan: 3.05,
    rootChord: 1.18,
    tipChord: 0.34,
    sweep: 1.18,
    dihedral: 0.24,
    engineRadius: 0.18,
    engineStations: [{ z: 1.06, x: 0.35, y: 0.28 }],
    wingletType: 'scimitar',
    darkCockpitMask: false,
    doubleDeck: false,
    tailHeight: 1.26,
  },
};

export interface CachedVariantGeometries {
  fuselage: THREE.BufferGeometry;
  wingLeft: THREE.BufferGeometry;
  wingRight: THREE.BufferGeometry;
  wingletLeft: THREE.BufferGeometry;
  wingletRight: THREE.BufferGeometry;
  verticalTail: THREE.BufferGeometry;
  hStabLeft: THREE.BufferGeometry;
  hStabRight: THREE.BufferGeometry;
  nacelle: THREE.BufferGeometry;
}

const geoCache = new Map<AircraftVariant, CachedVariantGeometries>();

function buildFuselage(spec: AircraftSpec): THREE.BufferGeometry {
  const halfL = spec.length / 2;
  const r = spec.radius;
  const profile: THREE.Vector2[] = [];

  // Build 30 stations from tail tip (y = -halfL) to nose tip (y = +halfL)
  const stations = 30;
  for (let i = 0; i <= stations; i++) {
    const t = i / stations; // 0 = tail, 1 = nose
    const xPos = THREE.MathUtils.lerp(-halfL, halfL, t);
    let rad = r;

    if (t < 0.28) {
      // Smooth aerodynamic tailcone taper
      const u = t / 0.28;
      rad = r * Math.pow(Math.sin((u * Math.PI) / 2), 0.72);
    } else if (t > 0.78) {
      // Ogive nose radome + cockpit brow transition
      const u = (1 - t) / 0.22;
      rad = r * Math.pow(Math.sin((u * Math.PI) / 2), 0.62);
    }

    profile.push(new THREE.Vector2(Math.max(0.008, rad), xPos));
  }

  // phiStart = Math.PI / 2 puts UV seam on bottom belly, top crown at u = 0.5
  const geo = new THREE.LatheGeometry(profile, 32, Math.PI / 2, Math.PI * 2);
  geo.rotateZ(-Math.PI / 2);

  // Subtle upward tail sweep + double-deck oval cross-section on A380
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    let y = pos.getY(i);
    const z = pos.getZ(i);
    const t = (x + halfL) / spec.length; // 0 = tail, 1 = nose

    if (spec.doubleDeck) {
      // Tall oval double-deck cross-section (1.28x height) + raised upper deck crown
      y *= 1.24;
      if (y > 0 && t > 0.16 && t < 0.88) {
        const deckBlend = Math.sin(Math.min(1, Math.max(0, (t - 0.16) / 0.72)) * Math.PI);
        y += r * 0.14 * Math.pow(deckBlend, 0.35) * (y / (r * 1.24));
      }
    }

    // Subtle tail upsweep & nose droop for lifelike airliner posture
    if (t < 0.28) {
      const tailU = (0.28 - t) / 0.28;
      y += tailU * tailU * r * 0.62;
    } else if (t > 0.82) {
      const noseU = (t - 0.82) / 0.18;
      y -= noseU * noseU * r * (spec.doubleDeck ? 0.34 : 0.26);
    }

    pos.setXYZ(i, x, y, z);
  }

  geo.computeVertexNormals();
  return geo;
}

function buildLoftedAirfoilWing(spec: AircraftSpec, side: 1 | -1): THREE.BufferGeometry {
  const spanStations = 10;
  const chordPoints = 18; // wrapped around airfoil section (upper + lower)
  const positions: number[] = [];
  const indices: number[] = [];

  for (let s = 0; s <= spanStations; s++) {
    const u = s / spanStations; // 0 = root, 1 = tip
    const z = side * u * spec.wingspan;
    const chord = THREE.MathUtils.lerp(spec.rootChord, spec.tipChord, Math.pow(u, 0.9));
    const leadX = 0.85 - u * spec.sweep;
    const yOffset = Math.pow(u, 1.15) * spec.dihedral;
    const thicknessRatio = THREE.MathUtils.lerp(0.135, 0.085, u);

    for (let c = 0; c <= chordPoints; c++) {
      // theta goes 0..2PI around airfoil (0 = trailing edge, PI = leading edge, 2PI = trailing edge)
      const theta = (c / chordPoints) * Math.PI * 2;
      const xc = 0.5 * (1 + Math.cos(theta)); // 1 at trailing -> 0 at leading -> 1 at trailing
      const isUpper = theta <= Math.PI;
      // NACA-like thickness distribution
      const yt =
        5 *
        thicknessRatio *
        (0.2969 * Math.sqrt(Math.max(0, xc)) -
          0.126 * xc -
          0.3516 * xc * xc +
          0.2843 * xc * xc * xc -
          0.1015 * xc * xc * xc * xc);
      const camber = 0.024 * Math.sin(Math.PI * xc);
      const yLocal = (isUpper ? camber + yt : camber - yt * 0.65) * chord;
      const x = leadX - xc * chord;
      const y = yOffset + yLocal;
      positions.push(x, y, z);
    }
  }

  const ringStride = chordPoints + 1;
  for (let s = 0; s < spanStations; s++) {
    for (let c = 0; c < chordPoints; c++) {
      const a = s * ringStride + c;
      const b = a + 1;
      const d = (s + 1) * ringStride + c;
      const e = d + 1;
      if (side === 1) {
        indices.push(a, d, b, b, d, e);
      } else {
        indices.push(a, b, d, b, e, d);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildWingtip(spec: AircraftSpec, side: 1 | -1): THREE.BufferGeometry {
  const tipZ = side * spec.wingspan;
  const tipLead = 0.85 - spec.sweep;
  const tipY = spec.dihedral;

  if (spec.wingletType === 'raked') {
    const shape = new THREE.Shape();
    shape.moveTo(tipLead, 0);
    shape.lineTo(tipLead - 0.52, side * 0.48);
    shape.lineTo(tipLead - 0.68, side * 0.48);
    shape.lineTo(tipLead - spec.tipChord, 0);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01 });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, tipY, tipZ);
    geo.rotateX(side * 0.14);
    geo.computeVertexNormals();
    return geo;
  }

  if (spec.wingletType === 'curved') {
    // Signature Airbus A350 curved blended sharklet
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(tipLead - spec.tipChord * 0.45, tipY, tipZ),
      new THREE.Vector3(tipLead - spec.tipChord * 0.55 - 0.12, tipY + 0.14, tipZ + side * 0.16),
      new THREE.Vector3(tipLead - spec.tipChord * 0.68 - 0.28, tipY + 0.42, tipZ + side * 0.22),
      new THREE.Vector3(tipLead - spec.tipChord * 0.78 - 0.42, tipY + 0.68, tipZ + side * 0.24),
    ]);
    const geo = new THREE.TubeGeometry(curve, 14, 0.06, 8, false);
    geo.scale(2.1, 1, 0.45);
    geo.computeVertexNormals();
    return geo;
  }

  if (spec.wingletType === 'fence') {
    // Classic A380 upper + lower wingtip fence
    const shape = new THREE.Shape();
    shape.moveTo(tipLead, 0.22);
    shape.lineTo(tipLead - spec.tipChord * 0.85, 0.22);
    shape.lineTo(tipLead - spec.tipChord * 1.05, -0.16);
    shape.lineTo(tipLead - 0.1, -0.16);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false });
    geo.translate(0, tipY, tipZ - 0.02);
    geo.computeVertexNormals();
    return geo;
  }

  // Sharklet (A320neo) or Split-Scimitar (737 MAX)
  const shape = new THREE.Shape();
  shape.moveTo(tipLead - 0.04, 0);
  shape.lineTo(tipLead - 0.26, 0.44);
  shape.lineTo(tipLead - 0.42, 0.44);
  shape.lineTo(tipLead - spec.tipChord * 0.95, 0);
  if (spec.wingletType === 'scimitar') {
    shape.lineTo(tipLead - 0.36, -0.24);
    shape.lineTo(tipLead - 0.22, -0.24);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.032, bevelEnabled: false });
  geo.translate(0, tipY, tipZ - 0.016);
  geo.rotateX(side * -0.18);
  geo.computeVertexNormals();
  return geo;
}

function buildNacelle(engineRadius: number): THREE.BufferGeometry {
  const len = engineRadius * 4.2;
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(engineRadius * 0.58, -len * 0.52),
    new THREE.Vector2(engineRadius * 0.78, -len * 0.32),
    new THREE.Vector2(engineRadius * 1.02, 0),
    new THREE.Vector2(engineRadius * 1.03, len * 0.36),
    new THREE.Vector2(engineRadius * 0.92, len * 0.48),
    new THREE.Vector2(engineRadius * 0.78, len * 0.46),
  ];
  const geo = new THREE.LatheGeometry(pts, 24);
  geo.rotateZ(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function buildVerticalTail(spec: AircraftSpec): THREE.BufferGeometry {
  const xBase = -spec.length * 0.26;
  const shape = new THREE.Shape();
  shape.moveTo(xBase, 0);
  shape.lineTo(xBase - spec.length * 0.21, 0);
  shape.lineTo(xBase - spec.length * 0.3, spec.tailHeight);
  shape.lineTo(xBase - spec.length * 0.19, spec.tailHeight);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.075,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.018,
    bevelThickness: 0.018,
  });
  geo.translate(0, spec.radius * (spec.doubleDeck ? 1.55 : 1.35), -0.0375);
  geo.computeVertexNormals();
  return geo;
}

function buildHorizontalStab(spec: AircraftSpec, side: 1 | -1): THREE.BufferGeometry {
  const span = spec.wingspan * 0.36;
  const xBase = -spec.length * 0.36;
  const shape = new THREE.Shape();
  shape.moveTo(xBase, 0);
  shape.lineTo(xBase - 0.58, side * span);
  shape.lineTo(xBase - 0.94, side * span);
  shape.lineTo(xBase - 0.74, 0);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.055,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.012,
    bevelThickness: 0.012,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, spec.radius * (spec.doubleDeck ? 1.5 : 1.32), 0);
  geo.rotateX(side * 0.08);
  geo.computeVertexNormals();
  return geo;
}

export function getAircraftGeometries(variant: AircraftVariant): CachedVariantGeometries {
  const cached = geoCache.get(variant);
  if (cached) return cached;

  const spec = AIRCRAFT_SPECS[variant];
  const bundle: CachedVariantGeometries = {
    fuselage: buildFuselage(spec),
    wingLeft: buildLoftedAirfoilWing(spec, 1),
    wingRight: buildLoftedAirfoilWing(spec, -1),
    wingletLeft: buildWingtip(spec, 1),
    wingletRight: buildWingtip(spec, -1),
    verticalTail: buildVerticalTail(spec),
    hStabLeft: buildHorizontalStab(spec, 1),
    hStabRight: buildHorizontalStab(spec, -1),
    nacelle: buildNacelle(spec.engineRadius),
  };
  geoCache.set(variant, bundle);
  return bundle;
}

export function prewarmAllAircraftGeometries(): void {
  const variants: AircraftVariant[] = ['a380', 'a350', 'b787', 'a320', 'b737'];
  variants.forEach((v) => {
    getAircraftGeometries(v);
  });
}
