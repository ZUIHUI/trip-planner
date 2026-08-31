import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, Link2, Loader2, Mail, MapPinned, PlaneTakeoff, RefreshCw, Sparkles, UsersRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button, Card, Field, Input, LoadingState, PageContainer } from '../components/ui';
import InstallAppPrompt from '../components/InstallAppPrompt';
import { codeInputProps, emailInputProps } from '../utils/mobileInputProps';
import {
  clearEmailLoginChallenge,
  readEmailLoginChallenge,
  saveEmailLoginChallenge
} from '../utils/emailLoginChallenge';

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
  const storedEmailChallenge = useMemo(() => readEmailLoginChallenge(), []);
  const [email, setEmail] = useState(() => storedEmailChallenge?.email || getStoredEmail());
  const [code, setCode] = useState('');
  const [challengeId, setChallengeId] = useState(() => storedEmailChallenge?.challengeId || '');
  const [loginStep, setLoginStep] = useState(
    isCompletingLink ? 'link' : (storedEmailChallenge ? 'code' : 'email')
  );
  const [showEmailBackup, setShowEmailBackup] = useState(
    isCompletingLink || Boolean(storedEmailChallenge)
  );
  const [rememberDevice, setRememberDevice] = useState(() => getRememberDevicePreference());
  const [status, setStatus] = useState(() => (
    storedEmailChallenge
      ? `驗證碼已寄出${formatExpiry(storedEmailChallenge.expiresAt) ? `，請在 ${formatExpiry(storedEmailChallenge.expiresAt)} 前輸入` : ''}。`
      : ''
  ));
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingAuthAction, setPendingAuthAction] = useState('');
  const codeInputRef = useRef(null);
  const mobileCodeInputRef = useRef(null);

  useEffect(() => {
    setRememberDevicePreference(rememberDevice);
  }, [rememberDevice, setRememberDevicePreference]);

  useEffect(() => {
    if (loginStep !== 'code' || typeof window === 'undefined') return undefined;
    const timer = window.setTimeout(() => {
      const isMobileViewport = window.matchMedia?.('(max-width: 767px)').matches;
      const targetInput = isMobileViewport ? mobileCodeInputRef.current : codeInputRef.current;
      (targetInput || codeInputRef.current || mobileCodeInputRef.current)?.focus();
    }, 0);
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
    setPendingAuthAction('email-link');
    completeEmailLink(storedEmail, currentHref, rememberDevice)
      .then(() => {
        setStatus('Email 驗證成功，正在進入 Trip Planner。');
      })
      .catch((authError) => {
        setError(getErrorMessage(authError, 'Email 連結登入失敗，請重新取得驗證碼。'));
      })
      .finally(() => {
        setIsSubmitting(false);
        setPendingAuthAction('');
      });
  }, [isCompletingLink, currentUser, completeEmailLink, currentHref, rememberDevice]);

  const handleRequestCode = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
    setIsSubmitting(true);
    setPendingAuthAction('request-code');

    try {
      const result = await requestEmailCode(email, redirectPath);
      const nextChallenge = saveEmailLoginChallenge({
        challengeId: result.challengeId,
        email,
        expiresAt: result.expiresAt
      });

      if (!nextChallenge) {
        throw new Error('無法建立驗證流程，請重新寄送驗證碼。');
      }

      setEmail(nextChallenge.email);
      setChallengeId(nextChallenge.challengeId);
      setLoginStep('code');
      setShowEmailBackup(true);
      setStatus(`驗證碼已寄出${formatExpiry(nextChallenge.expiresAt) ? `，請在 ${formatExpiry(nextChallenge.expiresAt)} 前輸入` : ''}。`);
    } catch (authError) {
      setError(getErrorMessage(authError, '無法寄出驗證碼，請稍後再試。'));
    } finally {
      setIsSubmitting(false);
      setPendingAuthAction('');
    }
  };

  const handleVerifyCode = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
    setIsSubmitting(true);
    setPendingAuthAction('verify-code');

    try {
      await verifyEmailCode({
        email,
        code,
        challengeId,
        rememberDevice,
        redirectPath
      });
      clearEmailLoginChallenge();
      setStatus('驗證成功，正在進入 Trip Planner。');
    } catch (authError) {
      setError(getErrorMessage(authError, '驗證碼不正確或已過期，請重新確認。'));
    } finally {
      setIsSubmitting(false);
      setPendingAuthAction('');
    }
  };

  const handleCompleteLink = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
    setIsSubmitting(true);
    setPendingAuthAction('email-link');

    try {
      await completeEmailLink(email, currentHref, rememberDevice);
      clearEmailLoginChallenge();
      setStatus('Email 驗證成功，正在進入 Trip Planner。');
    } catch (authError) {
      setError(getErrorMessage(authError, 'Email 連結登入失敗，請確認 Email 與登入信一致。'));
    } finally {
      setIsSubmitting(false);
      setPendingAuthAction('');
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setStatus('');
    setIsSubmitting(true);
    setPendingAuthAction('google');

    try {
      await signInWithGoogle(redirectPath, rememberDevice);
      clearEmailLoginChallenge();
    } catch (authError) {
      setError(getErrorMessage(authError, 'Google 登入失敗，請稍後再試。'));
    } finally {
      setIsSubmitting(false);
      setPendingAuthAction('');
    }
  };

  const handleBackToEmail = () => {
    clearEmailLoginChallenge();
    setLoginStep('email');
    setShowEmailBackup(true);
    setCode('');
    setChallengeId('');
    setError('');
    setStatus('');
  };

  const emailPanelOpen = showEmailBackup || loginStep === 'code' || isCompletingLink;
  const isRequestingEmailCode = isSubmitting && pendingAuthAction === 'request-code';
  const isVerifyingEmailCode = isSubmitting && pendingAuthAction === 'verify-code';
  const isCompletingEmailLink = isSubmitting && pendingAuthAction === 'email-link';
  const isGoogleSubmitting = isSubmitting && pendingAuthAction === 'google';

  if (isAuthLoading) {
    return (
      <main className="tp-page-shell flex min-h-screen items-center justify-center p-4">
        <LoadingState />
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="tp-page-shell tp-auth-shell min-h-screen">
      <section
        className="tp-mobile-auth-shell"
        aria-label="Trip Planner sign in"
      >
        <header className="tp-mobile-auth-hero">
          <div className="tp-mobile-auth-route" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="tp-mobile-auth-brand">
            <span className="tp-mobile-auth-icon">
              <PlaneTakeoff size={28} />
            </span>
            <div>
              <h1>Trip Planner</h1>
              <p>Plan smarter. Travel better.</p>
            </div>
          </div>
        </header>

        <section className="tp-mobile-auth-sheet" aria-label="登入操作">
          <div className="tp-mobile-auth-heading">
            <h2>下一趟旅行，從一個清楚的計畫開始。</h2>
            <p>行程、地圖、旅伴、預算與清單，都集中在同一個地方。</p>
          </div>

          <label className="tp-mobile-auth-remember">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(event) => setRememberDevice(event.target.checked)}
            />
            <span>記住這台裝置</span>
          </label>

          <Button
            onClick={handleGoogleLogin}
            disabled={isSubmitting}
            className="tp-mobile-auth-primary w-full justify-center"
          >
            {isGoogleSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Link2 size={18} />}
            {isGoogleSubmitting ? '登入中...' : '使用 Google 登入'}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowEmailBackup((open) => !open)}
            className="tp-mobile-auth-email w-full justify-center"
            aria-expanded={emailPanelOpen}
          >
            <Mail size={18} />
            使用 Email 驗證碼登入
          </Button>

          {emailPanelOpen && (
            <div className="tp-mobile-auth-email-panel">
              {loginStep === 'code' ? (
                <form onSubmit={handleVerifyCode} className="grid gap-3">
                  <Field label="電子信箱" htmlFor="mobile-login-email-confirm">
                    <Input
                      id="mobile-login-email-confirm"
                      {...emailInputProps}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                  </Field>
                  <Field label="驗證碼" htmlFor="mobile-login-code">
                    <Input
                      id="mobile-login-code"
                      ref={mobileCodeInputRef}
                      {...codeInputProps}
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      required
                    />
                  </Field>
                  <Button type="submit" disabled={isSubmitting || code.length !== 6 || !challengeId} className="justify-center">
                    {isVerifyingEmailCode ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                    {isVerifyingEmailCode ? '登入中...' : '驗證並登入'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={handleBackToEmail} disabled={isSubmitting} className="justify-center">
                    <RefreshCw size={16} />
                    重新寄送驗證碼
                  </Button>
                </form>
              ) : (
                <form onSubmit={isCompletingLink ? handleCompleteLink : handleRequestCode} className="grid gap-3">
                  <Field label="電子信箱" htmlFor="mobile-login-email">
                    <Input
                      id="mobile-login-email"
                      {...emailInputProps}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                  </Field>
                  <Button type="submit" disabled={isSubmitting} className="justify-center">
                    {(isCompletingEmailLink || isRequestingEmailCode) ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                    {isCompletingLink
                      ? (isCompletingEmailLink ? '登入中...' : '完成 Email 登入')
                      : (isRequestingEmailCode ? '寄送中...' : '發送驗證碼')}
                  </Button>
                </form>
              )}
            </div>
          )}

          {status && (
            <p className="tp-mobile-auth-status tp-mobile-auth-status-success" role="status" aria-live="polite">
              {status}
            </p>
          )}
          {error && (
            <p className="tp-mobile-auth-status tp-mobile-auth-status-error" role="alert">
              {error}
            </p>
          )}

          <InstallAppPrompt className="tp-mobile-auth-install" />
          <p className="tp-auth-privacy-note">
            我們如何儲存與使用資料，以及建立者與旅伴的責任，請見
            <Link to="/privacy">隱私權政策</Link>。
          </p>
        </section>
      </section>

      <PageContainer
        className="tp-auth-layout tp-desktop-auth-shell py-10"
      >
        <section className="tp-auth-composite" aria-label="Trip Planner 登入">
          <Card className="tp-auth-card tp-atlas-auth-card tp-auth-story-card relative w-full max-w-md overflow-hidden p-5 pt-6 sm:p-6 sm:pt-7">
            <div className="absolute inset-x-0 top-0 h-px bg-[#e0e9e0] dark:bg-brand-300/25" />
            <div className="mb-6">
              <div className="tp-icon-chip mb-4">
                <PlaneTakeoff size={22} />
              </div>
              <p className="tp-auth-story-kicker">PLAN TOGETHER · TRAVEL BETTER</p>
              <h1 className="text-2xl font-black text-stone-800 dark:text-brand-900">
                把想去的地方，<br />排成一段好旅程。
              </h1>
              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">行程、地圖、預算與旅伴資訊都在一起，從計畫到出發，隨時清楚同步。</p>
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
              {isGoogleSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
              {isGoogleSubmitting ? '登入中...' : '使用 Google 登入'}
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
                    <Button type="submit" disabled={isSubmitting || code.length !== 6 || !challengeId} className="justify-center">
                      {isVerifyingEmailCode ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                      {isVerifyingEmailCode ? '登入中...' : '完成登入'}
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
                      {(isCompletingEmailLink || isRequestingEmailCode) ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                      {isCompletingLink
                        ? (isCompletingEmailLink ? '登入中...' : '完成舊登入連結')
                        : (isRequestingEmailCode ? '寄送中...' : '寄送驗證碼')}
                    </Button>
                  </form>
                )}
              </div>
            )}

            {status && (
              <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200" role="status" aria-live="polite">
                {status}
              </p>
            )}
            {error && (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200" role="alert">
                {error}
              </p>
            )}
            <p className="tp-auth-privacy-note">
              登入前請閱讀<Link to="/privacy">隱私權政策</Link>，了解資料儲存、共享與責任歸屬。
            </p>
          </Card>
          <aside className="tp-auth-atlas-preview tp-auth-story-preview" aria-label="Trip Planner 工作台摘要">
            <div className="tp-auth-preview-map" aria-hidden="true">
              <span className="tp-auth-route-dot" />
              <span className="tp-auth-route-dot" />
              <span className="tp-auth-route-dot" />
            </div>

            <div className="tp-auth-preview-copy">
            <p className="tp-auth-preview-kicker">YOUR NEXT JOURNEY</p>
              <h2>一起計畫，也一起期待。</h2>
            <p>
              登入後接續管理行程、地點、購物清單、記帳、行李與智慧旅伴提醒。
            </p>
            </div>

            <div className="tp-auth-preview-metrics">
              <div>
                <span>行程</span>
                <strong>日期與待辦</strong>
              </div>
              <div>
                <span>地點</span>
                <strong>路線與清單</strong>
              </div>
              <div>
                <span>同行</span>
                <strong>共享與分帳</strong>
              </div>
            </div>

            <div className="tp-auth-preview-list">
              <div>
                <CalendarDays size={18} />
                <span>每日行程與待辦集中管理</span>
              </div>
              <div>
                <MapPinned size={18} />
                <span>地點、時間與路線視覺化整理</span>
              </div>
              <div>
                <UsersRound size={18} />
                <span>和旅伴同步購物、記帳與行李</span>
              </div>
              <div>
                <Sparkles size={18} />
                <span>AI 旅伴協助補齊推薦與提醒</span>
              </div>
            </div>
          </aside>
        </section>
      </PageContainer>
    </main>
  );
};

export default LoginPage;
