import React, { Suspense } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppErrorBoundary from './components/AppErrorBoundary';
import { FeedbackProvider } from './contexts/FeedbackContext';
import { AuthProvider } from './contexts/AuthContext';
import { LoadingState } from './components/ui';
import { lazyWithReload } from './utils/lazyComponent';
import { TP_TAB_CONTENT_MOTION } from './utils/motionPresets';

const LoginPage = lazyWithReload(() => import('./pages/LoginPage'));
const TripListPage = lazyWithReload(() => import('./pages/TripListPage'));
const TripDetailPage = lazyWithReload(() => import('./pages/TripDetailPage'));

const RouteFallback = () => (
  <main className="tp-route-loading">
    <LoadingState label="載入頁面中..." />
  </main>
);

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        {...TP_TAB_CONTENT_MOTION}
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
              <a className="tp-skip-link" href="#main-content">
                跳到主要內容
              </a>
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
