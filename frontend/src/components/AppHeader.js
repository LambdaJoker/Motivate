import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Space, Dropdown, Avatar, message, ConfigProvider } from 'antd';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { GiftOutlined, CalendarOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons';
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
  if (isAuthenticated) {
    mainMenuItems.push({
      key: '/generate',
      icon: <CalendarOutlined />,
      label: '创建攻略',
      onClick: () => navigate('/generate'),
    });
  }

  return (
    <Header className="app-header" style={{ padding: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <GiftOutlined style={{ fontSize: 24, color: '#ffffff', marginRight: 12 }} />
          <Link to="/" style={{ textDecoration: 'none' }}>
            <h1 style={{ color: '#ffffff', margin: 0, fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.025em' }}>Motivate旅行</h1>
          </Link>
        </div>
        
        <ConfigProvider theme={{
          components: {
            Menu: {
              itemColor: 'rgba(255, 255, 255, 0.7)',
              itemHoverColor: '#ffffff',
              itemSelectedColor: '#ffffff',
              horizontalItemSelectedColor: '#ffffff',
            }
          }
        }}>
          <Menu 
            mode="horizontal" 
            selectedKeys={[location.pathname]} 
            items={mainMenuItems}
            style={{ background: 'transparent', flex: 1, marginLeft: 40, borderBottom: 'none' }}
          />
        </ConfigProvider>
        
        <Space size={16}>
          {isAuthenticated ? (
            <Dropdown menu={{ items: menuItems }} placement="bottomRight">
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px 8px', borderRadius: 20, transition: 'background-color 0.2s', background: 'rgba(255, 255, 255, 0.1)' }}>
                <Avatar icon={<UserOutlined />} style={{ marginRight: 8, backgroundColor: '#ffffff', color: 'var(--primary-color)' }}/>
                <span style={{ color: '#ffffff', fontWeight: 500 }}>{username}</span>
              </div>
            </Dropdown>
          ) : (
            <>
              <Button type="text" onClick={() => navigate('/login')} style={{ fontWeight: 500, color: 'rgba(255, 255, 255, 0.8)' }}>
                登录
              </Button>
              <Button type="default" onClick={() => navigate('/register')} style={{ fontWeight: 500, borderRadius: 20, color: 'var(--primary-color)', border: 'none' }}>
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