import React from 'react';
import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Auth from './components/Auth';
import ResetPassword from './components/ResetPassword';
import HomePage from './components/HomePage';
import AIProductsPage from './components/AIProductsPage';
import { Toaster } from 'react-hot-toast';

// 受保护的路由组件
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // 保存当前路径以便登录后跳转
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <Router>
        <AuthProvider>
          <AppProvider>
            <Routes>
              <Route path="/login" element={<Auth />} />
              <Route path="/register" element={<Auth />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />

              {/* 首页 */}
              <Route path="/" element={<HomePage />} />

              {/* 产品管理 Dashboard 页面 - 需要登录验证 */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <div className="flex flex-col min-h-screen">
                      <Header />
                      <div className="flex flex-1">
                        <Sidebar />
                        <Dashboard />
                      </div>
                    </div>
                  </ProtectedRoute>
                }
              />

              {/* AI 产品参考页面 */}
              <Route path="/ai-products" element={<AIProductsPage />} />
              <Route path="/ai-products/:categoryCode" element={<AIProductsPage />} />

              {/* 404 */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppProvider>
        </AuthProvider>
      </Router>
    </>
  );
}

export default App;