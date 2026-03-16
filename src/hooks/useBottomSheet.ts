import { useRef, useCallback, useState, CSSProperties } from 'react';

export type SnapPoint = 'peek' | 'half' | 'full' | 'closed';

interface UseBottomSheetOptions {
  onClose?: () => void;
  initialSnap?: SnapPoint;
}

// Returns translateY value for each snap point.
// The sheet is positioned at bottom:0 with height:92vh, so at translateY=0
// it fills from 8vh to 100vh (fully visible). Positive values push it down,
// hiding content from the bottom.
function getTranslateY(snap: SnapPoint): number {
  if (typeof window === 'undefined') return 0;
  const vh = window.innerHeight;
  switch (snap) {
    case 'full':
      return 0; // fully visible (top at 8vh, bottom at viewport bottom)
    case 'half':
      return vh * 0.42; // ~half the sheet visible
    case 'peek':
      return vh * 0.67; // just the header visible (~25% of sheet)
    case 'closed':
      return vh; // fully off-screen
  }
}

export function useBottomSheet({ onClose, initialSnap = 'half' }: UseBottomSheetOptions = {}) {
  const [currentSnap, setCurrentSnap] = useState<SnapPoint>(initialSnap);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  const startY = useRef(0);
  const startTranslateY = useRef(0);
  const lastTimestamp = useRef(0);
  const lastY = useRef(0);
  const velocity = useRef(0);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      startY.current = touch.clientY;
      startTranslateY.current = getTranslateY(currentSnap);
      lastTimestamp.current = Date.now();
      lastY.current = touch.clientY;
      velocity.current = 0;
      setIsDragging(true);
    },
    [currentSnap]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const deltaY = touch.clientY - startY.current;
      const now = Date.now();
      const dt = now - lastTimestamp.current;

      if (dt > 0) {
        velocity.current = (touch.clientY - lastY.current) / dt;
      }
      lastTimestamp.current = now;
      lastY.current = touch.clientY;

      // Clamp: don't allow dragging above full snap
      const newTranslateY = Math.max(
        getTranslateY('full'),
        startTranslateY.current + deltaY
      );
      setDragOffset(newTranslateY - getTranslateY(currentSnap));
    },
    [isDragging, currentSnap]
  );

  const onTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    const currentY = getTranslateY(currentSnap) + dragOffset;
    const vh = window.innerHeight;

    // Velocity-based: fast swipe overrides position
    const VELOCITY_THRESHOLD = 0.5; // px/ms
    if (Math.abs(velocity.current) > VELOCITY_THRESHOLD) {
      if (velocity.current > 0) {
        // Swiping down
        if (currentSnap === 'full') {
          setCurrentSnap('half');
        } else if (currentSnap === 'half') {
          setCurrentSnap('peek');
        } else {
          setCurrentSnap('closed');
          onClose?.();
        }
      } else {
        // Swiping up
        if (currentSnap === 'peek') {
          setCurrentSnap('half');
        } else {
          setCurrentSnap('full');
        }
      }
      setDragOffset(0);
      return;
    }

    // Position-based: snap to nearest
    const snapValues: { snap: SnapPoint; y: number }[] = [
      { snap: 'full', y: getTranslateY('full') },
      { snap: 'half', y: getTranslateY('half') },
      { snap: 'peek', y: getTranslateY('peek') },
    ];

    // If dragged past 85% of screen → dismiss
    if (currentY > vh * 0.85) {
      setCurrentSnap('closed');
      setDragOffset(0);
      onClose?.();
      return;
    }

    // Find closest snap
    let closest = snapValues[0];
    let minDist = Math.abs(currentY - closest.y);
    for (const sv of snapValues) {
      const dist = Math.abs(currentY - sv.y);
      if (dist < minDist) {
        minDist = dist;
        closest = sv;
      }
    }
    setCurrentSnap(closest.snap);
    setDragOffset(0);
  }, [isDragging, currentSnap, dragOffset, onClose]);

  const snapTo = useCallback((snap: SnapPoint) => {
    setCurrentSnap(snap);
    setDragOffset(0);
    if (snap === 'closed') {
      onClose?.();
    }
  }, [onClose]);

  const translateY = getTranslateY(currentSnap) + dragOffset;

  const sheetStyle: CSSProperties = {
    transform: `translateY(${translateY}px)`,
    transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
    willChange: 'transform',
  };

  const handleProps = {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };

  return {
    sheetStyle,
    handleProps,
    snapTo,
    currentSnap,
    isDragging,
  };
}
