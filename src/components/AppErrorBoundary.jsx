import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Trip Planner render error:', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="tp-page-shell flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-5 text-center shadow-sm dark:border-red-900/70 dark:bg-slate-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <AlertTriangle size={24} />
          </div>
          <h1 className="mt-4 text-xl font-black text-slate-950 dark:text-white">畫面暫時無法顯示</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            旅程資料仍保留，請重新整理頁面再試一次。
          </p>
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
