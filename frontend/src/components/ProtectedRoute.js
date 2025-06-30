import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  const token = localStorage.getItem('token');

  if (!token) {
    // 如果没有token，重定向到登录页
    return <Navigate to="/login" replace />;
  }

  // 如果有token，渲染子路由
  return <Outlet />;
};

export default ProtectedRoute; 