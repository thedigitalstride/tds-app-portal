'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Download, Monitor, Smartphone, ExternalLink, Copy, Check } from 'lucide-react';
import { Button, cn } from '@tds/ui';

interface ScreenshotLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  desktopUrl?: string;
  mobileUrl?: string;
  pageUrl: string;
  capturedAt?: Date;
}

export function ScreenshotLightbox({
  isOpen,
  onClose,
  desktopUrl,
  mobileUrl,
  pageUrl,
  capturedAt,
}: ScreenshotLightboxProps) {
  const [activeDevice, setActiveDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [copied, setCopied] = useState(false);

  const activeUrl = activeDevice === 'desktop' ? desktopUrl : mobileUrl;

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleDownload = useCallback(async () => {
    if (!activeUrl) return;

    try {
      const response = await fetch(activeUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `screenshot-${activeDevice}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  }, [activeUrl, activeDevice]);

  const handleCopyLink = useCallback(async () => {
    if (!activeUrl) return;

    try {
      await navigator.clipboard.writeText(activeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  }, [activeUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-6xl max-h-[90vh] mx-4 bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-neutral-50">
          <div className="flex items-center gap-4">
            {/* Device toggle */}
            <div className="flex rounded-lg border border-neutral-200 p-1 bg-white">
              <button
                onClick={() => setActiveDevice('desktop')}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  activeDevice === 'desktop'
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100'
                )}
                disabled={!desktopUrl}
              >
                <Monitor className="h-4 w-4" />
                Desktop
              </button>
              <button
                onClick={() => setActiveDevice('mobile')}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  activeDevice === 'mobile'
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100'
                )}
                disabled={!mobileUrl}
              >
                <Smartphone className="h-4 w-4" />
                Mobile
              </button>
            </div>

            {/* Page URL */}
            <div className="hidden sm:flex items-center gap-2 text-sm text-neutral-600">
              <span className="font-mono truncate max-w-md">
                {pageUrl.replace(/^https?:\/\//, '')}
              </span>
              <a
                href={pageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Screenshot container */}
        <div className="flex-1 overflow-auto p-4 bg-neutral-100">
          {activeUrl ? (
            <div className="flex justify-center">
              <img
                src={activeUrl}
                alt={`${activeDevice} screenshot of ${pageUrl}`}
                className={cn(
                  'max-w-full h-auto rounded-lg shadow-lg border border-neutral-200',
                  activeDevice === 'mobile' && 'max-w-sm'
                )}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-neutral-500">
              No screenshot available for this device
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-neutral-50">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={!activeUrl}>
              <Download className="h-4 w-4 mr-2" />
              Download PNG
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyLink} disabled={!activeUrl}>
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </>
              )}
            </Button>
          </div>

          {capturedAt && (
            <span className="text-sm text-neutral-500">
              Captured: {new Date(capturedAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
