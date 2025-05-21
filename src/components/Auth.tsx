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
  const { language, setLanguage } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
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
        // 获取之前的路径或默认到首页
        const from = location.state?.from || '/';
        navigate(from, { replace: true });
      }
    } catch (error) {
      setError('邮箱或密码错误');
      logger.error('邮箱登录失败', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (countdown > 0) {
      setError(`请等待 ${countdown} 秒后再次发送验证码`);
      return;
    }

    setIsLoading(true);

    try {
      if (formData.password !== formData.confirmPassword) {
        throw new Error('两次输入的密码不一致');
      }

      if (formData.password.length < 6) {
        throw new Error('密码长度至少为6位');
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: formData.email,
        password: formData.password
      });

      if (error) throw error;

      setShowVerification(true);
      setCountdown(60);
    } catch (error) {
      setError(error instanceof Error ? error.message : '注册失败，请稍后重试');
      logger.error('注册失败', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) {
      setError(`请等待 ${countdown} 秒后再次发送验证码`);
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
      setError('验证码已重新发送');
    } catch (error) {
      setError('发送验证码失败，请稍后重试');
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
        navigate('/', { replace: true });
      }
    } catch (error) {
      setError('验证码无效或已过期');
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
            {showVerification ? '验证邮箱' : 
              authMode === 'login' ? '登录账号' : '创建账号'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {showVerification ? '请输入发送到您邮箱的验证码' :
              authMode === 'login' ? (
                <>
                  还没有账号？
                  <button
                    onClick={() => setAuthMode('register')}
                    className="ml-1 font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    立即注册
                  </button>
                </>
              ) : (
                <>
                  已有账号？
                  <button
                    onClick={() => setAuthMode('login')}
                    className="ml-1 font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    立即登录
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
                  验证码
                </label>
                <input
                  id="verification-code"
                  name="verificationCode"
                  type="text"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="请输入验证码"
                  value={formData.verificationCode}
                  onChange={handleInputChange}
                />
                <div className="mt-2 flex justify-between items-center text-sm">
                  <span className="text-gray-500">
                    验证码已发送至 {formData.email}
                  </span>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={countdown > 0 || isResending}
                    className={`text-indigo-600 hover:text-indigo-500 ${
                      (countdown > 0 || isResending) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isResending ? '发送中...' : 
                     countdown > 0 ? `${countdown}秒后重发` : 
                     '重新发送'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="email" className="sr-only">
                    邮箱地址
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="appearance-none rounded-t-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="邮箱地址"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label htmlFor="password" className="sr-only">
                    密码
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
                    placeholder="密码"
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                </div>
                {authMode === 'register' && (
                  <div>
                    <label htmlFor="confirm-password" className="sr-only">
                      确认密码
                    </label>
                    <input
                      id="confirm-password"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      className="appearance-none rounded-b-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="确认密码"
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
              {isLoading ? '处理中...' : 
                showVerification ? '验证邮箱' :
                authMode === 'login' ? '登录' : '注册'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


export default Auth