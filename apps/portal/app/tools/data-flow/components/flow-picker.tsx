'use client';

import { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  Button,
  Input,
} from '@tds/ui';
import type { SaveStatus } from '../hooks/use-auto-save';

export interface FlowSummary {
  _id: string;
  name: string;
  description?: string;
  updatedAt: string;
}

interface FlowPickerProps {
  flows: FlowSummary[];
  activeFlowId: string | null;
  activeFlowName: string;
  saveStatus: SaveStatus;
  loadingFlows: boolean;
  onSelectFlow: (id: string) => void;
  onCreateFlow: (name: string) => void;
  onRenameFlow: (id: string, name: string) => void;
  onDeleteFlow: (id: string) => void;
}

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  if (status === 'saving') {
    return (
      <span className="flex items-center gap-1 text-xs text-neutral-400">
        <Loader2 className="w-3 h-3 animate-spin" />
        Saving…
      </span>
    );
  }
  if (status === 'saved') {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-500">
        <Check className="w-3 h-3" />
        Saved
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="text-xs text-red-500">Error saving</span>
    );
  }
  return null;
}

export function FlowPicker({
  flows,
  activeFlowId,
  activeFlowName,
  saveStatus,
  loadingFlows,
  onSelectFlow,
  onCreateFlow,
  onRenameFlow,
  onDeleteFlow,
}: FlowPickerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreating) createInputRef.current?.focus();
  }, [isCreating]);

  useEffect(() => {
    if (isRenaming) renameInputRef.current?.focus();
  }, [isRenaming]);

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onCreateFlow(trimmed);
    setNewName('');
    setIsCreating(false);
  };

  const handleRename = () => {
    const trimmed = renameName.trim();
    if (!trimmed || !activeFlowId) return;
    onRenameFlow(activeFlowId, trimmed);
    setIsRenaming(false);
  };

  const handleDelete = (id: string) => {
    onDeleteFlow(id);
    setDeleteConfirmId(null);
  };

  // Inline rename mode
  if (isRenaming && activeFlowId) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={renameInputRef}
          value={renameName}
          onChange={(e) => setRenameName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRename();
            if (e.key === 'Escape') setIsRenaming(false);
          }}
          className="h-7 w-48 text-sm"
          placeholder="Flow name"
        />
        <button
          type="button"
          onClick={handleRename}
          className="p-1 rounded hover:bg-neutral-100 text-emerald-600"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setIsRenaming(false)}
          className="p-1 rounded hover:bg-neutral-100 text-neutral-400"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Inline create mode
  if (isCreating) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={createInputRef}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreate();
            if (e.key === 'Escape') {
              setIsCreating(false);
              setNewName('');
            }
          }}
          className="h-7 w-48 text-sm"
          placeholder="New flow name"
        />
        <button
          type="button"
          onClick={handleCreate}
          className="p-1 rounded hover:bg-neutral-100 text-emerald-600"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => { setIsCreating(false); setNewName(''); }}
          className="p-1 rounded hover:bg-neutral-100 text-neutral-400"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 text-sm font-medium text-neutral-700 max-w-[280px]"
          >
            <span className="truncate">{activeFlowId ? activeFlowName : 'Select flow'}</span>
            <ChevronDown className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {loadingFlows ? (
            <div className="flex items-center justify-center py-3 text-xs text-neutral-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              Loading flows…
            </div>
          ) : flows.length === 0 ? (
            <div className="px-2 py-3 text-xs text-neutral-400 text-center">
              No flows yet
            </div>
          ) : (
            flows.map((flow) => (
              <DropdownMenuItem
                key={flow._id}
                onClick={() => onSelectFlow(flow._id)}
                className={flow._id === activeFlowId ? 'bg-neutral-100' : ''}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="truncate">{flow.name}</span>
                  {flow._id === activeFlowId && (
                    <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 ml-2" />
                  )}
                </div>
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsCreating(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Flow
          </DropdownMenuItem>
          {activeFlowId && (
            <>
              <DropdownMenuItem
                onClick={() => {
                  setRenameName(activeFlowName);
                  setIsRenaming(true);
                }}
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Rename
              </DropdownMenuItem>
              {deleteConfirmId === activeFlowId ? (
                <DropdownMenuItem
                  onClick={() => handleDelete(activeFlowId)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Confirm delete?
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => setDeleteConfirmId(activeFlowId)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Delete
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <SaveStatusIndicator status={saveStatus} />

      {!activeFlowId && !loadingFlows && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsCreating(true)}
          className="h-7 text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          New Flow
        </Button>
      )}
    </div>
  );
}
