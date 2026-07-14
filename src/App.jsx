import React, { Suspense, lazy } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppErrorBoundary from './components/AppErrorBoundary';
import { FeedbackProvider } from './contexts/FeedbackContext';
import { AuthProvider } from './contexts/AuthContext';
import { LoadingState } from './components/ui';
import { markLazyImportReload } from './utils/lazyImportRecovery';

const lazyWithReload = (loader) => lazy(async () => {
  try {
    return await loader();
  } catch (error) {
    if (typeof window !== 'undefined' && markLazyImportReload(error)) {
      window.location.reload();
      return new Promise(() => {});
    }
    throw error;
  }
});

const LoginPage = lazyWithReload(() => import('./pages/LoginPage'));
const TripListPage = lazyWithReload(() => import('./pages/TripListPage'));
const TripDetailPage = lazyWithReload(() => import('./pages/TripDetailPage'));

const RouteFallback = () => (
  <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <LoadingState label="載入頁面中..." />
  </main>
);

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      >
        <Routes location={location}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><TripListPage /></ProtectedRoute>} />
          <Route path="/trip/:tripId" element={<ProtectedRoute><TripDetailPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

const App = () => {
  return (
    <FeedbackProvider>
      <AuthProvider>
        <AppErrorBoundary>
          <MotionConfig reducedMotion="user">
            <BrowserRouter>
              <Suspense fallback={<RouteFallback />}>
                <AnimatedRoutes />
              </Suspense>
            </BrowserRouter>
          </MotionConfig>
        </AppErrorBoundary>
      </AuthProvider>
    </FeedbackProvider>
  );
};

export default App;
