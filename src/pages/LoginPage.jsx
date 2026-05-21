import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Link2, Mail, PlaneTakeoff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button, Card, Field, Input, LoadingState, PageContainer } from '../components/ui';

const EMAIL_FOR_SIGN_IN_KEY = 'trip_planner_email_for_sign_in';

const normalizeRedirectPath = (redirectPath = '/') => {
  const fallback = '/';
  const rawPath = String(redirectPath || fallback).trim();

  if (!rawPath || rawPath.startsWith('//') || /^https?:\/\//i.test(rawPath)) {
    return fallback;
  }

  return rawPath.startsWith('/') ? rawPath : fallback;
};

const getRedirectFromSearch = (search) => {
  const params = new URLSearchParams(search);
  return normalizeRedirectPath(params.get('redirect') || '/');
};

const getStoredEmail = () => {
  try {
    return localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY) || '';
  } catch {
    return '';
  }
};

const getCurrentHref = () => (typeof window === 'undefined' ? '' : window.location.href);

const getAuthErrorMessage = (authError, fallback) => {
  const code = authError?.code || '';

  if (code === 'auth/configuration-not-found') {
    return '登入服務尚未完成設定，請稍後再試。';
  }

  if (code === 'auth/operation-not-allowed') {
    return '這個登入方式尚未啟用，請先使用其他方式登入。';
  }

  if (code === 'auth/unauthorized-domain') {
    return '這個網址目前尚未允許登入，請稍後再試。';
  }

  if (code === 'auth/invalid-email') {
    return 'Email 格式不正確。';
  }

  if (code === 'auth/expired-action-code') {
    return '這個 Email 登入連結已過期，請重新寄送。';
  }

  if (code === 'auth/invalid-action-code') {
    return '這個 Email 登入連結無效或已使用過，請重新寄送。';
  }

  if (code === 'auth/popup-blocked') {
    return '瀏覽器封鎖了 Google 登入視窗，請允許彈出視窗後再試一次。';
  }

  if (code === 'auth/popup-closed-by-user') {
    return 'Google 登入視窗已關閉，尚未完成登入。';
  }

  if (code === 'auth/invalid-api-key') {
    return '登入服務設定有誤，請稍後再試。';
  }

  return authError?.message || fallback;
};

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentUser,
    isAuthLoading,
    sendMagicLink,
    completeEmailLink,
    signInWithGoogle,
    isEmailLink,
    getRedirectAfterSignIn,
    clearRedirectAfterSignIn
  } = useAuth();
  const redirectPath = useMemo(() => getRedirectFromSearch(location.search), [location.search]);
  const currentHref = getCurrentHref();
  const isCompletingLink = isEmailLink(currentHref);
  const [email, setEmail] = useState(getStoredEmail);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthLoading || !currentUser) return;
    const target = getRedirectAfterSignIn() || redirectPath || '/';
    clearRedirectAfterSignIn();
    navigate(target, { replace: true });
  }, [isAuthLoading, currentUser, navigate, redirectPath, getRedirectAfterSignIn, clearRedirectAfterSignIn]);

  useEffect(() => {
    if (!isCompletingLink || currentUser) return;

    const storedEmail = getStoredEmail();
    if (!storedEmail) {
      setStatus('請輸入收到登入信的 Email 以完成驗證。');
      return;
    }

    setIsSubmitting(true);
    completeEmailLink(storedEmail, currentHref)
      .then(() => {
        setStatus('Email 驗證成功，正在進入 Trip Planner。');
      })
      .catch((authError) => {
        setError(getAuthErrorMessage(authError, 'Email 連結登入失敗，請重新寄送登入連結。'));
      })
      .finally(() => setIsSubmitting(false));
  }, [isCompletingLink, currentUser, completeEmailLink, currentHref]);

  const handleSendLink = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
    setIsSubmitting(true);

    try {
      await sendMagicLink(email, redirectPath);
      setStatus('登入連結已寄出，請到信箱開啟連結完成驗證。');
    } catch (authError) {
      setError(getAuthErrorMessage(authError, '無法寄出登入連結，請稍後再試。'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteLink = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
    setIsSubmitting(true);

    try {
      await completeEmailLink(email, currentHref);
      setStatus('Email 驗證成功，正在進入 Trip Planner。');
    } catch (authError) {
      setError(getAuthErrorMessage(authError, 'Email 連結登入失敗，請確認 Email 與登入信一致。'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setStatus('');
    setIsSubmitting(true);

    try {
      await signInWithGoogle(redirectPath);
    } catch (authError) {
      setError(getAuthErrorMessage(authError, 'Google 登入失敗，請稍後再試。'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <main className="tp-page-shell flex min-h-screen items-center justify-center p-4">
        <LoadingState label="正在確認登入狀態..." />
      </main>
    );
  }

  return (
    <main className="tp-page-shell min-h-screen">
      <PageContainer className="flex min-h-screen items-center justify-center py-10">
        <Card className="w-full max-w-md p-5 sm:p-6">
          <div className="mb-6">
            <div className="tp-icon-chip mb-4 bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-300">
              <PlaneTakeoff size={22} />
            </div>
            <h1 className="text-2xl font-black text-slate-950 dark:text-white">登入 Trip Planner</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              使用 Email 驗證連結或 Google 帳號登入，之後就能在不同裝置看到你的旅程。
            </p>
          </div>

          <form onSubmit={isCompletingLink ? handleCompleteLink : handleSendLink} className="grid gap-3">
            <Field label="Email" htmlFor="login-email">
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </Field>
            <Button type="submit" disabled={isSubmitting} className="justify-center">
              <Mail size={16} />
              {isCompletingLink ? '完成 Email 登入' : '寄送 Email 登入連結'}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs font-bold text-slate-400">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            或
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>

          <Button variant="secondary" onClick={handleGoogleLogin} disabled={isSubmitting} className="w-full justify-center">
            <Link2 size={16} />
            使用 Google 登入
          </Button>

          {status && (
            <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200">
              {status}
            </p>
          )}
          {error && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </p>
          )}
        </Card>
      </PageContainer>
    </main>
  );
};

export default LoginPage;
