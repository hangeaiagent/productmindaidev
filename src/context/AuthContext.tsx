import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import type { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  signIn: async () => {},
  signOut: async () => {},
  error: null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        logger.log('检查用户认证状态');
        setError(null);
        
        // 首先检查本地存储中的会话
        const session = await supabase.auth.getSession();
        logger.debug('获取到会话', { hasSession: !!session.data.session });
        
        if (!session.data.session) {
          logger.log('未找到有效会话');
          setUser(null);
          setIsAuthenticated(false);
          return;
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          logger.error('获取用户信息失败', userError);
          throw userError;
        }
        
        logger.log('用户认证状态检查完成', { 
          authenticated: !!user,
          userId: user?.id 
        });
        
        setUser(user);
        setIsAuthenticated(!!user);
      } catch (err) {
        logger.error('认证状态检查失败', err);
        setError('认证状态检查失败，请刷新页面重试');
        setUser(null);
        setIsAuthenticated(false);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.log('认证状态变更', { event, hasSession: !!session });
      
      try {
        setUser(session?.user ?? null);
        setIsAuthenticated(!!session?.user);
        setError(null);
        
        if (event === 'SIGNED_IN') {
          logger.log('用户已登录', { userId: session?.user?.id });
          navigate('/', { replace: true });
        } else if (event === 'SIGNED_OUT') {
          logger.log('用户已登出');
          navigate('/login', { replace: true });
        }
      } catch (err) {
        logger.error('认证状态更新失败', err);
        setError('认证状态更新失败，请刷新页面重试');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '登录失败，请重试';
      setError(errorMessage);
      throw err;
    }
  };

  const handleSignOut = async () => {
    try {
      setError(null);
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      setUser(null);
      setIsAuthenticated(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '退出登录失败，请重试';
      setError(errorMessage);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      signIn, 
      signOut: handleSignOut,
      error 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;