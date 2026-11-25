import * as THREE from 'three';
import { AircraftVariant, AirlineLivery } from '../types/aviation';

export interface LiveryPalette {
  fuselageTop: string;
  belly: string;
  tail: string;
  accent: string;
  engine: string;
  brandText: string;
}

export const LIVERY_PALETTES: Record<AirlineLivery, LiveryPalette> = {
  nova: {
    fuselageTop: '#f8fafc',
    belly: '#0f2744',
    tail: '#0284c7',
    accent: '#38bdf8',
    engine: '#e2e8f0',
    brandText: 'SKYHUB RMO',
  },
  euro: {
    fuselageTop: '#f1f5f9',
    belly: '#1e293b',
    tail: '#1d4ed8',
    accent: '#60a5fa',
    engine: '#cbd5e1',
    brandText: 'EUROAIR',
  },
  sky: {
    fuselageTop: '#ffffff',
    belly: '#334155',
    tail: '#e11d48',
    accent: '#fb7185',
    engine: '#f1f5f9',
    brandText: 'NOVAJET',
  },
  pacific: {
    fuselageTop: '#f8fafc',
    belly: '#0f172a',
    tail: '#0d9488',
    accent: '#2dd4bf',
    engine: '#e2e8f0',
    brandText: 'EURASIA',
  },
};

const MODEL_LABELS: Record<AircraftVariant, string> = {
  a380: 'AIRBUS A380',
  a350: 'AIRBUS A350',
  b787: 'BOEING 787',
  a320: 'A320neo',
  b737: '737 MAX',
};

const skinCache = new Map<string, { map: THREE.CanvasTexture; emissiveMap: THREE.CanvasTexture }>();

export function getFuselageTextures(
  variant: AircraftVariant,
  livery: AirlineLivery
): { map: THREE.CanvasTexture; emissiveMap: THREE.CanvasTexture } {
  const key = `${variant}-${livery}`;
  const cached = skinCache.get(key);
  if (cached) return cached;

  const palette = LIVERY_PALETTES[livery];
  const W = 1024;
  const H = 512;

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = W;
  colorCanvas.height = H;
  const ctx = colorCanvas.getContext('2d')!;

  const emCanvas = document.createElement('canvas');
  emCanvas.width = W;
  emCanvas.height = H;
  const ectx = emCanvas.getContext('2d')!;

  ectx.fillStyle = '#000000';
  ectx.fillRect(0, 0, W, H);

  // Base pearl fuselage
  ctx.fillStyle = palette.fuselageTop;
  ctx.fillRect(0, 0, W, H);

  // Lower belly strip centered at u = 0.5? Wait: phiStart = Math.PI/2 ->
  // u = 0.0 & 1.0 = Belly, u = 0.25 = Port (-Z), u = 0.50 = Top Crown (+Y), u = 0.75 = Starboard (+Z)
  // Paint belly at left edge (0..135) and right edge (889..1024)
  ctx.fillStyle = palette.belly;
  ctx.fillRect(0, 0, 145, H);
  ctx.fillRect(W - 145, 0, 145, H);

  // Accent cheatline bordering belly
  ctx.fillStyle = palette.accent;
  ctx.fillRect(145, 40, 12, H - 80);
  ctx.fillRect(W - 157, 40, 12, H - 80);

  // Subtle tail livery sweep near bottom (v near 0 -> y near H)
  ctx.fillStyle = palette.tail;
  ctx.beginPath();
  ctx.moveTo(0, H - 90);
  ctx.lineTo(W, H - 90);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  // Multi-pane Cockpit Windshield centered at Top Crown (x = 512), near nose (y = 58..82)
  const isRaccoon = variant === 'a350' || variant === 'a320';
  const cockY = variant === 'a380' ? 68 : 62;
  if (isRaccoon) {
    ctx.fillStyle = '#0b1220';
    ctx.beginPath();
    ctx.roundRect(410, cockY - 4, 204, 30, 14);
    ctx.fill();
  }

  // Individual 6 cockpit glass panes
  ctx.fillStyle = '#091526';
  const panes = [-72, -44, -18, 18, 44, 72];
  panes.forEach((dx, idx) => {
    const pw = idx === 2 || idx === 3 ? 22 : 20;
    const ph = 18;
    ctx.fillRect(512 + dx - pw / 2, cockY, pw, ph);
    ectx.fillStyle = '#38bdf8';
    ectx.fillRect(512 + dx - pw / 2, cockY, pw, ph);
  });

  // Cabin Doors (Port x=240, Starboard x=784)
  const doorYs = [116, 250, 382];
  for (const dy of doorYs) {
    for (const dx of [224, 774]) {
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.strokeRect(dx, dy, 26, 20);
    }
  }

  // Cabin Windows along Port (x=255) & Starboard (x=769)
  // Double-deck A380 gets two parallel window strips!
  const windowRowsX =
    variant === 'a380' ? [220, 268, 756, 804] : [252, 772];

  for (const wx of windowRowsX) {
    for (let wy = 108; wy <= 398; wy += 12) {
      // Skip door areas
      if (Math.abs(wy - 126) < 12 || Math.abs(wy - 260) < 12 || Math.abs(wy - 392) < 12) {
        continue;
      }
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(wx - 6, wy - 3, 12, 6, 3);
      ctx.fill();

      ectx.fillStyle = '#fef3c7';
      ectx.beginPath();
      ectx.roundRect(wx - 5, wy - 2.5, 10, 5, 2.5);
      ectx.fill();
    }
  }

  // Fuselage Side Model & Brand Typography (rotated vertically along fuselage axis)
  const label = `${palette.brandText} · ${MODEL_LABELS[variant]}`;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side === -1 ? 306 : 718, 225);
    ctx.rotate(side === -1 ? -Math.PI / 2 : Math.PI / 2);
    ctx.fillStyle = palette.tail;
    ctx.font = '800 20px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;

  const emissiveMap = new THREE.CanvasTexture(emCanvas);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;

  const entry = { map, emissiveMap };
  skinCache.set(key, entry);
  return entry;
}

export function prewarmAllAircraftTextures(): void {
  const variants: AircraftVariant[] = ['a380', 'a350', 'b787', 'a320', 'b737'];
  const liveries: AirlineLivery[] = ['nova', 'euro', 'sky', 'pacific'];
  variants.forEach((v) => {
    liveries.forEach((l) => {
      getFuselageTextures(v, l);
    });
  });
}
