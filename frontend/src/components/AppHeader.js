import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Space, Dropdown, Avatar, message } from 'antd';
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
          handleLogout();
        }
      }
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    message.success('您已成功退出登录');
    navigate('/login');
  };

  const menu = (
    <Menu>
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
        退出登录
      </Menu.Item>
    </Menu>
  );

  return (
    <Header className="app-header">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <GiftOutlined style={{ fontSize: 24, color: 'white', marginRight: 12 }} />
          <Link to="/" style={{ color: 'white' }}>
            <h1 style={{ color: 'white', margin: 0, fontSize: '1.5rem' }}>我的旅行攻略</h1>
          </Link>
        </div>
        
        <Menu 
          theme="dark" 
          mode="horizontal" 
          selectedKeys={[location.pathname]} 
          style={{ background: 'transparent', flex: 1, marginLeft: 40, borderBottom: 'none' }}
        >
          {isAuthenticated && (
            <Menu.Item key="/generate" onClick={() => navigate('/generate')} icon={<CalendarOutlined />}>
              创建攻略
            </Menu.Item>
          )}
        </Menu>
        
        <Space>
          {isAuthenticated ? (
            <Dropdown overlay={menu} placement="bottomRight">
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }}/>
                <span style={{ color: 'white' }}>{username}</span>
              </div>
            </Dropdown>
          ) : (
            <>
              <Button onClick={() => navigate('/login')}>
                登录
              </Button>
              <Button type="primary" onClick={() => navigate('/register')}>
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