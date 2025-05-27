import React from 'react';
import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Auth from './components/Auth';
import HomePage from './components/HomePage';
import AIProductsPage from './components/AIProductsPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppProvider>
          <Routes>
            <Route path="/login" element={<Auth />} />
            <Route path="/register" element={<Auth />} />

            {/* 首页 */}
            <Route path="/" element={<HomePage />} />

            {/* 产品管理 Dashboard 页面 */}
            <Route
              path="/dashboard"
              element={
                <div className="flex flex-col min-h-screen">
                  <Header />
                  <div className="flex flex-1">
                    <Sidebar />
                    <Dashboard />
                  </div>
                </div>
              }
            />

            {/* AI 产品参考页面 */}
            <Route path="/ai-products" element={<AIProductsPage />} />

            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;