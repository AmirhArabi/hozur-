import React, { useEffect, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { HistoryAction } from '../../types';

interface UndoToastProps {
  action: HistoryAction | null;
  onUndo: (action: HistoryAction) => void;
  onDismiss: () => void;
  durationMs?: number;
}

export const UndoToast: React.FC<UndoToastProps> = ({
  action,
  onUndo,
  onDismiss,
  durationMs = 6000,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!action) return;

    setProgress(100);
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPct = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(remainingPct);
      if (remainingPct <= 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [action, durationMs, onDismiss]);

  if (!action) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto transition-all animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-950 p-3.5 rounded-2xl shadow-xl border border-neutral-800 dark:border-neutral-200 flex items-center justify-between gap-3 overflow-hidden relative">
        {/* Progress bar at the top */}
        <div
          className="absolute top-0 right-0 left-0 h-1 bg-primary-500 transition-all duration-75"
          style={{ width: `${progress}%`, direction: 'ltr' }}
        />

        <div className="flex items-center gap-2.5 truncate">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-xs font-medium truncate">{action.description}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onUndo(action)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/15 dark:bg-neutral-900/15 hover:bg-white/25 text-xs font-bold active:scale-95 transition-all text-emerald-400 dark:text-emerald-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>بازگردانی</span>
          </button>
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg text-neutral-400 hover:text-white dark:hover:text-black transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
