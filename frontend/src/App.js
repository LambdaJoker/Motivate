/*
 * @Author: taotaozi-pro 2667534364@qq.com
 * @Date: 2025-06-25 17:34:24
 * @LastEditors: taotaozi-pro 2667534364@qq.com
 * @LastEditTime: 2025-06-30 09:23:05
 * @FilePath: \Motivate\frontend\src\App.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Layout, message } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import './App.css';

// Pages
import GenerateItineraryPage from './pages/GenerateItineraryPage';
import ItineraryDetailPage from './pages/ItineraryDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Components
import AppHeader from './components/AppHeader';
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
      message.warning('未设置高德地图API密钥，地图功能可能无法正常使用');
    }
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <ConfigProvider locale={zhCN} theme={{
      token: {
        colorPrimary: '#1890ff',
        borderRadius: 6,
      },
    }}>
      <Router>
        <Layout className="app-layout">
          <AppHeader isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />
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
          <Footer style={{ textAlign: 'center' }}>
            旅行攻略规划 ©{new Date().getFullYear()} 为爱而创
          </Footer>
        </Layout>
      </Router>
    </ConfigProvider>
  );
}

export default App;
