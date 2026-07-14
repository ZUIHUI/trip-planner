import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui';
import { logger } from '../utils/logger';
import { buildErrorDiagnostic } from '../utils/errorDiagnostics';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, diagnostic: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, diagnostic: buildErrorDiagnostic(error) };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('Trip Planner render error:', error, errorInfo);
    this.setState({
      diagnostic: buildErrorDiagnostic(error, errorInfo?.componentStack)
    });
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { diagnostic } = this.state;

    return (
      <main
        className="tp-page-shell flex min-h-screen items-center justify-center p-4"
        role="alert"
        aria-live="assertive"
      >
        <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-5 text-center shadow-sm dark:border-red-900/70 dark:bg-slate-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <AlertTriangle size={24} />
          </div>
          <h1 className="mt-4 text-xl font-black text-slate-950 dark:text-white">畫面暫時無法顯示</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            旅程資料仍保留，請重新整理頁面再試一次。
          </p>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left dark:border-slate-700 dark:bg-slate-950/60">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold tracking-wide text-slate-700 dark:text-slate-200">診斷資訊</p>
              <code className="text-[11px] font-semibold text-red-700 dark:text-red-300">
                {diagnostic?.code || 'ERR-PENDING'}
              </code>
            </div>
            <p className="mt-2 break-words font-mono text-xs leading-5 text-slate-700 dark:text-slate-300">
              {diagnostic?.name || 'Error'}: {diagnostic?.message || '正在讀取錯誤資訊'}
            </p>
            <p className="mt-1 break-words text-xs text-slate-500 dark:text-slate-400">
              元件：{diagnostic?.component || '尚未辨識'}
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
              請將此區一併截圖，內容已自動遮蔽網址與敏感憑證。
            </p>
          </div>
          <Button className="mt-5 w-full" onClick={() => window.location.reload()}>
            <RefreshCw size={16} />
            重新整理
          </Button>
        </div>
      </main>
    );
  }
}

export default AppErrorBoundary;
