'use client';

import { Download, RefreshCw } from 'lucide-react';
import { Button } from '@tds/ui';

interface PrdPreviewProps {
  content: string;
  onExport: () => void;
  onRegenerate: () => void;
  regenerating: boolean;
}

export function PrdPreview({ content, onExport, onRegenerate, regenerating }: PrdPreviewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900">Generated PRD</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRegenerate} disabled={regenerating}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${regenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
          <Button size="sm" onClick={onExport}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export .md
          </Button>
        </div>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <div
          className="prose prose-sm max-w-none prose-headings:text-neutral-900 prose-p:text-neutral-700 prose-strong:text-neutral-800 prose-li:text-neutral-700"
          dangerouslySetInnerHTML={{ __html: formatPrdMarkdown(content) }}
        />
      </div>
    </div>
  );
}

function formatPrdMarkdown(text: string): string {
  return text
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/^(?!<[hulo])(.+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '')
    .replace(/---/g, '<hr>');
}
