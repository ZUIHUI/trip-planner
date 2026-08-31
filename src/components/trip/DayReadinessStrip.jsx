import React, { useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '../ui';
import { buildDayReadiness } from '../../utils/eventReadiness';

const DayReadinessStrip = ({ events = [], canEdit, onOpenEvent, className = '' }) => {
  const readiness = useMemo(() => buildDayReadiness(events), [events]);
  if (!readiness.totalEvents || readiness.isComplete) return null;

  const targetEvent = readiness.firstIncompleteEvent;
  const actionLabel = canEdit ? '補第一個' : '查看';

  return (
    <div className={`rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-black">今日還有 {readiness.incompleteCount} 個行程待補</p>
            <p className="mt-0.5 text-xs font-semibold opacity-85">
              缺時間 {readiness.missingTimeCount} 個 · 缺地點 {readiness.missingLocationCount} 個
            </p>
          </div>
        </div>
        {targetEvent && onOpenEvent && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenEvent(targetEvent, !canEdit)}
            className="shrink-0 !border-amber-200 !bg-white/80 !text-amber-900 hover:!bg-white dark:!border-amber-900/70 dark:!bg-slate-950/35 dark:!text-amber-100"
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
};

export default DayReadinessStrip;
