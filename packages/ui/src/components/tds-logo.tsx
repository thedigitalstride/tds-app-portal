'use client';

import type { SVGProps } from 'react';
import { cn } from '../utils';

interface TDSLogoProps extends SVGProps<SVGSVGElement> {
  variant?: 'full' | 'minimal';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const sizeClasses = {
  sm: 'h-6',
  md: 'h-8',
  lg: 'h-10',
  xl: 'h-12',
  '2xl': 'h-16',
};

export function TDSLogo({ variant = 'minimal', size = 'md', className, ...props }: TDSLogoProps) {
  const textColor = '#031a43';
  const accentColor = '#1689ff';
  const sizeClass = sizeClasses[size];

  if (variant === 'minimal') {
    return (
      <svg viewBox="0 0 377 475" fill="none" className={cn(sizeClass, 'w-auto', className)} {...props}>
        <polygon fill={accentColor} points="324.76 252.39 196.6 474.36 248.63 474.36 376.78 252.39 324.76 252.39" />
        <polygon fill={accentColor} points="239.29 252.39 111.14 474.36 163.16 474.36 291.32 252.39 239.29 252.39" />
        <polygon fill={accentColor} points="153.83 252.39 25.67 474.36 77.7 474.36 205.86 252.39 153.83 252.39" />
        <polygon fill={accentColor} points="299.08 0 170.93 221.97 222.95 221.97 351.11 0 299.08 0" />
        <polygon fill={accentColor} points="213.62 0 85.46 221.97 137.49 221.97 265.65 0 213.62 0" />
        <polygon fill={accentColor} points="128.16 0 0 221.97 52.03 221.97 180.18 0 128.16 0" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 1250.47 476.91" fill="none" className={cn(sizeClass, 'w-auto', className)} {...props}>
      {/* THE text */}
      <path fill={textColor} d="M481.95,12.61h-30.5V0h74.49v12.61h-30.5v88.57h-13.49V12.61Z" />
      <path fill={textColor} d="M547.92,0h13.49v43.99h56.31V0h13.49v101.18h-13.49v-44.58h-56.31v44.58h-13.49V0Z" />
      <path fill={textColor} d="M653.2,0h64.82v12.61h-51.33v31.38h46.48v12.61h-46.48v31.97h52.06v12.61h-65.55V0Z" />

      {/* DIGITAL text */}
      <path fill={textColor} d="M458.9,148.92h54.76c40.46,0,70.87,29.79,70.87,69.45s-30.41,69.46-70.87,69.46h-54.76v-138.91ZM490.1,178.32v80.13h22.75c22.75,0,39.66-17.32,39.66-40.07s-16.91-40.06-39.66-40.06h-22.75Z" />
      <path fill={textColor} d="M609.47,148.92h31.2v138.91h-31.2v-138.91Z" />
      <path fill={textColor} d="M667.55,218.38c0-40.87,31.6-71.87,73.48-71.87,33.22,0,60.8,19.53,68.25,46.91h-34.83c-6.84-10.27-18.93-16.91-33.42-16.91-23.55,0-41.48,17.92-41.48,41.88s17.92,41.88,41.48,41.88c17.51,0,32.01-9.46,37.45-23.75h-33.22v-28.19h67.25v10.67c0,40.66-30,71.27-71.47,71.27s-73.48-31.01-73.48-71.88Z" />
      <path fill={textColor} d="M842.15,148.92h31.2v138.91h-31.2v-138.91Z" />
      <path fill={textColor} d="M938.37,178.32h-36.44v-29.39h104.09v29.39h-36.44v109.52h-31.21v-109.52Z" />
      <path fill={textColor} d="M1051.66,148.92h36.84l52.34,138.91h-34.22l-8.46-24.36h-56.57l-8.66,24.36h-33.42l52.15-138.91ZM1087.89,234.69l-18.12-51.33-18.11,51.33h36.23Z" />
      <path fill={textColor} d="M1163.29,148.92h31.2v109.52h55.97v29.39h-87.17v-138.91Z" />

      {/* STRIDE text */}
      <path fill={textColor} d="M451.85,432.82h32.02c0,9.06,9.46,16.31,21.34,16.31,10.67,0,19.53-5.64,19.53-13.49,0-21.74-70.67-12.28-70.67-59.39,0-26.18,21.95-43.09,49.93-43.09s50.73,18.12,50.73,42.28h-32.02c0-8.25-8.25-14.49-18.92-14.49-9.67,0-17.72,4.83-17.72,12.68,0,21.95,70.66,10.07,70.66,58.38,0,27.18-22.75,44.9-51.94,44.9s-52.95-19.33-52.95-44.09Z" />
      <path fill={textColor} d="M609.47,364.97h-36.44v-29.39h104.09v29.39h-36.44v109.52h-31.21v-109.52Z" />
      <path fill={textColor} d="M703.47,335.58h62.61c27.58,0,48.32,19.93,48.32,46.5,0,19.53-11.47,35.03-28.79,41.67l33.02,50.73h-38.65l-29.19-47.51h-16.11v47.51h-31.2v-138.91ZM734.67,364.97v34.83h30.81c9.66,0,16.91-7.45,16.91-17.32s-7.25-17.51-16.91-17.51h-30.81Z" />
      <path fill={textColor} d="M842.15,335.58h31.2v138.91h-31.2v-138.91Z" />
      <path fill={textColor} d="M903.99,335.58h54.76c40.46,0,70.87,29.79,70.87,69.45s-30.41,69.46-70.87,69.46h-54.76v-138.91ZM935.19,364.97v80.13h22.75c22.75,0,39.66-17.31,39.66-40.07s-16.91-40.06-39.66-40.06h-22.75Z" />
      <path fill={textColor} d="M1057.58,335.58h92.2v29.39h-61v24.97h54.36v29.39h-54.36v25.77h62.01v29.39h-93.21v-138.91Z" />

      {/* Triangle graphics */}
      <polygon fill={accentColor} points="324.76 252.39 196.6 474.36 248.63 474.36 376.78 252.39 324.76 252.39" />
      <polygon fill={accentColor} points="239.29 252.39 111.14 474.36 163.16 474.36 291.32 252.39 239.29 252.39" />
      <polygon fill={accentColor} points="153.83 252.39 25.67 474.36 77.7 474.36 205.86 252.39 153.83 252.39" />
      <polygon fill={accentColor} points="299.08 0 170.93 221.97 222.95 221.97 351.11 0 299.08 0" />
      <polygon fill={accentColor} points="213.62 0 85.46 221.97 137.49 221.97 265.65 0 213.62 0" />
      <polygon fill={accentColor} points="128.16 0 0 221.97 52.03 221.97 180.18 0 128.16 0" />
    </svg>
  );
}
