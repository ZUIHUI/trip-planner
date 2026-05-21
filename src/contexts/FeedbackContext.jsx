import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, RotateCcw, X } from 'lucide-react';
import { Button } from '../components/ui';

const FeedbackContext = createContext(null);

const toastStyles = {
  danger: {
    icon: AlertTriangle,
    className: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/70 dark:bg-red-950 dark:text-red-200'
  },
  info: {
    icon: Info,
    className: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/70 dark:bg-sky-950 dark:text-sky-200'
  },
  success: {
    icon: CheckCircle2,
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950 dark:text-emerald-200'
  },
  warning: {
    icon: AlertTriangle,
    className: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950 dark:text-amber-100'
  }
};

const confirmStyles = {
  danger: {
    iconClass: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
    confirmVariant: 'danger'
  },
  info: {
    iconClass: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
    confirmVariant: 'primary'
  },
  warning: {
    iconClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    confirmVariant: 'primary'
  }
};

const ToastItem = ({ toast, onDismiss }) => {
  const {
    id,
    title,
    description,
    variant = 'info',
    actionLabel,
    onAction,
    duration = 4500
  } = toast;
  const style = toastStyles[variant] || toastStyles.info;
  const Icon = style.icon;

  useEffect(() => {
    if (duration <= 0) return undefined;
    const timer = window.setTimeout(() => onDismiss(id), duration);
    return () => window.clearTimeout(timer);
  }, [duration, id, onDismiss]);

  const handleAction = () => {
    onAction?.();
    onDismiss(id);
  };

  return (
    <div
      className={`pointer-events-auto w-full max-w-sm rounded-lg border p-3 shadow-xl ${style.className}`}
      role="status"
      aria-live={variant === 'danger' ? 'assertive' : 'polite'}
    >
      <div className="flex items-start gap-3">
        <Icon size={18} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-black">{title}</p>
          {description && <p className="mt-1 break-words text-xs font-semibold opacity-80">{description}</p>}
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={handleAction}
              className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/75 px-2.5 py-1 text-xs font-black text-slate-700 transition hover:bg-white dark:bg-slate-950/35 dark:text-slate-100 dark:hover:bg-slate-950/55"
            >
              <RotateCcw size={13} />
              {actionLabel}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(id)}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full opacity-70 transition hover:bg-white/60 hover:opacity-100 dark:hover:bg-slate-950/35"
          aria-label="關閉提示"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};

const ConfirmDialog = ({ state, onCancel, onConfirm }) => {
  if (!state) return null;

  const {
    title = '確認操作？',
    description = '',
    confirmLabel = '確認',
    cancelLabel = '取消',
    variant = 'danger'
  } = state;
  const style = confirmStyles[variant] || confirmStyles.danger;

  return (
    <div
      className="fixed inset-0 z-[190] flex items-end justify-center bg-slate-950/55 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="global-confirm-title"
    >
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${style.iconClass}`}>
            <AlertTriangle size={20} />
          </div>
          <div className="min-w-0">
            <h3 id="global-confirm-title" className="break-words text-lg font-black text-slate-900 dark:text-white">
              {title}
            </h3>
            {description && (
              <p className="mt-2 break-words text-sm leading-6 text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={style.confirmVariant} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
};

export const FeedbackProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback((options) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [
      {
        id,
        title: options?.title || '提示',
        ...options
      },
      ...current
    ].slice(0, 4));
    return id;
  }, []);

  const confirm = useCallback((options) => new Promise((resolve) => {
    setConfirmState({
      ...options,
      resolve
    });
  }), []);

  const cancelConfirm = useCallback(() => {
    setConfirmState((current) => {
      current?.resolve?.(false);
      return null;
    });
  }, []);

  const acceptConfirm = useCallback(() => {
    setConfirmState((current) => {
      current?.resolve?.(true);
      return null;
    });
  }, []);

  const value = useMemo(() => ({
    toast,
    confirm
  }), [confirm, toast]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[200] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:top-4 sm:bottom-auto sm:items-end">
        {toasts.map((item) => (
          <ToastItem key={item.id} toast={item} onDismiss={dismissToast} />
        ))}
      </div>
      <ConfirmDialog state={confirmState} onCancel={cancelConfirm} onConfirm={acceptConfirm} />
    </FeedbackContext.Provider>
  );
};

export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used inside FeedbackProvider');
  }
  return context;
};
