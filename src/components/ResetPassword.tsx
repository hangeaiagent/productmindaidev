import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAppContext } from '../context/AppContext';
import { Lock, CheckCircle, AlertTriangle, Languages } from 'lucide-react';
import { logger } from '../utils/logger';
import ProductMindLogo from './ProductMindLogo';

const ResetPassword: React.FC = () => {
  const { language, setLanguage } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hasValidSession, setHasValidSession] = useState(false);
  const [resetCode, setResetCode] = useState<string | null>(null);

  // 调试日志：打印所有URL信息
  console.log('🔧 [ResetPassword] URL信息:', {
    href: window.location.href,
    hash: window.location.hash,
    search: window.location.search,
    pathname: window.location.pathname,
    searchParams: Object.fromEntries(searchParams.entries())
  });

  // 直接从URL获取code参数进行测试
  const urlCode = new URLSearchParams(window.location.search).get('code');
  console.log('🔧 [ResetPassword] 直接解析code参数:', {
    urlCode,
    hasUrlCode: !!urlCode,
    searchParamsCode: searchParams.get('code'),
    hasSearchParamsCode: !!searchParams.get('code')
  });

  // 多语言文案
  const texts = {
    zh: {
      title: '重置密码',
      subtitle: '请设置您的新密码',
      newPassword: '新密码',
      confirmPassword: '确认密码',
      resetButton: '重置密码',
      processing: '处理中...',
      success: '密码重置成功',
      successDesc: '您的密码已成功重置，即将跳转到登录页面',
      backToLogin: '返回登录',
      passwordMismatch: '两次输入的密码不一致',
      passwordTooShort: '密码长度至少为6位',
      resetFailed: '密码重置失败，请重试',
      invalidLink: '重置链接无效或已过期',
      linkExpired: '重置链接已过期，请重新申请密码重置'
    },
    en: {
      title: 'Reset Password',
      subtitle: 'Please set your new password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm Password',
      resetButton: 'Reset Password',
      processing: 'Processing...',
      success: 'Password Reset Successful',
      successDesc: 'Your password has been successfully reset. Redirecting to login page...',
      backToLogin: 'Back to Login',
      passwordMismatch: 'Passwords do not match',
      passwordTooShort: 'Password must be at least 6 characters',
      resetFailed: 'Password reset failed, please try again',
      invalidLink: 'Invalid or expired reset link',
      linkExpired: 'Reset link has expired, please request a new password reset'
    }
  };

  const t = texts[language];

  // 语言切换功能
  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'zh' : 'en');
  };

  // 检查并处理认证会话
  useEffect(() => {
    const initializeSession = async () => {
      try {
        console.log('🔧 [ResetPassword] 开始初始化重置会话');
        
        // 优先检查code参数，这是最常见的密码重置场景
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        console.log('🔧 [ResetPassword] 参数检查:', {
          code: code,
          hasCode: !!code,
          urlSearch: window.location.search,
          urlHref: window.location.href
        });

        if (code) {
          console.log('🔧 [ResetPassword] 检测到code参数，清理URL避免Supabase自动处理');
          
          // 清理URL，避免Supabase继续尝试自动处理code参数
          // 保存code到组件状态，然后清理URL
          const currentCode = code;
          
          // 清理URL中的code参数
          const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
          window.history.replaceState({}, '', newUrl);
          
          console.log('🔧 [ResetPassword] URL已清理，保存code用于密码重置');
          logger.log('检测到code参数，已保存用于密码重置', { code: currentCode.substring(0, 8) + '...' });
          
          // 将code保存到状态中供后续使用
          setResetCode(currentCode);
          setHasValidSession(true);
          return;
        }

        // 如果没有code，检查其他认证方式
        const { data: authData, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          logger.error('获取会话失败', authError);
        }

        if (authData.session) {
          console.log('🔧 [ResetPassword] 找到现有Supabase会话');
          logger.log('找到有效会话', { 
            hasSession: true,
            userId: authData.session.user?.id 
          });
          setHasValidSession(true);
          return;
        }

        // 检查hash中的认证参数
        if (window.location.hash.includes('access_token') || 
            window.location.hash.includes('recovery')) {
          console.log('🔧 [ResetPassword] 检测到hash中的认证参数');
          logger.log('检测到hash中的认证参数，等待Supabase自动处理');
          
          // 给Supabase一些时间处理URL hash
          setTimeout(async () => {
            const { data: delayedSession } = await supabase.auth.getSession();
            if (delayedSession.session) {
              console.log('🔧 [ResetPassword] 延迟检测到有效会话');
              logger.log('延迟检测到有效会话');
              setHasValidSession(true);
            } else {
              console.log('🔧 [ResetPassword] 延迟检测仍未找到有效会话');
              logger.warn('延迟检测仍未找到有效会话');
              setError(t.invalidLink);
            }
          }, 1000);
          return;
        }

        // 如果以上都没有，则认为链接无效
        console.log('🔧 [ResetPassword] 未找到任何有效的认证参数');
        logger.warn('未找到有效的认证参数', {
          url: window.location.href,
          hasHash: !!window.location.hash,
          hasSearch: !!window.location.search
        });
        setError(t.invalidLink);

      } catch (err) {
        console.error('🔧 [ResetPassword] 会话初始化异常:', err);
        logger.error('会话初始化异常', err);
        setError(t.invalidLink);
      }
    };

    initializeSession();
  }, [t.invalidLink]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 验证密码
    if (password.length < 6) {
      setError(t.passwordTooShort);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔧 [ResetPassword] 开始密码重置处理', {
        hasResetCode: !!resetCode,
        resetCodeLength: resetCode?.length
      });

      if (resetCode) {
        // 使用保存的resetCode进行密码重置
        logger.log('使用resetCode重置密码', { hasCode: !!resetCode });
        console.log('🔧 [ResetPassword] 使用verifyOtp验证resetCode');
        
        const result = await supabase.auth.verifyOtp({
          token: resetCode,
          type: 'recovery'
        });
        
        if (result.error) {
          console.error('🔧 [ResetPassword] verifyOtp失败:', result.error);
          throw result.error;
        }

        console.log('🔧 [ResetPassword] verifyOtp成功，开始更新密码');
        
        // 验证成功后更新密码
        const updateResult = await supabase.auth.updateUser({
          password: password
        });

        if (updateResult.error) {
          console.error('🔧 [ResetPassword] 密码更新失败:', updateResult.error);
          throw updateResult.error;
        }

        console.log('🔧 [ResetPassword] 密码更新成功');
      } else {
        // 如果没有resetCode，直接更新密码（适用于已登录的会话）
        logger.log('直接更新密码（会话模式）');
        console.log('🔧 [ResetPassword] 使用会话模式更新密码');
        
        const result = await supabase.auth.updateUser({
          password: password
        });

        if (result.error) {
          console.error('🔧 [ResetPassword] 会话模式密码更新失败:', result.error);
          throw result.error;
        }

        console.log('🔧 [ResetPassword] 会话模式密码更新成功');
      }

      setSuccess(true);
      logger.log('密码重置成功');

      // 3秒后跳转到登录页面
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (error) {
      logger.error('密码重置失败', error);
      setError(t.resetFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#4F8CFF] via-[#A259FF] to-[#6A82FB] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <ProductMindLogo size={64} className="drop-shadow-2xl animate-pulse" />
            </div>
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">{t.success}</h2>
            <p className="text-white/80 mb-6">{t.successDesc}</p>
            <button
              onClick={handleBackToLogin}
              className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition font-medium"
            >
              {t.backToLogin}
            </button>
          </div>
        </div>
      </div>
    );
  }

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
              {t.title}
            </span>
          </h2>
          <p className="text-lg text-white/80 mb-6 drop-shadow">
            {t.subtitle}
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
            <div className="bg-red-500/20 border border-red-400/30 text-red-100 px-4 py-3 rounded-lg mb-6 backdrop-blur-sm flex items-center">
              <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!hasValidSession ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <p className="text-white/90 mb-6">{t.linkExpired}</p>
              <button
                onClick={handleBackToLogin}
                className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg hover:from-yellow-500 hover:to-orange-600 transition font-medium"
              >
                {t.backToLogin}
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              {/* New Password */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-white/60" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm placeholder-white/60 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder={t.newPassword}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {/* Confirm Password */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-white/60" />
                </div>
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm placeholder-white/60 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder={t.confirmPassword}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`group relative w-full flex justify-center items-center space-x-2 py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 transition shadow-lg ${
                  isLoading ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>
                  {isLoading ? t.processing : t.resetButton}
                </span>
              </button>
            </form>
          )}

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <button
              onClick={handleBackToLogin}
              className="text-white/70 hover:text-white transition text-sm"
            >
              ← {t.backToLogin}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;