'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import html2canvas from 'html2canvas-pro';
import { Camera, X, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import {
  cn,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Textarea,
  Select,
} from '@tds/ui';
import { useClient } from '../client-context';
import { tools } from '@/lib/tools';

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FeedbackType = 'bug' | 'feature' | 'question' | 'other';
type FeedbackUrgency = 'low' | 'medium' | 'high';

const typeOptions = [
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'question', label: 'Question' },
  { value: 'other', label: 'Other' },
];

const urgencyOptions = [
  { value: 'low', label: 'Nice to have' },
  { value: 'medium', label: 'Important' },
  { value: 'high', label: 'Blocking me' },
];

function getBrowserInfo(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Unknown';
}

function getToolFromPath(pathname: string): { id: string; name: string } | null {
  const toolMatch = pathname.match(/^\/tools\/([^/]+)/);
  if (toolMatch) {
    const toolId = toolMatch[1];
    const tool = tools.find((t) => t.id === toolId);
    if (tool) {
      return { id: tool.id, name: tool.name };
    }
  }
  return null;
}

export function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const pathname = usePathname();
  const { selectedClientId, selectedClient } = useClient();

  const [type, setType] = useState<FeedbackType>('bug');
  const [urgency, setUrgency] = useState<FeedbackUrgency>('medium');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<Blob | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Get current tool info
  const currentTool = getToolFromPath(pathname);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      // Delay reset to allow animation to complete
      const timer = setTimeout(() => {
        setType('bug');
        setUrgency('medium');
        setDescription('');
        setScreenshot(null);
        setScreenshotPreview(null);
        setSubmitStatus('idle');
        setErrorMessage(null);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const captureScreenshot = useCallback(async () => {
    setIsCapturing(true);
    // Hide the modal temporarily for clean screenshot
    onOpenChange(false);

    // Wait for modal to close
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scale: 1, // Use 1x scale to reduce file size
        logging: false,
      });

      canvas.toBlob((blob) => {
        if (blob) {
          setScreenshot(blob);
          setScreenshotPreview(URL.createObjectURL(blob));
        }
        setIsCapturing(false);
        onOpenChange(true);
      }, 'image/png');
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      setIsCapturing(false);
      onOpenChange(true);
    }
  }, [onOpenChange]);

  const removeScreenshot = useCallback(() => {
    if (screenshotPreview) {
      URL.revokeObjectURL(screenshotPreview);
    }
    setScreenshot(null);
    setScreenshotPreview(null);
  }, [screenshotPreview]);

  const handleSubmit = async () => {
    if (!description.trim()) {
      setErrorMessage('Please enter a description');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Collect console errors (last 10)
      const consoleErrors: string[] = [];
      // Note: We can't directly access console.error logs, but we could capture them
      // via a global error handler if needed. For now, we'll leave this empty.

      // Build form data
      const formData = new FormData();
      formData.append('type', type);
      formData.append('urgency', urgency);
      formData.append('description', description);
      formData.append('pageUrl', window.location.href);
      formData.append('toolId', currentTool?.id || '');
      formData.append('toolName', currentTool?.name || '');
      formData.append('clientId', selectedClientId || '');
      formData.append('browser', getBrowserInfo());
      formData.append('viewport', JSON.stringify({ width: window.innerWidth, height: window.innerHeight }));
      formData.append('userAgent', navigator.userAgent);
      formData.append('consoleErrors', JSON.stringify(consoleErrors));

      if (screenshot) {
        formData.append('screenshot', screenshot, 'screenshot.png');
      }

      const response = await fetch('/api/feedback', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit feedback');
      }

      setSubmitStatus('success');
      // Close modal after a short delay to show success message
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit feedback');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            Report a bug, request a feature, or ask a question.
          </DialogDescription>
        </DialogHeader>

        {submitStatus === 'success' ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium text-neutral-900">Thank you!</p>
            <p className="text-sm text-neutral-500">Your feedback has been submitted.</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4">
              {/* Type selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">
                  Type
                </label>
                <Select
                  value={type}
                  onChange={(e) => setType(e.target.value as FeedbackType)}
                  className="w-full"
                  options={typeOptions}
                />
              </div>

              {/* Urgency selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">
                  Urgency
                </label>
                <div className="flex gap-2">
                  {urgencyOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setUrgency(option.value as FeedbackUrgency)}
                      className={cn(
                        'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                        urgency === option.value
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">
                  Description
                </label>
                <Textarea
                  placeholder="Describe the issue or request..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Screenshot */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">
                  Screenshot (optional)
                </label>
                {screenshotPreview ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element -- Data URL preview, can't use Next.js Image */}
                    <img
                      src={screenshotPreview}
                      alt="Screenshot preview"
                      className="w-full rounded-lg border border-neutral-200"
                    />
                    <button
                      type="button"
                      onClick={removeScreenshot}
                      className="absolute -right-2 -top-2 rounded-full bg-neutral-900 p-1 text-white hover:bg-neutral-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={captureScreenshot}
                    disabled={isCapturing}
                    className={cn(
                      'flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 py-4 text-sm text-neutral-600 transition-colors hover:border-neutral-400 hover:bg-neutral-50',
                      isCapturing && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    {isCapturing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Capturing...
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4" />
                        Capture screenshot
                      </>
                    )}
                  </button>
                )}
                <p className="text-xs text-neutral-500">
                  Screenshot captures your current view
                </p>
              </div>

              {/* Context info */}
              {currentTool && (
                <div className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
                  Submitting from: <span className="font-medium">{currentTool.name}</span>
                  {selectedClient && (
                    <> for <span className="font-medium">{selectedClient.name}</span></>
                  )}
                </div>
              )}

              {/* Error message */}
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errorMessage}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !description.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Feedback'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
