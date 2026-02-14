'use client';

import type { ReactNode } from 'react';

interface StageProgressRingProps {
  /** 0-100 progress value */
  progress: number;
  /** Size of the ring in px */
  size: number;
  /** Stroke width in px */
  strokeWidth: number;
  /** Track (background) color */
  trackColor: string;
  /** Fill (progress) color */
  fillColor: string;
  /** Glow color for the pulse animation */
  glowColor: string;
  /** Whether the ring should pulse (ready to advance) */
  ready?: boolean;
  /** Content rendered in the center of the ring */
  children?: ReactNode;
}

export function StageProgressRing({
  progress,
  size,
  strokeWidth,
  trackColor,
  fillColor,
  glowColor,
  ready = false,
  children,
}: StageProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${ready ? 'animate-stage-pulse' : ''}`}
      style={{
        width: size,
        height: size,
        '--stage-glow': glowColor,
      } as React.CSSProperties}
    >
      <svg
        width={size}
        height={size}
        className="absolute inset-0 -rotate-90"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={fillColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      {/* Center content */}
      <div className="relative z-10 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
