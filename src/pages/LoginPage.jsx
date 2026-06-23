import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Link2, Mail, PlaneTakeoff, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button, Card, Field, Input, LoadingState, PageContainer } from '../components/ui';
import InstallAppPrompt from '../components/InstallAppPrompt';
import { codeInputProps, emailInputProps } from '../utils/mobileInputProps';

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

const getErrorMessage = (error, fallback) => {
  const code = String(error?.code || '').replace(/^(functions|auth)\//, '');

  if (code === 'configuration-not-found' || code === 'invalid-api-key') {
    return '登入設定尚未完成，請稍後再試。';
  }

  if (code === 'operation-not-allowed') {
    return '這個登入方式尚未啟用。';
  }

  if (code === 'unauthorized-domain') {
    return '目前網域尚未加入可登入名單。';
  }

  if (code === 'invalid-email') {
    return 'Email 格式不正確。';
  }

  if (code === 'expired-action-code') {
    return '這個 Email 登入連結已過期，請重新取得驗證碼。';
  }

  if (code === 'invalid-action-code') {
    return '這個 Email 登入連結無效或已使用過，請重新取得驗證碼。';
  }

  if (code === 'popup-blocked') {
    return '瀏覽器封鎖了 Google 登入視窗，請允許彈出視窗後再試一次。';
  }

  if (code === 'popup-unavailable' || code === 'operation-not-supported-in-this-environment') {
    return '這個瀏覽器不支援 Google 登入視窗，請改用 Email 驗證碼登入，或用外部瀏覽器開啟 Trip Planner。';
  }

  if (code === 'popup-closed-by-user') {
    return 'Google 登入視窗已關閉，尚未完成登入。';
  }

  if (code === 'resource-exhausted') {
    return error?.message || '操作太頻繁，請稍候再試。';
  }

  if (code === 'failed-precondition' || code === 'not-found' || code === 'permission-denied') {
    return error?.message || fallback;
  }

  return error?.message || fallback;
};

const formatExpiry = (expiresAt) => {
  if (!expiresAt) return '';
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
};

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentUser,
    isAuthLoading,
    requestEmailCode,
    verifyEmailCode,
    completeEmailLink,
    signInWithGoogle,
    isEmailLink,
    getRedirectAfterSignIn,
    clearRedirectAfterSignIn,
    getRememberDevicePreference,
    setRememberDevicePreference
  } = useAuth();
  const redirectPath = useMemo(() => getRedirectFromSearch(location.search), [location.search]);
  const currentHref = getCurrentHref();
  const isCompletingLink = isEmailLink(currentHref);
  const [email, setEmail] = useState(getStoredEmail);
  const [code, setCode] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [loginStep, setLoginStep] = useState(isCompletingLink ? 'link' : 'email');
  const [showEmailBackup, setShowEmailBackup] = useState(isCompletingLink);
  const [rememberDevice, setRememberDevice] = useState(() => getRememberDevicePreference());
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const codeInputRef = useRef(null);

  useEffect(() => {
    setRememberDevicePreference(rememberDevice);
  }, [rememberDevice, setRememberDevicePreference]);

  useEffect(() => {
    if (loginStep !== 'code' || typeof window === 'undefined') return undefined;
    const timer = window.setTimeout(() => codeInputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [loginStep]);

  useEffect(() => {
    if (isAuthLoading || !currentUser) return;
    const target = getRedirectAfterSignIn() || redirectPath || '/';
    clearRedirectAfterSignIn();
    navigate(target, { replace: true });
  }, [
    isAuthLoading,
    currentUser,
    navigate,
    redirectPath,
    getRedirectAfterSignIn,
    clearRedirectAfterSignIn
  ]);

  useEffect(() => {
    if (!isCompletingLink || currentUser) return;

    const storedEmail = getStoredEmail();
    if (!storedEmail) {
      setStatus('請輸入收到登入信的 Email 以完成舊登入連結驗證。');
      setLoginStep('link');
      return;
    }

    setIsSubmitting(true);
    completeEmailLink(storedEmail, currentHref, rememberDevice)
      .then(() => {
        setStatus('Email 驗證成功，正在進入 Trip Planner。');
      })
      .catch((authError) => {
        setError(getErrorMessage(authError, 'Email 連結登入失敗，請重新取得驗證碼。'));
      })
      .finally(() => setIsSubmitting(false));
  }, [isCompletingLink, currentUser, completeEmailLink, currentHref, rememberDevice]);

  const handleRequestCode = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
    setIsSubmitting(true);

    try {
      const result = await requestEmailCode(email, redirectPath);
      setChallengeId(result.challengeId || '');
      setLoginStep('code');
      setStatus(`驗證碼已寄出${formatExpiry(result.expiresAt) ? `，請在 ${formatExpiry(result.expiresAt)} 前輸入` : ''}。`);
    } catch (authError) {
      setError(getErrorMessage(authError, '無法寄出驗證碼，請稍後再試。'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
    setIsSubmitting(true);

    try {
      await verifyEmailCode({
        email,
        code,
        challengeId,
        rememberDevice,
        redirectPath
      });
      setStatus('驗證成功，正在進入 Trip Planner。');
    } catch (authError) {
      setError(getErrorMessage(authError, '驗證碼不正確或已過期，請重新確認。'));
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
      await completeEmailLink(email, currentHref, rememberDevice);
      setStatus('Email 驗證成功，正在進入 Trip Planner。');
    } catch (authError) {
      setError(getErrorMessage(authError, 'Email 連結登入失敗，請確認 Email 與登入信一致。'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setStatus('');
    setIsSubmitting(true);

    try {
      await signInWithGoogle(redirectPath, rememberDevice);
    } catch (authError) {
      setError(getErrorMessage(authError, 'Google 登入失敗，請稍後再試。'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToEmail = () => {
    setLoginStep('email');
    setShowEmailBackup(true);
    setCode('');
    setChallengeId('');
    setError('');
    setStatus('');
  };

  const emailPanelOpen = showEmailBackup || loginStep === 'code' || isCompletingLink;

  if (isAuthLoading) {
    return (
      <main className="tp-page-shell flex min-h-screen items-center justify-center p-4">
        <LoadingState />
      </main>
    );
  }

  return (
    <main className="tp-page-shell min-h-screen">
      <PageContainer className="flex min-h-screen flex-col items-center justify-center gap-4 py-10">
        <Card className="relative w-full max-w-md overflow-hidden p-5 pt-6 sm:p-6 sm:pt-7">
          <div className="absolute inset-x-0 top-0 h-px bg-[#e0e9e0] dark:bg-brand-300/25" />
          <div className="mb-6">
            <div className="tp-icon-chip mb-4">
              <PlaneTakeoff size={22} />
            </div>
            <h1 className="text-2xl font-black text-stone-800 dark:text-brand-900">歡迎回到 Trip Planner</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">你的旅程都在這裡等你</p>
          </div>

          <label className="mb-3 flex items-center gap-3 rounded-lg border border-[#e0e9e0] bg-white/75 px-3 py-2 text-sm font-semibold text-stone-600 shadow-sm supports-[backdrop-filter]:backdrop-blur dark:border-brand-200/20 dark:bg-brand-50/60 dark:text-brand-800">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(event) => setRememberDevice(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            在此裝置保持登入
          </label>

          <Button onClick={handleGoogleLogin} disabled={isSubmitting} className="w-full justify-center">
            <Link2 size={16} />
            使用 Google 登入
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowEmailBackup((open) => !open)}
            className="mt-3 w-full justify-center"
            aria-expanded={emailPanelOpen}
          >
            <Mail size={16} />
            Email 驗證碼
          </Button>

          {emailPanelOpen && (
            <div className="mt-3 rounded-lg border border-[#e0e9e0] bg-white/75 p-3 shadow-sm supports-[backdrop-filter]:backdrop-blur dark:border-brand-200/20 dark:bg-brand-50/60">
              {loginStep === 'code' ? (
                <form onSubmit={handleVerifyCode} className="grid gap-3">
                  <Field label="Email" htmlFor="login-email-confirm">
                    <Input
                      id="login-email-confirm"
                      {...emailInputProps}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                  </Field>
                  <Field label="驗證碼" htmlFor="login-code">
                    <Input
                      id="login-code"
                      ref={codeInputRef}
                      {...codeInputProps}
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      required
                    />
                  </Field>
                  <Button type="submit" disabled={isSubmitting || code.length !== 6} className="justify-center">
                    <Mail size={16} />
                    完成登入
                  </Button>
                  <Button type="button" variant="secondary" onClick={handleBackToEmail} disabled={isSubmitting} className="justify-center">
                    <RefreshCw size={16} />
                    重新寄送驗證碼
                  </Button>
                </form>
              ) : (
                <form onSubmit={isCompletingLink ? handleCompleteLink : handleRequestCode} className="grid gap-3">
                  <Field label="Email" htmlFor="login-email">
                    <Input
                      id="login-email"
                      {...emailInputProps}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                  </Field>
                  <Button type="submit" disabled={isSubmitting} className="justify-center">
                    <Mail size={16} />
                    {isCompletingLink ? '完成舊登入連結' : '寄送驗證碼'}
                  </Button>
                </form>
              )}
            </div>
          )}

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
        <InstallAppPrompt className="w-full max-w-md" />
      </PageContainer>
    </main>
  );
};

export default LoginPage;
