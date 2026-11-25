import React from 'react';

const GLYPHS: Record<string, number[]> = {
  '0': [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  '1': [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  '2': [0b01110, 0b10001, 0b00001, 0b00110, 0b01000, 0b10000, 0b11111],
  '3': [0b11110, 0b00001, 0b00001, 0b01110, 0b00001, 0b00001, 0b11110],
  '4': [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  '5': [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
  '6': [0b01110, 0b10000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  '7': [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  '8': [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  '9': [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00001, 0b01110],
  '.': [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b01100, 0b01100],
  ',': [0b00000, 0b00000, 0b00000, 0b00000, 0b00110, 0b00110, 0b01000],
  '%': [0b11001, 0b11010, 0b00010, 0b00100, 0b01000, 0b01011, 0b10011],
  ':': [0b00000, 0b01100, 0b01100, 0b00000, 0b01100, 0b01100, 0b00000],
  '-': [0b00000, 0b00000, 0b00000, 0b11111, 0b00000, 0b00000, 0b00000],
  '€': [0b00111, 0b01000, 0b11110, 0b01000, 0b11110, 0b01000, 0b00111],
  ' ': [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000],
};

interface DotMatrixDigitsProps {
  value: string | number;
  dotSize?: number;
  color?: string;
  dimColor?: string;
  className?: string;
}

export const DotMatrixDigits: React.FC<DotMatrixDigitsProps> = ({
  value,
  dotSize = 3,
  color = 'currentColor',
  dimColor = 'rgba(148, 163, 184, 0.16)',
  className = '',
}) => {
  const text = String(value);
  const gap = dotSize * 0.45;
  const step = dotSize + gap;
  const charWidth = 5 * step;
  const charGap = step * 0.9;
  const totalWidth = Math.max(1, text.length * charWidth + Math.max(0, text.length - 1) * charGap);
  const totalHeight = 7 * step - gap;

  return (
    <svg
      width={totalWidth}
      height={totalHeight}
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      className={className}
      aria-label={text}
    >
      {text.split('').map((ch, idx) => {
        const pattern = GLYPHS[ch] ?? GLYPHS[' '];
        const xOffset = idx * (charWidth + charGap);
        return (
          <g key={`${idx}-${ch}`} transform={`translate(${xOffset}, 0)`}>
            {pattern.map((rowMask, r) =>
              [0, 1, 2, 3, 4].map((c) => {
                const on = (rowMask >> (4 - c)) & 1;
                return (
                  <circle
                    key={`${r}-${c}`}
                    cx={c * step + dotSize / 2}
                    cy={r * step + dotSize / 2}
                    r={dotSize / 2}
                    fill={on ? color : dimColor}
                  />
                );
              })
            )}
          </g>
        );
      })}
    </svg>
  );
};
