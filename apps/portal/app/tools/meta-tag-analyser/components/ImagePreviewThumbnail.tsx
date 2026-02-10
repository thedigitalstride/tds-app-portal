'use client';

import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@tds/ui';
import type { ImageValidation } from './types';

interface ImagePreviewThumbnailProps {
  src: string;
  alt: string;
  thumbnailClassName?: string;  // e.g., "h-4 w-4" for favicon
  label?: string;  // e.g., "OG Image", "Favicon"
  validation?: ImageValidation;  // Optional: pass validation status to proactively show error state
  onError?: () => void;  // Optional: callback when image fails to load (for parent status tracking)
}

/**
 * A clickable image thumbnail that opens a Dialog modal with the full-size image.
 * Shows an error placeholder when image is broken instead of hiding completely.
 */
export function ImagePreviewThumbnail({
  src,
  alt,
  thumbnailClassName = 'h-10 w-16',
  label,
  validation,
  onError,
}: ImagePreviewThumbnailProps) {
  const [open, setOpen] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Handle image load error - update internal state and notify parent
  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // If validation shows broken, display error state immediately (no need to try loading)
  if (validation?.exists === false) {
    return (
      <div
        className={`${thumbnailClassName} flex items-center justify-center bg-red-50 border border-red-200 rounded flex-shrink-0`}
        title={validation.error || `Image not accessible (${validation.statusCode || 'error'})`}
      >
        <div className="text-center">
          <ImageOff className="h-4 w-4 text-red-400 mx-auto" />
          <span className="text-[8px] text-red-500 block mt-0.5">
            {validation.statusCode || 'Error'}
          </span>
        </div>
      </div>
    );
  }

  // Show error placeholder if image failed to load client-side
  if (hasError) {
    return (
      <div
        className={`${thumbnailClassName} flex items-center justify-center bg-red-50 border border-red-200 rounded flex-shrink-0`}
        title="Image failed to load"
      >
        <div className="text-center">
          <ImageOff className="h-4 w-4 text-red-400 mx-auto" />
          <span className="text-[8px] text-red-500 block mt-0.5">Error</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Thumbnail */}
      {/* eslint-disable-next-line @next/next/no-img-element -- External image URL from scanned site */}
      <img
        src={src}
        alt={alt}
        className={`${thumbnailClassName} object-cover rounded border flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity`}
        onClick={() => setOpen(true)}
        onError={handleError}
      />

      {/* Full-size preview Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogTitle className="sr-only">{label || alt} Preview</DialogTitle>
          <DialogDescription className="sr-only">Full-size image preview</DialogDescription>
          <div className="flex flex-col items-center gap-4">
            {/* Full-size image */}
            {/* eslint-disable-next-line @next/next/no-img-element -- External image URL from scanned site */}
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-[70vh] object-contain rounded"
              onError={() => {
                handleError();
                setOpen(false);
              }}
            />

            {/* Image URL */}
            <div className="w-full">
              {label && (
                <p className="text-xs font-medium text-neutral-500 mb-1">{label}</p>
              )}
              <p
                className="text-xs font-mono bg-neutral-100 p-2 rounded border break-all select-all"
                title={src}
              >
                {src}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
