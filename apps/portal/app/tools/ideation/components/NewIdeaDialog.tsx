'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@tds/ui';
import { TemplateSelector } from './TemplateSelector';

interface NewIdeaDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}

export function NewIdeaDialog({ open, onClose, onCreated }: NewIdeaDialogProps) {
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/tools/ideation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      });
      if (!res.ok) throw new Error('Failed to create idea');
      const data = await res.json();
      onCreated(data.idea._id);
    } catch (error) {
      console.error('Error creating idea:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Idea</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <TemplateSelector selected={templateId} onSelect={setTemplateId} />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start Ideation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
