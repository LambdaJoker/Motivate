import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Space, Dropdown, Avatar, message, ConfigProvider } from 'antd';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { CompassOutlined, CalendarOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { jwtDecode } from 'jwt-decode';

const { Header } = Layout;

const AppHeader = ({ isAuthenticated, setIsAuthenticated }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const decoded = jwtDecode(token);
          setUsername(decoded.username);
        } catch (error) {
          console.error("Invalid token:", error);
          // 如果 token 解析失败直接清除并跳转
          localStorage.removeItem('token');
          setIsAuthenticated(false);
          navigate('/login');
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    message.success('您已成功退出登录');
    navigate('/login');
  };

  const menuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    }
  ];

  const mainMenuItems = [];

  return (
    <Header className="app-header" style={{ padding: 0, background: '#ffffff', position: 'sticky', top: 0, zIndex: 1000, borderBottom: '1px solid #dadce0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-color)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <CompassOutlined style={{ fontSize: 18 }} />
          </div>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.025em', color: '#202124' }}>TripAgent</h1>
          </Link>
        </div>
        
        <div style={{ flex: 1 }}></div>
        
        <Space size={16}>
          {isAuthenticated ? (
            <Dropdown menu={{ items: menuItems }} placement="bottomRight">
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px 8px', borderRadius: 20, transition: 'background-color 0.2s', background: 'rgba(0, 0, 0, 0.04)' }}>
                <Avatar icon={<UserOutlined />} style={{ marginRight: 8, backgroundColor: 'var(--primary-color)', color: '#ffffff' }}/>
                <span style={{ color: '#111827', fontWeight: 500 }}>{username}</span>
              </div>
            </Dropdown>
          ) : (
            <>
              <Button type="text" onClick={() => navigate('/login')} style={{ fontWeight: 500, color: '#4B5563' }}>
                登录
              </Button>
              <Button type="primary" onClick={() => navigate('/register')} style={{ fontWeight: 500, borderRadius: 20, boxShadow: 'none' }}>
                注册
              </Button>
            </>
          )}
        </Space>
      </div>
    </Header>
  );
};

export default AppHeader; 