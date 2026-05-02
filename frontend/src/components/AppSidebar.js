import React, { useState, useEffect } from 'react';
import { Layout, Button, Skeleton, App, Typography, Space, Empty } from 'antd';
import { PlusOutlined, CompassOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { itineraryApi } from '../services/api';
import dayjs from 'dayjs';

const { Sider } = Layout;
const { Text } = Typography;

const AppSidebar = () => {
  const [itineraries, setItineraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { message, modal } = App.useApp();

  const fetchItineraries = async () => {
    try {
      setLoading(true);
      const data = await itineraryApi.getAllItineraries();
      setItineraries(data);
    } catch (error) {
      console.error('获取行程列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItineraries();
    
    const handleRefresh = () => fetchItineraries();
    window.addEventListener('refresh-itineraries', handleRefresh);
    
    return () => {
      window.removeEventListener('refresh-itineraries', handleRefresh);
    };
  }, []);

  const handleDelete = (e, id, title) => {
    e.stopPropagation();
    modal.confirm({
      title: '删除行程',
      content: `确定要删除 "${title}" 吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await itineraryApi.deleteItinerary(id);
          message.success('行程已删除');
          fetchItineraries();
          if (location.pathname === `/itinerary/${id}`) {
            navigate('/generate');
          }
        } catch (error) {
          message.error('删除行程失败');
        }
      },
    });
  };

  return (
    <Sider 
      width={280} 
      theme="light" 
      breakpoint="lg"
      collapsedWidth="0"
      style={{ 
        borderRight: '1px solid #e5e7eb',
        height: 'calc(100vh - 64px)',
        overflowY: 'auto',
        background: '#f8fafc',
        position: 'sticky',
        top: 64,
        zIndex: 10
      }}
    >
      <div style={{ padding: '16px' }}>
        <Button 
          type="primary" 
          block 
          icon={<PlusOutlined />} 
          size="large"
          onClick={() => navigate('/generate')}
          style={{ 
            marginBottom: 24, 
            borderRadius: 12,
            height: 52,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingLeft: 20,
            fontWeight: 600,
            fontSize: '1rem',
            background: 'var(--primary-color)',
            border: 'none',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)'
          }}
        >
          新建行程
        </Button>

        <div style={{ padding: '0 8px', marginBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            近期行程
          </Text>
        </div>

        <Skeleton loading={loading} active paragraph={{ rows: 6 }} title={false}>
          <Space direction="vertical" style={{ width: '100%' }} size={4}>
            {itineraries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', background: '#ffffff', borderRadius: 12, border: '1px dashed #e2e8f0', marginTop: 16 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✈️</div>
                <div style={{ color: '#475569', fontWeight: 600, fontSize: 14 }}>暂无行程记录</div>
                <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>点击上方按钮开启您的下一次旅程</div>
              </div>
            ) : (
              itineraries.map(item => {
                const isActive = location.pathname === `/itinerary/${item.id}`;
                return (
                  <div
                    key={item.id}
                    className="itinerary-item"
                    onClick={() => navigate(`/itinerary/${item.id}`)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '0 8px 8px 0',
                      cursor: 'pointer',
                      background: isActive ? '#f3f4f6' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease',
                      borderLeft: isActive ? '4px solid var(--primary-color)' : '4px solid transparent',
                      borderTop: '1px solid transparent',
                      borderRight: '1px solid transparent',
                      borderBottom: '1px solid transparent',
                      marginBottom: 4
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.borderTop = '1px solid #e5e7eb';
                        e.currentTarget.style.borderRight = '1px solid #e5e7eb';
                        e.currentTarget.style.borderBottom = '1px solid #e5e7eb';
                        e.currentTarget.style.borderLeft = '4px solid #e5e7eb';
                        e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderTop = '1px solid transparent';
                        e.currentTarget.style.borderRight = '1px solid transparent';
                        e.currentTarget.style.borderBottom = '1px solid transparent';
                        e.currentTarget.style.borderLeft = '4px solid transparent';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                      <CompassOutlined style={{ color: isActive ? '#111827' : '#9ca3af', marginRight: 12, fontSize: 18 }} />
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ 
                          fontWeight: isActive ? 600 : 500, 
                          color: isActive ? '#111827' : '#4b5563',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          fontSize: 14
                        }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: 12, color: isActive ? '#6b7280' : '#9ca3af', marginTop: 2 }}>
                          {dayjs(item.startDate).format('MMM D, YYYY')}
                        </div>
                      </div>
                    </div>
                    <Button 
                      type="text" 
                      size="small" 
                      icon={<DeleteOutlined />} 
                      onClick={(e) => handleDelete(e, item.id, item.title)}
                      style={{ color: '#9ca3af', opacity: isActive ? 1 : 0, transition: 'opacity 0.2s' }}
                      className="delete-btn"
                    />
                  </div>
                );
              })
            )}
          </Space>
        </Skeleton>
      </div>
    </Sider>
  );
};

export default AppSidebar;