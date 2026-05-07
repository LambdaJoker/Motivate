/*
 * @Author: taotaozi-pro 2667534364@qq.com
 * @Date: 2025-06-30 09:20:14
 * @LastEditors: taotaozi-pro 2667534364@qq.com
 * @LastEditTime: 2025-06-30 09:48:44
 * @FilePath: \Motivate\frontend\src\pages\LoginPage.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, App } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';

const { Title } = Typography;

const LoginPage = ({ setIsAuthenticated }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { message } = App.useApp();

  const onFinish = async (values) => {
    try {
      setLoading(true);
      const { email, password } = values;
      const result = await authApi.login({ email, password });

      if (result.accessToken) {
        localStorage.setItem('token', result.accessToken);
        setIsAuthenticated(true);
        message.success('登录成功！');
        navigate('/generate');
      } else {
        message.error('登录失败，请检查您的凭据');
      }
    } catch (error) {
      console.error('登录失败:', error);
      const errorMessage = error.response?.data?.message || '登录失败，请稍后重试';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f8f9fa' }}>
      <Card style={{ width: 420, borderRadius: 24, boxShadow: '0 1px 2px 0 rgba(60, 64, 67, 0.3), 0 1px 3px 1px rgba(60, 64, 67, 0.15)', border: '1px solid #dadce0' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--primary-color)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none', marginBottom: 16 }}>
            <span style={{ fontSize: 24, fontWeight: 600 }}>T</span>
          </div>
          <Title level={2} style={{ margin: 0, fontWeight: 600, color: '#202124', letterSpacing: '-0.025em' }}>
            欢迎回来
          </Title>
          <div style={{ color: '#5f6368', marginTop: 8 }}>登录 TripAgent 规划下一次旅程</div>
        </div>
        <Form
          name="login"
          onFinish={onFinish}
          initialValues={{ remember: true }}
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="email"
            rules={[{ required: true, message: '请输入您的邮箱地址' }, { type: 'email', message: '请输入有效的邮箱地址' }]}
          >
            <Input prefix={<MailOutlined style={{ color: '#9ca3af' }} />} placeholder="邮箱" autoComplete="email" style={{ borderRadius: 12, background: '#f9fafb' }} />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入您的密码' }]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: '#9ca3af' }} />} placeholder="密码" autoComplete="current-password" style={{ borderRadius: 12, background: '#f9fafb' }} />
          </Form.Item>

          <Form.Item style={{ marginTop: 32 }}>
            <Button type="primary" htmlType="submit" loading={loading} style={{ width: '100%', height: 48, borderRadius: 24, fontWeight: 500, background: 'var(--primary-color)', border: 'none', boxShadow: '0 1px 2px 0 rgba(60, 64, 67, 0.3)' }}>
              登录
            </Button>
          </Form.Item>
          
          <div style={{ textAlign: 'center', color: '#5f6368' }}>
            还没有账户？ <Link to="/register" style={{ color: 'var(--primary-color)', fontWeight: 500 }}>立即注册</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage; 