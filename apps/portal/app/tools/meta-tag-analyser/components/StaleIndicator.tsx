'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Badge, Button } from '@tds/ui';

interface StaleIndicatorProps {
  onRescan?: () => void;
  showRescanButton?: boolean;
  compact?: boolean;
}

export function StaleIndicator({
  onRescan,
  showRescanButton = true,
  compact = false,
}: StaleIndicatorProps) {
  if (compact) {
    return (
      <Badge variant="warning" className="text-xs">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Stale
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="warning" className="text-xs">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Stale - page updated since analysis
      </Badge>
      {showRescanButton && onRescan && (
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-xs"
          onClick={onRescan}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Rescan
        </Button>
      )}
    </div>
  );
}
