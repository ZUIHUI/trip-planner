import React from 'react';
import { Navigate } from 'react-router-dom';
import { LoadingState } from './ui';
import { useAuth } from '../contexts/AuthContext';

const getCurrentRedirectPath = () => {
  if (typeof window === 'undefined') return '/';
  return `${window.location.pathname}${window.location.search}`;
};

const ProtectedRoute = ({ children }) => {
  const { currentUser, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return (
      <div className="tp-page-shell flex min-h-screen items-center justify-center p-4">
        <LoadingState />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(getCurrentRedirectPath())}`} replace />;
  }

  return children;
};

export default ProtectedRoute;
