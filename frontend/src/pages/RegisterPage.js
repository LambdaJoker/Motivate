import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, App } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';

const { Title } = Typography;

const RegisterPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { message } = App.useApp();

  const onFinish = async (values) => {
    if (values.password !== values.confirm) {
      message.error('两次输入的密码不一致！');
      return;
    }
    
    try {
      setLoading(true);
      const { username, email, password } = values;
      await authApi.register({ username, email, password });
      
      message.success('注册成功！正在跳转到登录页面...');
      setTimeout(() => {
        navigate('/login');
      }, 1500);

    } catch (error) {
      console.error('注册失败:', error);
      const errorMessage = error.response?.data?.message || '注册失败，请稍后重试';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f8fafc' }}>
      <Card style={{ width: 420, borderRadius: 24, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)', border: '1px solid #f3f4f6' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--primary-color)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px -4px rgba(79, 70, 229, 0.3)', marginBottom: 16 }}>
            <span style={{ fontSize: 24, fontWeight: 800 }}>T</span>
          </div>
          <Title level={2} style={{ margin: 0, fontWeight: 800, color: '#111827', letterSpacing: '-0.025em' }}>
            创建您的账户
          </Title>
          <div style={{ color: '#6b7280', marginTop: 8 }}>加入 TripAgent 开启智能旅程</div>
        </div>
        <Form
          name="register"
          onFinish={onFinish}
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入您的用户名' }]}
          >
            <Input prefix={<UserOutlined style={{ color: '#9ca3af' }} />} placeholder="用户名" style={{ borderRadius: 12, background: '#f9fafb' }} />
          </Form.Item>
          <Form.Item
            name="email"
            rules={[{ required: true, message: '请输入您的邮箱地址' }, { type: 'email', message: '请输入有效的邮箱地址' }]}
          >
            <Input prefix={<MailOutlined style={{ color: '#9ca3af' }} />} placeholder="邮箱" style={{ borderRadius: 12, background: '#f9fafb' }} />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入您的密码' }, { min: 6, message: '密码不能少于6个字符' }]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: '#9ca3af' }} />} placeholder="密码" style={{ borderRadius: 12, background: '#f9fafb' }} />
          </Form.Item>
          <Form.Item
            name="confirm"
            dependencies={['password']}
            hasFeedback
            rules={[
              { required: true, message: '请确认您的密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不匹配！'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: '#9ca3af' }} />} placeholder="确认密码" style={{ borderRadius: 12, background: '#f9fafb' }} />
          </Form.Item>

          <Form.Item style={{ marginTop: 32 }}>
            <Button type="primary" htmlType="submit" loading={loading} style={{ width: '100%', height: 48, borderRadius: 12, fontWeight: 600, background: 'var(--primary-color)', border: 'none', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)' }}>
              注册
            </Button>
          </Form.Item>
          
          <div style={{ textAlign: 'center', color: '#6b7280' }}>
            已经有账户了？ <Link to="/login" style={{ color: 'var(--primary-color)', fontWeight: 500 }}>立即登录</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default RegisterPage; 