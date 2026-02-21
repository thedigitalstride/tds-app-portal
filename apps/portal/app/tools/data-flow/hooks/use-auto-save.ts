import { useEffect, useRef, useState, useCallback } from 'react';
import type { Edge } from '@xyflow/react';
import type { AppNode } from '../components/types';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface FlowSavePayload {
  nodes: AppNode[];
  edges: Edge[];
  activeTableNodeId: string | null;
  tableCounter: number;
  schemaCounter: number;
  joinCounter: number;
  facebookAdCounter: number;
}

const DEBOUNCE_MS = 1500;
const SAVED_DISPLAY_MS = 2000;

/**
 * Debounced auto-save hook. Watches the payload and PUTs to the API
 * 1.5 s after the last change.
 */
export function useAutoSave(flowId: string | null, payload: FlowSavePayload) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  // Ref to the latest payload so the save closure always uses current data
  const payloadRef = useRef(payload);
  payloadRef.current = payload;

  const save = useCallback(async () => {
    if (!flowId) return;
    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/tools/data-flow/${flowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: payloadRef.current.nodes,
          edges: payloadRef.current.edges,
          activeTableNodeId: payloadRef.current.activeTableNodeId,
          tableCounter: payloadRef.current.tableCounter,
          schemaCounter: payloadRef.current.schemaCounter,
          joinCounter: payloadRef.current.joinCounter,
          facebookAdCounter: payloadRef.current.facebookAdCounter,
        }),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      setSaveStatus('saved');
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), SAVED_DISPLAY_MS);
    } catch (err) {
      console.error('Auto-save error:', err);
      setSaveStatus('error');
    }
  }, [flowId]);

  // Debounce: restart timer on every payload change (skip initial render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!flowId) return;

    // Clear previous timers
    if (timerRef.current) clearTimeout(timerRef.current);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);

    timerRef.current = setTimeout(save, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // We intentionally serialise a lightweight fingerprint rather than deep-comparing
    // the full payload. Node count + edge count + counters + activeTableNodeId covers
    // all meaningful structural changes. Position drags are captured because React Flow's
    // applyNodeChanges creates new array references, which trigger setNodes → new payload ref.
  }, [
    flowId,
    payload.nodes,
    payload.edges,
    payload.activeTableNodeId,
    payload.tableCounter,
    payload.schemaCounter,
    payload.joinCounter,
    payload.facebookAdCounter,
    save,
  ]);

  // Reset on flow switch
  useEffect(() => {
    isFirstRender.current = true;
    setSaveStatus('idle');
    if (timerRef.current) clearTimeout(timerRef.current);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  }, [flowId]);

  return { saveStatus };
}
