import { useState, useRef, useCallback, useEffect, type RefObject } from 'react';

interface UseVerticalResizeParams {
  containerRef: RefObject<HTMLDivElement | null>;
  defaultHeight?: number;
  minTopHeight?: number;
  minBottomHeight?: number;
  dividerHeight?: number;
  topOffset?: number;
}

interface UseVerticalResizeReturn {
  topHeight: number;
  isDragging: boolean;
  dividerProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
  };
}

export function useVerticalResize({
  containerRef,
  defaultHeight = 400,
  minTopHeight = 200,
  minBottomHeight = 120,
  dividerHeight = 6,
  topOffset = 0,
}: UseVerticalResizeParams): UseVerticalResizeReturn {
  const [topHeight, setTopHeight] = useState(defaultHeight);
  const [isDragging, setIsDragging] = useState(false);
  const draggingRef = useRef(false);

  // Keep params in a ref so document-level listeners always read the latest values
  const paramsRef = useRef({ containerRef, topOffset, minTopHeight, minBottomHeight, dividerHeight });
  paramsRef.current = { containerRef, topOffset, minTopHeight, minBottomHeight, dividerHeight };

  useEffect(() => {
    function clampAndSet(clientY: number) {
      const { containerRef: cRef, topOffset: tOff, minTopHeight: minT, minBottomHeight: minB, dividerHeight: dH } = paramsRef.current;
      if (!cRef.current) return;
      const rect = cRef.current.getBoundingClientRect();
      const relativeY = clientY - rect.top - tOff;
      const maxTop = rect.height - tOff - minB - dH;
      setTopHeight(Math.min(Math.max(relativeY, minT), maxTop));
    }

    function onMouseMove(e: MouseEvent) {
      if (!draggingRef.current) return;
      clampAndSet(e.clientY);
    }

    function onTouchMove(e: TouchEvent) {
      if (!draggingRef.current || e.touches.length === 0) return;
      clampAndSet(e.touches[0].clientY);
    }

    function onEnd() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setIsDragging(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onTouchMove);
    document.addEventListener('touchend', onEnd);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onEnd);
    };
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    setIsDragging(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    setIsDragging(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';
  }, []);

  return {
    topHeight,
    isDragging,
    dividerProps: { onMouseDown, onTouchStart },
  };
}
