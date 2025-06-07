import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAppContext } from '../context/AppContext';
import { Bot } from 'lucide-react';
import { logger } from '../utils/logger';
import { useNavigate, useLocation } from 'react-router-dom';

interface AuthFormData {
  email: string;
  password: string;
  confirmPassword: string;
  verificationCode: string;
}

const Auth: React.FC = () => {
  logger.log('渲染认证组件');
  const { language } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  
  // 添加调试日志
  console.log('🌐 Auth组件当前语言状态:', language);
  console.log('📍 当前路径:', location.pathname);
  
  // 多语言文案配置
  const content = {
    zh: {
      loginTitle: '登录账号',
      registerTitle: '创建账号',
      verifyTitle: '验证邮箱',
      noAccount: '还没有账号？',
      hasAccount: '已有账号？',
      registerNow: '立即注册',
      loginNow: '立即登录',
      verifyDesc: '请输入发送到您邮箱的验证码',
      emailPlaceholder: '邮箱地址',
      passwordPlaceholder: '密码',
      confirmPasswordPlaceholder: '确认密码',
      verificationCodePlaceholder: '请输入验证码',
      processing: '处理中...',
      login: '登录',
      register: '注册',
      verify: '验证邮箱',
      codeSentTo: '验证码已发送至',
      sending: '发送中...',
      resend: '重新发送',
      resendAfter: '秒后重发',
      emailOrPasswordError: '邮箱或密码错误',
      passwordMismatch: '两次输入的密码不一致',
      passwordTooShort: '密码长度至少为6位',
      registerFailed: '注册失败，请稍后重试',
      codeResent: '验证码已重新发送',
      sendCodeFailed: '发送验证码失败，请稍后重试',
      invalidCode: '验证码无效或已过期'
    },
    en: {
      loginTitle: 'Sign In',
      registerTitle: 'Create Account',
      verifyTitle: 'Verify Email',
      noAccount: 'Don\'t have an account?',
      hasAccount: 'Already have an account?',
      registerNow: 'Sign Up',
      loginNow: 'Sign In',
      verifyDesc: 'Please enter the verification code sent to your email',
      emailPlaceholder: 'Email address',
      passwordPlaceholder: 'Password',
      confirmPasswordPlaceholder: 'Confirm password',
      verificationCodePlaceholder: 'Enter verification code',
      processing: 'Processing...',
      login: 'Sign In',
      register: 'Sign Up',
      verify: 'Verify Email',
      codeSentTo: 'Code sent to',
      sending: 'Sending...',
      resend: 'Resend',
      resendAfter: 's until resend',
      emailOrPasswordError: 'Invalid email or password',
      passwordMismatch: 'Passwords do not match',
      passwordTooShort: 'Password must be at least 6 characters',
      registerFailed: 'Registration failed, please try again',
      codeResent: 'Verification code resent',
      sendCodeFailed: 'Failed to send verification code, please try again',
      invalidCode: 'Invalid or expired verification code'
    }
  };
  
  const t = content[language];
  console.log('📝 当前使用的文案语言:', language, Object.keys(t).length, '项文案');

  const initialAuthMode = location.pathname === '/register' ? 'register' : 'login';
  const [authMode, setAuthMode] = useState<'login' | 'register'>(initialAuthMode);
  const [formData, setFormData] = useState<AuthFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    verificationCode: ''
  });
  const [showVerification, setShowVerification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // 添加倒计时效果
  React.useEffect(() => {
    let timer: number;
    if (countdown > 0) {
      timer = window.setInterval(() => {
        setCountdown(c => c - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });
      
      if (error) {
        throw error;
      } else {
        logger.log('登录成功，准备跳转');
        const from = location.state?.from || location.pathname;
        if (from === '/login' || from === '/register') {
          navigate('/dashboard', { replace: true });
        } else {
          navigate(from, { replace: true });
        }
      }
    } catch (error) {
      setError(t.emailOrPasswordError);
      logger.error('邮箱登录失败', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (countdown > 0) {
      setError(`Please wait ${countdown} seconds before sending code again`);
      return;
    }

    setIsLoading(true);

    try {
      if (formData.password !== formData.confirmPassword) {
        throw new Error(t.passwordMismatch);
      }

      if (formData.password.length < 6) {
        throw new Error(t.passwordTooShort);
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: formData.email,
        password: formData.password
      });

      if (error) throw error;

      setShowVerification(true);
      setCountdown(60);
    } catch (error) {
      setError(error instanceof Error ? error.message : t.registerFailed);
      logger.error('注册失败', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) {
      setError(`Please wait ${countdown} seconds before sending code again`);
      return;
    }

    setIsResending(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: formData.email,
        password: formData.password
      });

      if (error) throw error;

      setCountdown(60);
      setError(t.codeResent);
    } catch (error) {
      setError(t.sendCodeFailed);
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: formData.email,
        token: formData.verificationCode,
        type: 'signup',
      });

      if (error) {
        throw error;
      } else {
        logger.log('邮箱验证成功，准备跳转');
        const from = location.state?.from || location.pathname;
        if (from === '/login' || from === '/register') {
          navigate('/dashboard', { replace: true });
        } else {
          navigate(from, { replace: true });
        }
      }
    } catch (error) {
      setError(t.invalidCode);
      logger.error('验证码验证失败', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center mb-6">
            <Bot className="h-12 w-12 text-indigo-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {showVerification ? t.verifyTitle : 
              authMode === 'login' ? t.loginTitle : t.registerTitle}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {showVerification ? t.verifyDesc :
              authMode === 'login' ? (
                <>
                  {t.noAccount}
                  <button
                    onClick={() => setAuthMode('register')}
                    className="ml-1 font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    {t.registerNow}
                  </button>
                </>
              ) : (
                <>
                  {t.hasAccount}
                  <button
                    onClick={() => setAuthMode('login')}
                    className="ml-1 font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    {t.loginNow}
                  </button>
                </>
              )
            }
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={showVerification ? handleVerifyEmail : 
          authMode === 'login' ? handleEmailLogin : handleRegister}>
          <div className="rounded-md shadow-sm -space-y-px">
            {showVerification ? (
              <div>
                <label htmlFor="verification-code" className="sr-only">
                  {t.verificationCodePlaceholder}
                </label>
                <input
                  id="verification-code"
                  name="verificationCode"
                  type="text"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder={t.verificationCodePlaceholder}
                  value={formData.verificationCode}
                  onChange={handleInputChange}
                />
                <div className="mt-2 flex justify-between items-center text-sm">
                  <span className="text-gray-500">
                    {t.codeSentTo} {formData.email}
                  </span>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={countdown > 0 || isResending}
                    className={`text-indigo-600 hover:text-indigo-500 ${
                      (countdown > 0 || isResending) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isResending ? t.sending : 
                     countdown > 0 ? `${countdown}${t.resendAfter}` : 
                     t.resend}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="email" className="sr-only">
                    {t.emailPlaceholder}
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="appearance-none rounded-t-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder={t.emailPlaceholder}
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label htmlFor="password" className="sr-only">
                    {t.passwordPlaceholder}
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                    required
                    className={`appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                      authMode === 'register' ? '' : 'rounded-b-md'
                    }`}
                    placeholder={t.passwordPlaceholder}
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                </div>
                {authMode === 'register' && (
                  <div>
                    <label htmlFor="confirm-password" className="sr-only">
                      {t.confirmPasswordPlaceholder}
                    </label>
                    <input
                      id="confirm-password"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      className="appearance-none rounded-b-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder={t.confirmPasswordPlaceholder}
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                isLoading ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? t.processing : 
                showVerification ? t.verify :
                authMode === 'login' ? t.login : t.register}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Auth