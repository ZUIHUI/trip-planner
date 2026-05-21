import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Link2, Mail, PlaneTakeoff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button, Card, Field, Input, LoadingState, PageContainer } from '../components/ui';

const getRedirectFromSearch = (search) => {
  const params = new URLSearchParams(search);
  return params.get('redirect') || '/';
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
  const [email, setEmail] = useState(() => localStorage.getItem('trip_planner_email_for_sign_in') || '');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isCompletingLink = isEmailLink(window.location.href);

  useEffect(() => {
    if (isAuthLoading || !currentUser) return;
    const target = getRedirectAfterSignIn() || redirectPath || '/';
    clearRedirectAfterSignIn();
    navigate(target, { replace: true });
  }, [isAuthLoading, currentUser, navigate, redirectPath, getRedirectAfterSignIn, clearRedirectAfterSignIn]);

  useEffect(() => {
    if (!isCompletingLink || currentUser) return;
    const storedEmail = localStorage.getItem('trip_planner_email_for_sign_in') || '';
    if (!storedEmail) return;

    setIsSubmitting(true);
    completeEmailLink(storedEmail)
      .then(() => {
        setStatus('登入完成，正在回到旅程。');
      })
      .catch((authError) => {
        setError(authError.message || 'Email 連結登入失敗，請重新寄送連結。');
      })
      .finally(() => setIsSubmitting(false));
  }, [isCompletingLink, currentUser, completeEmailLink]);

  const handleSendLink = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
    setIsSubmitting(true);

    try {
      await sendMagicLink(email, redirectPath);
      setStatus('登入連結已寄出，請到信箱點擊連結完成登入。');
    } catch (authError) {
      setError(authError.message || '無法寄出登入連結。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteLink = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await completeEmailLink(email);
      setStatus('登入完成，正在回到旅程。');
    } catch (authError) {
      setError(authError.message || 'Email 連結登入失敗。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      await signInWithGoogle(redirectPath);
    } catch (authError) {
      setError(authError.message || 'Google 登入失敗。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <main className="tp-page-shell flex min-h-screen items-center justify-center p-4">
        <LoadingState label="確認登入狀態..." />
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
              使用 Email 連結或 Google 登入，旅程會依帳號分開保存，也能跨裝置回來繼續規劃。
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
              />
            </Field>
            <Button type="submit" disabled={isSubmitting} className="justify-center">
              <Mail size={16} />
              {isCompletingLink ? '完成 Email 登入' : '寄送登入連結'}
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
