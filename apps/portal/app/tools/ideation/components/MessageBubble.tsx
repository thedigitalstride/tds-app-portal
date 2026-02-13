'use client';

import { Bot, User, FileText, Sheet } from 'lucide-react';
import type { IIdeaMessage, IAttachment } from './types';

interface MessageBubbleProps {
  message: IIdeaMessage;
}

function AttachmentChip({ attachment }: { attachment: IAttachment }) {
  if (attachment.type === 'image') {
    return (
      <a href={attachment.blobUrl} target="_blank" rel="noopener noreferrer">
        <img
          src={attachment.blobUrl}
          alt={attachment.filename}
          className="h-16 w-16 rounded-lg object-cover border border-white/20 hover:opacity-80 transition-opacity"
        />
      </a>
    );
  }

  const Icon = attachment.type === 'pdf' ? FileText : Sheet;
  const iconColor = attachment.type === 'pdf' ? 'text-red-400' : 'text-green-400';

  return (
    <a
      href={attachment.blobUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2 py-1 text-xs hover:bg-white/20 transition-colors"
    >
      <Icon className={`h-3.5 w-3.5 shrink-0 ${iconColor}`} />
      <span className="max-w-[100px] truncate">{attachment.filename}</span>
    </a>
  );
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isAssistant = message.role === 'assistant';

  return (
    <div className={`flex gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isAssistant ? 'bg-blue-100 text-blue-600' : 'bg-neutral-200 text-neutral-600'
        }`}
      >
        {isAssistant ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isAssistant
            ? 'bg-white border border-neutral-200 text-neutral-800'
            : 'bg-blue-600 text-white'
        }`}
      >
        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {message.attachments.map((att) => (
              <AttachmentChip key={att.id} attachment={att} />
            ))}
          </div>
        )}

        {/* Text content */}
        {message.content && (
          <div
            className={`text-sm leading-relaxed whitespace-pre-wrap ${
              isAssistant ? 'prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-0.5' : ''
            }`}
            dangerouslySetInnerHTML={
              isAssistant
                ? { __html: formatMarkdown(message.content) }
                : undefined
            }
          >
            {!isAssistant ? message.content : undefined}
          </div>
        )}
      </div>
    </div>
  );
}

function formatMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-neutral-100 px-1 rounded text-sm">$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n- /g, '</p><ul><li>')
    .replace(/\n/g, '<br>')
    .replace(/<\/li><ul>/g, '</li>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}
