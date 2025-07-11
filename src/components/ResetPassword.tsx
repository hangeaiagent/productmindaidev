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
  // 调试日志：打印所有URL信息
  console.log('🔧 [ResetPassword] URL信息:', {
    href: window.location.href,
    hash: window.location.hash,
    search: window.location.search,
    pathname: window.location.pathname,
    searchParams: Object.fromEntries(searchParams.entries())
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
        
        // 检查URL中的hash参数，这是Supabase密码重置的标准流程
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        
        console.log('🔧 [ResetPassword] Hash参数检查:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          type: type,
          fullHash: window.location.hash
        });

        // 检查是否是密码重置类型的链接
        if (type === 'recovery' && accessToken) {
          console.log('🔧 [ResetPassword] 检测到密码重置链接');
          logger.log('检测到密码重置链接', { type });
          
          // 让Supabase处理hash参数并建立会话
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('🔧 [ResetPassword] 获取会话失败:', sessionError);
            logger.error('获取会话失败', sessionError);
            setError(t.invalidLink);
            return;
          }

          if (sessionData.session) {
            console.log('🔧 [ResetPassword] 密码重置会话已建立');
            logger.log('密码重置会话已建立', { 
              userId: sessionData.session.user?.id,
              type: sessionData.session.user?.app_metadata?.provider
            });
            setHasValidSession(true);
            return;
          }

          // 如果没有立即获取到会话，稍等一下再试
          setTimeout(async () => {
            const { data: delayedSession } = await supabase.auth.getSession();
            if (delayedSession.session) {
              console.log('🔧 [ResetPassword] 延迟检测到密码重置会话');
              logger.log('延迟检测到密码重置会话');
              setHasValidSession(true);
            } else {
              console.log('🔧 [ResetPassword] 延迟检测仍未找到有效会话');
              logger.warn('延迟检测仍未找到有效会话');
              setError(t.invalidLink);
            }
          }, 2000);
          return;
        }

        // 如果没有在hash中找到重置参数，检查是否有现有的会话
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
      console.log('🔧 [ResetPassword] 开始密码重置处理');
      
      // 检查当前会话状态
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('🔧 [ResetPassword] 获取会话失败:', sessionError);
        throw new Error(t.invalidLink);
      }

      if (!sessionData.session) {
        console.error('🔧 [ResetPassword] 没有有效的会话');
        throw new Error(t.invalidLink);
      }

      console.log('🔧 [ResetPassword] 使用会话更新密码');
      logger.log('使用会话更新密码', { 
        userId: sessionData.session.user?.id,
        sessionValid: !!sessionData.session 
      });
      
      // 使用当前会话更新密码
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        console.error('🔧 [ResetPassword] 密码更新失败:', updateError);
        throw updateError;
      }

      console.log('🔧 [ResetPassword] 密码更新成功');
      logger.log('密码重置成功');

      setSuccess(true);

      // 3秒后跳转到登录页面
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (error) {
      console.error('🔧 [ResetPassword] 密码重置失败:', error);
      logger.error('密码重置失败', error);
      
      // 根据错误类型提供更具体的错误信息
      if (error instanceof Error) {
        if (error.message.includes('Invalid or expired')) {
          setError(language === 'zh' ? 
            '重置链接已过期或无效，请重新申请密码重置' : 
            'Reset link has expired or is invalid, please request a new password reset');
        } else if (error.message.includes('weak')) {
          setError(language === 'zh' ? 
            '密码强度不够，请使用更强的密码' : 
            'Password is too weak, please use a stronger password');
        } else if (error.message.includes('same')) {
          setError(language === 'zh' ? 
            '新密码不能与旧密码相同' : 
            'New password cannot be the same as the old password');
        } else {
          setError(`${t.resetFailed}: ${error.message}`);
        }
      } else {
        setError(t.resetFailed);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  const handleRequestNewReset = () => {
    // 跳转到登录页面并自动触发忘记密码流程
    navigate('/login', { state: { showForgotPassword: true } });
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
            <div className="bg-red-500/20 border border-red-400/30 text-red-100 px-4 py-3 rounded-lg mb-6 backdrop-blur-sm">
              <div className="flex items-center mb-3">
                <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0" />
                <span>{error}</span>
              </div>
              {(error.includes('已过期') || error.includes('已使用') || error.includes('expired') || error.includes('used')) && (
                <button
                  onClick={handleRequestNewReset}
                  className="w-full mt-3 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition font-medium"
                >
                  {language === 'zh' ? '重新申请密码重置' : 'Request New Password Reset'}
                </button>
              )}
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