import React, { useMemo } from 'react';

interface QrCodeSvgProps {
  value: string;
  size?: number;
  className?: string;
}

const GRID = 21;

function isFinderCell(r: number, c: number): boolean | null {
  const inBox = (tr: number, tc: number) => {
    const dr = r - tr;
    const dc = c - tc;
    if (dr < 0 || dr > 6 || dc < 0 || dc > 6) return null;
    if (dr === 0 || dr === 6 || dc === 0 || dc === 6) return true;
    if (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4) return true;
    return false;
  };
  return inBox(0, 0) ?? inBox(0, GRID - 7) ?? inBox(GRID - 7, 0);
}

export const QrCodeSvg: React.FC<QrCodeSvgProps> = ({ value, size = 76, className = '' }) => {
  const cells = useMemo(() => {
    let seed = 2166136261;
    for (let i = 0; i < value.length; i++) {
      seed ^= value.charCodeAt(i);
      seed = Math.imul(seed, 16777619);
    }

    const matrix: boolean[][] = [];
    for (let r = 0; r < GRID; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < GRID; c++) {
        const finder = isFinderCell(r, c);
        if (finder !== null) {
          row.push(finder);
          continue;
        }
        // Quiet margin around finders
        if (
          (r === 7 && c <= 7) ||
          (c === 7 && r <= 7) ||
          (r === 7 && c >= GRID - 8) ||
          (c === GRID - 8 && r <= 7) ||
          (r === GRID - 8 && c <= 7) ||
          (c === 7 && r >= GRID - 8)
        ) {
          row.push(false);
          continue;
        }
        // Timing patterns
        if (r === 6 || c === 6) {
          row.push((r + c) % 2 === 0);
          continue;
        }
        seed = Math.imul(seed ^ (r * 31 + c * 17), 1664525) + 1013904223;
        row.push((seed >>> 28) % 2 === 0);
      }
      matrix.push(row);
    }
    return matrix;
  }, [value]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${GRID + 2} ${GRID + 2}`}
      className={`rounded-lg bg-white p-1 ${className}`}
      aria-label={`QR Code for ${value}`}
    >
      <rect x={0} y={0} width={GRID + 2} height={GRID + 2} fill="#ffffff" />
      {cells.map((row, r) =>
        row.map((on, c) =>
          on ? (
            <rect
              key={`${r}-${c}`}
              x={c + 1}
              y={r + 1}
              width={0.94}
              height={0.94}
              rx={0.12}
              fill="#0f172a"
            />
          ) : null
        )
      )}
    </svg>
  );
};
