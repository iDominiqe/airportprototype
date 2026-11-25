import * as THREE from 'three';
import { WORLD_CONTINENTS } from '../data/worldCoastlines';

const runwayCache = new Map<string, THREE.CanvasTexture>();
let cachedApronTex: THREE.CanvasTexture | null = null;
let cachedSignTex: THREE.CanvasTexture | null = null;
let cachedGlobeTex: THREE.CanvasTexture | null = null;

function createRunwayCanvas(
  westLabel: string,
  eastLabel: string,
  clay: boolean
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = clay ? '#cfd6df' : '#1f252e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!clay) {
    for (let i = 0; i < 4200; i++) {
      const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      const y = (Math.cos(i * 78.233) * 19341.123) % 1;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.08)';
      ctx.fillRect(Math.abs(x) * canvas.width, Math.abs(y) * canvas.height, 3, 2);
    }

    const gradWest = ctx.createLinearGradient(160, 0, 560, 0);
    gradWest.addColorStop(0, 'rgba(10,12,16,0.0)');
    gradWest.addColorStop(0.25, 'rgba(10,12,16,0.55)');
    gradWest.addColorStop(1, 'rgba(10,12,16,0.0)');
    ctx.fillStyle = gradWest;
    ctx.fillRect(160, 74, 400, 108);

    const gradEast = ctx.createLinearGradient(1480, 0, 1880, 0);
    gradEast.addColorStop(0, 'rgba(10,12,16,0.0)');
    gradEast.addColorStop(0.75, 'rgba(10,12,16,0.45)');
    gradEast.addColorStop(1, 'rgba(10,12,16,0.0)');
    ctx.fillStyle = gradEast;
    ctx.fillRect(1480, 74, 400, 108);
  }

  const markingColor = clay ? '#ffffff' : '#f1f5f9';
  ctx.fillStyle = markingColor;
  ctx.fillRect(14, 12, canvas.width - 28, 6);
  ctx.fillRect(14, canvas.height - 18, canvas.width - 28, 6);

  for (let i = 0; i < 8; i++) {
    const y = 28 + i * 26;
    ctx.fillRect(24, y, 56, 14);
    ctx.fillRect(canvas.width - 80, y, 56, 14);
  }

  ctx.save();
  ctx.fillStyle = clay ? '#475569' : '#f8fafc';
  ctx.font = 'bold 46px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.save();
  ctx.translate(148, canvas.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.fillText(westLabel, 0, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(canvas.width - 148, canvas.height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(eastLabel, 0, 0);
  ctx.restore();
  ctx.restore();

  ctx.fillStyle = markingColor;
  ctx.fillRect(290, 46, 95, 22);
  ctx.fillRect(290, canvas.height - 68, 95, 22);
  ctx.fillRect(canvas.width - 385, 46, 95, 22);
  ctx.fillRect(canvas.width - 385, canvas.height - 68, 95, 22);

  for (const offset of [220, 430, 510]) {
    ctx.fillRect(offset, 68, 38, 10);
    ctx.fillRect(offset, canvas.height - 78, 38, 10);
    ctx.fillRect(canvas.width - offset - 38, 68, 38, 10);
    ctx.fillRect(canvas.width - offset - 38, canvas.height - 78, 38, 10);
  }

  for (let x = 210; x < canvas.width - 230; x += 72) {
    ctx.fillRect(x, canvas.height / 2 - 4, 42, 8);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = clay ? 2 : 8;
  return tex;
}

export function getRunwayTexture(
  westLabel = '08L',
  eastLabel = '26R',
  clay = false
): THREE.CanvasTexture {
  const key = `${westLabel}-${eastLabel}-${clay ? 'clay' : 'hd'}`;
  const cached = runwayCache.get(key);
  if (cached) return cached;
  const tex = createRunwayCanvas(westLabel, eastLabel, clay);
  runwayCache.set(key, tex);
  return tex;
}

export function getApronTexture(): THREE.CanvasTexture {
  if (cachedApronTex) return cachedApronTex;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#363f4b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(15, 23, 42, 0.36)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= canvas.width; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  const gates = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'];
  const gateXs = [150, 290, 430, 570, 710, 850];
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.moveTo(40, 430);
  ctx.lineTo(canvas.width - 40, 430);
  ctx.stroke();

  gateXs.forEach((gx, idx) => {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(gx, 430);
    ctx.lineTo(gx, 130);
    ctx.stroke();

    ctx.fillStyle = '#facc15';
    ctx.fillRect(gx - 20, 155, 40, 5);

    ctx.fillStyle = '#eab308';
    ctx.fillRect(gx - 26, 78, 52, 34);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(gates[idx], gx, 96);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  cachedApronTex = tex;
  return tex;
}

export function getTerminalSignTexture(): THREE.CanvasTexture {
  if (cachedSignTex) return cachedSignTex;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#071224';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

  ctx.fillStyle = '#e0f2fe';
  ctx.font = '800 54px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CHIȘINĂU INTERNATIONAL · RMO', canvas.width / 2, canvas.height / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedSignTex = tex;
  return tex;
}

export function getGlobeTexture(): THREE.CanvasTexture {
  if (cachedGlobeTex) return cachedGlobeTex;
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0, '#091529');
  bg.addColorStop(0.5, '#071c36');
  bg.addColorStop(1, '#081326');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.11)';
  ctx.lineWidth = 1;
  for (let lon = -180; lon <= 180; lon += 15) {
    const x = ((lon + 180) / 360) * canvas.width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    const y = ((90 - lat) / 180) * canvas.height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2);
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();

  for (const poly of WORLD_CONTINENTS) {
    ctx.beginPath();
    poly.forEach(([lon, lat], idx) => {
      const x = ((lon + 180) / 360) * canvas.width;
      const y = ((90 - lat) / 180) * canvas.height;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();

    const landGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    landGrad.addColorStop(0, '#1e3a5f');
    landGrad.addColorStop(0.5, '#193554');
    landGrad.addColorStop(1, '#152b44');
    ctx.fillStyle = landGrad;
    ctx.fill();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.2;
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  cachedGlobeTex = tex;
  return tex;
}
