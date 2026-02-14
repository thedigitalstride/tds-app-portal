'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ImageIcon, AlertCircle } from 'lucide-react';
import { cn } from '@tds/ui';

interface ScreenshotThumbnailProps {
  desktopUrl?: string;
  mobileUrl?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

const sizes = {
  sm: { desktop: 'w-12 h-9', mobile: 'w-6 h-9' },
  md: { desktop: 'w-60 h-44', mobile: 'w-28 h-44' },
  lg: { desktop: 'w-80 h-60', mobile: 'w-40 h-60' },
};

export function ScreenshotThumbnail({
  desktopUrl,
  mobileUrl,
  alt,
  size = 'sm',
  onClick,
  className,
}: ScreenshotThumbnailProps) {
  const [desktopError, setDesktopError] = useState(false);
  const [mobileError, setMobileError] = useState(false);
  const [desktopLoaded, setDesktopLoaded] = useState(false);
  const [mobileLoaded, setMobileLoaded] = useState(false);

  const sizeClasses = sizes[size];

  const renderPlaceholder = (type: 'desktop' | 'mobile') => (
    <div
      className={cn(
        'flex items-center justify-center bg-neutral-100 border border-neutral-200 rounded',
        type === 'desktop' ? sizeClasses.desktop : sizeClasses.mobile
      )}
    >
      <ImageIcon className="h-4 w-4 text-neutral-400" />
    </div>
  );

  const renderError = (type: 'desktop' | 'mobile') => (
    <div
      className={cn(
        'flex items-center justify-center bg-red-50 border border-red-200 rounded',
        type === 'desktop' ? sizeClasses.desktop : sizeClasses.mobile
      )}
    >
      <AlertCircle className="h-4 w-4 text-red-400" />
    </div>
  );

  return (
    <div
      className={cn('flex gap-1 cursor-pointer group', className)}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      aria-label={`View screenshots for ${alt}`}
    >
      {/* Desktop thumbnail */}
      {!desktopUrl ? (
        renderPlaceholder('desktop')
      ) : desktopError ? (
        renderError('desktop')
      ) : (
        <div className={cn('relative overflow-hidden rounded', sizeClasses.desktop)}>
          {!desktopLoaded && (
            <div className="absolute inset-0 bg-neutral-100 animate-pulse rounded" />
          )}
          <Image
            src={desktopUrl}
            alt={`Desktop screenshot of ${alt}`}
            fill
            sizes="(max-width: 768px) 48px, 240px"
            className={cn(
              'object-cover object-top rounded border border-neutral-200',
              'group-hover:border-blue-400 group-hover:shadow-sm transition-all',
              !desktopLoaded && 'opacity-0'
            )}
            onLoad={() => setDesktopLoaded(true)}
            onError={() => setDesktopError(true)}
          />
        </div>
      )}

      {/* Mobile thumbnail */}
      {!mobileUrl ? (
        renderPlaceholder('mobile')
      ) : mobileError ? (
        renderError('mobile')
      ) : (
        <div className={cn('relative overflow-hidden rounded', sizeClasses.mobile)}>
          {!mobileLoaded && (
            <div className="absolute inset-0 bg-neutral-100 animate-pulse rounded" />
          )}
          <Image
            src={mobileUrl}
            alt={`Mobile screenshot of ${alt}`}
            fill
            sizes="(max-width: 768px) 24px, 112px"
            className={cn(
              'object-cover object-top rounded border border-neutral-200',
              'group-hover:border-blue-400 group-hover:shadow-sm transition-all',
              !mobileLoaded && 'opacity-0'
            )}
            onLoad={() => setMobileLoaded(true)}
            onError={() => setMobileError(true)}
          />
        </div>
      )}
    </div>
  );
}
