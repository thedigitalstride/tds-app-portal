'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { Loader2, Undo2 } from 'lucide-react';
import type { IIdeaMessage, IAttachment } from './types';
import { MessageBubble } from './MessageBubble';
import { MultipleChoiceOptions } from './MultipleChoiceOptions';
import { FreeTextInput } from './FreeTextInput';
import type { FreeTextInputHandle } from './FreeTextInput';

interface ConversationPanelProps {
  messages: IIdeaMessage[];
  onSendMessage: (content: string, selectedOptionId?: string, attachments?: IAttachment[]) => void;
  onUploadFiles?: (files: File[]) => Promise<IAttachment[]>;
  onUndoLastExchange?: () => void;
  sending: boolean;
  lastOptions?: Array<{ id: string; label: string; value: string }>;
}

export function ConversationPanel({
  messages,
  onSendMessage,
  onUploadFiles,
  onUndoLastExchange,
  sending,
  lastOptions,
}: ConversationPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const freeTextRef = useRef<FreeTextInputHandle>(null);
  const [customInputActive, setCustomInputActive] = useState(false);

  const handleCustomInput = useCallback(() => {
    setCustomInputActive(true);
    freeTextRef.current?.focus();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const handleOptionSelect = (option: { id: string; label: string; value: string }) => {
    onSendMessage(option.label, option.id);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.map((msg, index) => (
            <MessageBubble key={index} message={msg} />
          ))}

          {/* Undo last exchange button */}
          {onUndoLastExchange && messages.length >= 1 && !sending && (
            <div className="flex justify-start pl-11">
              <button
                onClick={onUndoLastExchange}
                className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <Undo2 className="h-3 w-3" />
                Undo last response
              </button>
            </div>
          )}

          {/* Show options from last assistant message */}
          {lastOptions && lastOptions.length > 0 && !sending && (
            <MultipleChoiceOptions
              options={lastOptions}
              onSelect={handleOptionSelect}
              onCustomInput={handleCustomInput}
              disabled={sending}
            />
          )}

          {/* Loading indicator */}
          {sending && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
              <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                  </span>
                  Thinking
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-neutral-200 bg-neutral-50 p-4">
        <div className="mx-auto max-w-2xl">
          <FreeTextInput
            ref={freeTextRef}
            onSubmit={(text, attachments) => {
              setCustomInputActive(false);
              onSendMessage(text, undefined, attachments);
            }}
            onUploadFiles={onUploadFiles}
            disabled={sending}
            placeholder={lastOptions?.length ? 'Or type your own answer...' : 'Type your answer...'}
            highlighted={customInputActive || !lastOptions?.length}
          />
        </div>
      </div>
    </div>
  );
}
