'use client';

import { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { Button } from '@tds/ui';

interface Comment {
  userId: { _id: string; name: string; image?: string };
  content: string;
  createdAt: string | Date;
}

interface CommentThreadProps {
  comments: Comment[];
  onAddComment: (content: string) => void;
}

export function CommentThread({ comments, onAddComment }: CommentThreadProps) {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (text.trim()) {
      onAddComment(text.trim());
      setText('');
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-900">
        <MessageSquare className="h-4 w-4" />
        Comments ({comments.length})
      </h3>

      {comments.length > 0 && (
        <div className="mb-4 space-y-3">
          {comments.map((comment, index) => (
            <div key={index} className="rounded-lg bg-neutral-50 p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-700">
                  {comment.userId.name}
                </span>
                <span className="text-xs text-neutral-400">
                  {new Date(comment.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-sm text-neutral-600">{comment.content}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Add a comment..."
          className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm placeholder-neutral-400 focus:border-blue-300 focus:outline-none"
        />
        <Button size="sm" onClick={handleSubmit} disabled={!text.trim()}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
