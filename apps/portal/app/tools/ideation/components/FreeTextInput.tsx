'use client';

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Send, Paperclip, X, FileText, Sheet, Loader2 } from 'lucide-react';
import { Button } from '@tds/ui';
import type { IAttachment } from './types';

export interface FreeTextInputHandle {
  focus: () => void;
}

const ACCEPTED_EXTENSIONS = '.png,.jpg,.jpeg,.gif,.webp,.pdf,.csv,.xlsx';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FreeTextInputProps {
  onSubmit: (text: string, attachments?: IAttachment[]) => void;
  onUploadFiles?: (files: File[]) => Promise<IAttachment[]>;
  disabled?: boolean;
  placeholder?: string;
  highlighted?: boolean;
}

export const FreeTextInput = forwardRef<FreeTextInputHandle, FreeTextInputProps>(function FreeTextInput({ onSubmit, onUploadFiles, disabled, placeholder = 'Type your answer...', highlighted }, ref) {
  const [text, setText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<IAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
  }));

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const canSubmit = (text.trim() || pendingAttachments.length > 0) && !disabled && !uploading;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(text.trim(), pendingAttachments.length > 0 ? pendingAttachments : undefined);
    setText('');
    setPendingAttachments([]);
    setUploadError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !onUploadFiles) return;

    // Reset file input so the same file can be selected again
    e.target.value = '';

    const totalCount = pendingAttachments.length + files.length;
    if (totalCount > 5) {
      setUploadError('Maximum 5 files per message');
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const newAttachments = await onUploadFiles(files);
      setPendingAttachments((prev) => [...prev, ...newAttachments]);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (id: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
    setUploadError(null);
  };

  return (
    <div className={`rounded-2xl bg-white shadow-sm ${highlighted ? 'border-2 border-blue-300 ring-2 ring-blue-100' : 'border border-neutral-200'}`}>
      {/* Attachment preview strip */}
      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 pt-3">
          {pendingAttachments.map((att) => (
            <div
              key={att.id}
              className="group relative flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1.5"
            >
              {att.type === 'image' ? (
                <img
                  src={att.blobUrl}
                  alt={att.filename}
                  className="h-10 w-10 rounded object-cover"
                />
              ) : att.type === 'pdf' ? (
                <FileText className="h-5 w-5 shrink-0 text-red-500" />
              ) : (
                <Sheet className="h-5 w-5 shrink-0 text-green-600" />
              )}
              {att.type !== 'image' && (
                <div className="min-w-0">
                  <p className="max-w-[120px] truncate text-xs font-medium text-neutral-700">
                    {att.filename}
                  </p>
                  <p className="text-[10px] text-neutral-400">{formatFileSize(att.size)}</p>
                </div>
              )}
              <button
                onClick={() => removeAttachment(att.id)}
                className="ml-1 rounded-full p-0.5 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-600"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="px-3 pt-2">
          <p className="text-xs text-red-500">{uploadError}</p>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 p-2">
        {onUploadFiles && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_EXTENSIONS}
              onChange={handleFileSelect}
              className="hidden"
            />
          </>
        )}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className="flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          size="sm"
          className="shrink-0 rounded-xl"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});
