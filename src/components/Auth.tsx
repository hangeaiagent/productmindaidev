import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAppContext } from '../context/AppContext';
import { LogIn, UserPlus, Mail, Lock, Shield, Languages } from 'lucide-react';
import { logger } from '../utils/logger';
import { useNavigate, useLocation } from 'react-router-dom';
import ProductMindLogo from './ProductMindLogo';

interface AuthFormData {
  email: string;
  password: string;
  confirmPassword: string;
  verificationCode: string;
}

const Auth: React.FC = () => {
  logger.log('渲染认证组件');
  const { language, setLanguage } = useAppContext();
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
      invalidCode: '验证码无效或已过期',
      backToHome: '返回首页',
      welcomeBack: '欢迎回来',
      joinUs: '加入我们',
      forgotPassword: '忘记密码？',
      resetPassword: '重置密码',
      resetPasswordTitle: '重置密码',
      resetPasswordDesc: '请输入您的邮箱地址，我们将发送重置密码的链接到您的邮箱',
      sendResetLink: '发送重置链接',
      resetLinkSent: '重置链接已发送',
      resetLinkSentDesc: '重置密码的链接已发送到您的邮箱，请查收邮件并按照提示操作',
      backToLogin: '返回登录',
      resetSuccess: '密码重置成功',
      resetFailed: '重置失败，请稍后重试',
      newPassword: '新密码',
      confirmNewPassword: '确认新密码',
      resetPasswordButton: '重置密码',
      passwordResetEmailSent: '密码重置邮件已发送'
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
      invalidCode: 'Invalid or expired verification code',
      backToHome: 'Back to Home',
      welcomeBack: 'Welcome Back',
      joinUs: 'Join Us',
      forgotPassword: 'Forgot password?',
      resetPassword: 'Reset Password',
      resetPasswordTitle: 'Reset Password',
      resetPasswordDesc: 'Enter your email address and we will send you a link to reset your password',
      sendResetLink: 'Send Reset Link',
      resetLinkSent: 'Reset Link Sent',
      resetLinkSentDesc: 'A password reset link has been sent to your email. Please check your inbox and follow the instructions',
      backToLogin: 'Back to Login',
      resetSuccess: 'Password reset successful',
      resetFailed: 'Reset failed, please try again',
      newPassword: 'New Password',
      confirmNewPassword: 'Confirm New Password',
      resetPasswordButton: 'Reset Password',
      passwordResetEmailSent: 'Password reset email sent'
    }
  };
  
  const t = content[language];
  console.log('📝 当前使用的文案语言:', language, Object.keys(t).length, '项文案');

  const initialAuthMode = location.pathname === '/register' ? 'register' : 'login';
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'resetPassword' | 'resetSent'>(initialAuthMode);
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

  // 语言切换功能
  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'zh' : 'en');
  };

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
        logger.log('登录成功，准备跳转到dashboard');
        // 登录成功后始终跳转到dashboard
        navigate('/dashboard', { replace: true });
      }
    } catch (error) {
      setError(t.emailOrPasswordError);
      logger.error('邮箱登录失败', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!formData.email) {
        throw new Error(language === 'zh' ? '请输入邮箱地址' : 'Please enter your email address');
      }

      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      setAuthMode('resetSent');
      logger.log('密码重置邮件发送成功', { email: formData.email });
    } catch (error) {
      setError(error instanceof Error ? error.message : t.resetFailed);
      logger.error('密码重置失败', error);
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
        logger.log('邮箱验证成功，准备跳转到dashboard');
        // 验证成功后始终跳转到dashboard
        navigate('/dashboard', { replace: true });
      }
    } catch (error) {
      setError(t.invalidCode);
      logger.error('验证码验证失败', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4F8CFF] via-[#A259FF] to-[#6A82FB] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <ProductMindLogo size={64} className="drop-shadow-2xl animate-pulse" />
          </div>
          <h2 className="text-4xl font-extrabold text-white mb-2 drop-shadow-lg">
            <span className="bg-gradient-to-r from-yellow-200 via-white to-purple-200 bg-clip-text text-transparent">
              {showVerification ? t.verifyTitle : 
                authMode === 'resetPassword' ? t.resetPasswordTitle :
                authMode === 'resetSent' ? t.resetLinkSent :
                authMode === 'login' ? t.welcomeBack : t.joinUs}
            </span>
          </h2>
          <p className="text-lg text-white/80 mb-6 drop-shadow">
            {showVerification ? t.verifyDesc :
              authMode === 'resetPassword' ? t.resetPasswordDesc :
              authMode === 'resetSent' ? t.resetLinkSentDesc :
              authMode === 'login' ? t.loginTitle : t.registerTitle}
          </p>
        </div>

        {/* Language Toggle */}
        <div className="flex justify-center mb-6">
          <button
            onClick={toggleLanguage}
            className="flex items-center space-x-2 px-4 py-2 text-white bg-white/10 hover:bg-white/20 rounded-lg transition backdrop-blur-sm"
          >
            <Languages className="w-4 h-4" />
            <span className="text-sm">{language === 'en' ? '中文' : 'EN'}</span>
          </button>
        </div>

        {/* Main Form Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20">
          {error && (
            <div className="bg-red-500/20 border border-red-400/30 text-red-100 px-4 py-3 rounded-lg mb-6 backdrop-blur-sm">
              {error}
            </div>
          )}

          <form onSubmit={
            showVerification ? handleVerifyEmail : 
            authMode === 'resetPassword' ? handleForgotPassword :
            authMode === 'login' ? handleEmailLogin : 
            handleRegister
          } className="space-y-6">
            
            {showVerification ? (
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Shield className="h-5 w-5 text-white/60" />
                  </div>
                  <input
                    id="verification-code"
                    name="verificationCode"
                    type="text"
                    required
                    className="block w-full pl-10 pr-3 py-3 border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm placeholder-white/60 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    placeholder={t.verificationCodePlaceholder}
                    value={formData.verificationCode}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/70">
                    {t.codeSentTo} {formData.email}
                  </span>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={countdown > 0 || isResending}
                    className={`text-yellow-200 hover:text-yellow-100 font-medium ${
                      (countdown > 0 || isResending) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isResending ? t.sending : 
                     countdown > 0 ? `${countdown}${t.resendAfter}` : 
                     t.resend}
                  </button>
                </div>
              </div>
            ) : authMode === 'resetSent' ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-green-400" />
                </div>
                <p className="text-white/90 mb-2">{t.resetLinkSentDesc}</p>
                <p className="text-white/70 text-sm">{t.codeSentTo}: {formData.email}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-white/60" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="block w-full pl-10 pr-3 py-3 border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm placeholder-white/60 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    placeholder={t.emailPlaceholder}
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
                {authMode !== 'resetPassword' && (
                  <div className="space-y-2">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-white/60" />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                        required
                        className="block w-full pl-10 pr-3 py-3 border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm placeholder-white/60 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                        placeholder={t.passwordPlaceholder}
                        value={formData.password}
                        onChange={handleInputChange}
                      />
                    </div>
                    {authMode === 'login' && (
                      <div className="text-right">
                        <button
                          type="button"
                          onClick={() => setAuthMode('resetPassword')}
                          className="text-sm text-yellow-200 hover:text-yellow-100 transition font-medium"
                        >
                          {t.forgotPassword}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {authMode === 'register' && (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-white/60" />
                    </div>
                    <input
                      id="confirm-password"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      className="block w-full pl-10 pr-3 py-3 border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm placeholder-white/60 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                      placeholder={t.confirmPasswordPlaceholder}
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                    />
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center items-center space-x-2 py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 transition shadow-lg ${
                isLoading ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {authMode === 'login' ? <LogIn className="w-4 h-4" /> : 
               authMode === 'resetPassword' ? <Mail className="w-4 h-4" /> : 
               <UserPlus className="w-4 h-4" />}
              <span>
                {isLoading ? t.processing : 
                  showVerification ? t.verify :
                  authMode === 'resetPassword' ? t.sendResetLink :
                  authMode === 'login' ? t.login : t.register}
              </span>
            </button>
          </form>

          {/* Mode Switch */}
          {!showVerification && authMode !== 'resetSent' && (
            <div className="mt-6 text-center">
              {authMode === 'resetPassword' ? (
                <p className="text-white/70">
                  <button
                    onClick={() => setAuthMode('login')}
                    className="font-medium text-yellow-200 hover:text-yellow-100 transition"
                  >
                    ← {t.backToLogin}
                  </button>
                </p>
              ) : (
                <p className="text-white/70">
                  {authMode === 'login' ? t.noAccount : t.hasAccount}
                  <button
                    onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                    className="ml-2 font-medium text-yellow-200 hover:text-yellow-100 transition"
                  >
                    {authMode === 'login' ? t.registerNow : t.loginNow}
                  </button>
                </p>
              )}
            </div>
          )}

          {/* Reset Sent - Back to Login */}
          {authMode === 'resetSent' && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setAuthMode('login')}
                className="font-medium text-yellow-200 hover:text-yellow-100 transition"
              >
                ← {t.backToLogin}
              </button>
            </div>
          )}

          {/* Back to Home */}
          <div className="mt-6 text-center">
            <button
              onClick={handleBackToHome}
              className="text-white/70 hover:text-white transition text-sm"
            >
              ← {t.backToHome}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;