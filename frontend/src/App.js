/*
 * @Author: taotaozi-pro 2667534364@qq.com
 * @Date: 2025-06-25 17:34:24
 * @LastEditors: taotaozi-pro 2667534364@qq.com
 * @LastEditTime: 2026-05-06 00:10:35
 * @FilePath: \TripAgent\frontend\src\App.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Layout, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import './App.css';

// Pages
import GenerateItineraryPage from './pages/GenerateItineraryPage';
import ItineraryDetailPage from './pages/ItineraryDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Components
import AppHeader from './components/AppHeader';
import AppSidebar from './components/AppSidebar';
import ProtectedRoute from './components/ProtectedRoute';

const { Content, Footer } = Layout;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    const handleStorageChange = () => {
      setIsAuthenticated(!!localStorage.getItem('token'));
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    if (!process.env.REACT_APP_AMAP_KEY) {
      console.warn('未设置高德地图API密钥，地图功能可能无法正常使用');
    }
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <ConfigProvider locale={zhCN} theme={{
      token: {
        colorPrimary: '#1a73e8',
        borderRadius: 12,
        fontFamily: "'Google Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        colorBgContainer: '#ffffff',
        colorBgLayout: '#f8f9fa',
        colorText: '#202124',
        colorTextSecondary: '#5f6368',
      },
      components: {
        Card: {
          borderRadiusLG: 16,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        },
        Button: {
          borderRadius: 24,
          controlHeight: 40,
        },
        Input: {
          borderRadius: 12,
          controlHeight: 48,
        },
        Select: {
          borderRadius: 12,
          controlHeight: 48,
        },
        Tabs: {
          itemColor: '#5f6368',
          itemSelectedColor: '#1a73e8',
          itemHoverColor: '#1a73e8',
          titleFontSize: 16,
        }
      }
    }}>
      <AntdApp>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Layout className="app-layout">
            <AppHeader isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />
            <Layout style={{ flexDirection: 'row', minHeight: 'calc(100vh - 64px)' }}>
              {isAuthenticated && <AppSidebar />}
              <Content className="app-content">
                <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={<LoginPage setIsAuthenticated={setIsAuthenticated} />} />
                  <Route path="/register" element={<RegisterPage />} />

                  {/* Protected Routes */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/generate" element={<GenerateItineraryPage />} />
                    <Route path="/itinerary/:id" element={<ItineraryDetailPage />} />
                  </Route>
                  
                  {/* Redirect root path */}
                  <Route 
                    path="/" 
                    element={<Navigate replace to={isAuthenticated ? "/generate" : "/login"} />} 
                  />
                </Routes>
              </Content>
            </Layout>
          </Layout>
        </Router>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
