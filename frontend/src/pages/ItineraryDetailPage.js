import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, Typography, Tabs, Spin, Row, Col, Button, 
  Divider, Progress,
  Timeline, Empty, Tag, Space, Statistic, App, Modal,
  Form, Input, TimePicker, InputNumber, Select
} from 'antd';
import { 
  CalendarOutlined, EnvironmentOutlined, CloudOutlined,
  CarOutlined, LinkOutlined, WalletOutlined,
  CheckCircleOutlined, DeleteOutlined, ExclamationCircleOutlined, SyncOutlined,
  ExpandAltOutlined, ShrinkOutlined, CopyOutlined, LoadingOutlined,
  CoffeeOutlined, HomeOutlined, CameraOutlined, ClockCircleOutlined, EditOutlined,
  PlusOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { format, addDays, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AMap from '../components/AMap';
import api, { itineraryApi, amapApi, llmApi } from '../services/api';

const { Title, Text } = Typography;

const SortableTimelineItem = ({ item, isSelected, showDetails, getItemIcon, onSelect, onNavigate, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : isSelected ? 1 : 0,
    opacity: isDragging ? 0.8 : 1,
    position: 'relative',
  };

  let timeStr = '未定时间';
  if (item.startTime) {
    try {
      timeStr = format(parseISO(item.startTime), 'HH:mm');
    } catch(e) {}
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Timeline.Item
        dot={
          <div {...listeners} style={{ cursor: 'grab', display: 'flex', justifyContent: 'center' }}>
            {getItemIcon(item.itemType, isSelected)}
          </div>
        }
      >
        <div 
          className={`timeline-item-container ${isSelected ? 'selected' : ''}`}
          style={{ 
            paddingBottom: 24, 
            cursor: 'pointer',
            padding: '16px 20px',
            borderRadius: '16px',
            marginLeft: 12,
            marginBottom: 16,
            backgroundColor: isSelected ? '#e8f0fe' : '#ffffff',
            border: '1px solid',
            borderColor: isSelected ? '#d2e3fc' : 'transparent',
            boxShadow: isDragging ? '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (!isSelected && !isDragging) {
              e.currentTarget.style.backgroundColor = '#f8f9fa';
              e.currentTarget.style.borderColor = '#f1f3f4';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected && !isDragging) {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.borderColor = 'transparent';
            }
          }}
          onClick={() => onSelect(item)}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: showDetails ? 12 : 0 }}>
            <div style={{ 
              fontWeight: 700, 
              color: isSelected ? '#1a73e8' : '#5f6368', 
              marginRight: 16, 
              minWidth: '54px',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              letterSpacing: '0.02em',
              transition: 'all 0.2s ease'
            }}>
              {timeStr}
            </div>
            <div style={{ 
              fontWeight: isSelected ? 700 : 600, 
              color: isSelected ? '#174ea6' : '#202124', 
              flex: 1, 
              fontSize: '1.1rem',
              whiteSpace: showDetails ? 'normal' : 'nowrap', 
              overflow: showDetails ? 'visible' : 'hidden', 
              textOverflow: showDetails ? 'clip' : 'ellipsis',
              transition: 'all 0.2s ease'
            }}>
              {item.title}
            </div>
          </div>
          
          {/* 折叠/展开区域 */}
          <div style={{ 
            maxHeight: showDetails ? '800px' : '0', 
            overflow: 'hidden', 
            opacity: showDetails ? 1 : 0,
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' 
          }}>
            {item.description && (
              <div style={{ 
                padding: '12px 16px', 
                background: isSelected ? '#ffffff' : '#f8fafc', 
                borderRadius: 12, 
                marginBottom: 16,
                marginTop: 4,
                color: isSelected ? '#3730a3' : '#475569',
                fontSize: '0.95rem',
                lineHeight: 1.6,
                borderLeft: `4px solid ${isSelected ? '#1a73e8' : '#dadce0'}`
              }}>
                {item.description}
              </div>
            )}
            <Space wrap style={{ marginTop: 4, rowGap: 8 }}>
              {item.estimatedCost > 0 && (
                <Tag icon={<WalletOutlined />} style={{ borderRadius: 8, padding: '4px 10px', background: '#fff7e6', color: '#d46b08', borderColor: '#ffd591', fontSize: '0.85rem' }}>
                  ¥{item.estimatedCost}
                </Tag>
              )}
              {item.durationMinutes > 0 && (
                <Tag icon={<ClockCircleOutlined />} style={{ borderRadius: 8, padding: '4px 10px', background: '#f0fdf4', color: '#047857', borderColor: '#a7f3d0', fontSize: '0.85rem' }}>
                  {item.durationMinutes} 分钟
                </Tag>
              )}
              <Button 
                type="primary" 
                size="small"
                shape="round"
                icon={<CarOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(item);
                }}
                style={{ marginLeft: 4, fontWeight: 500, boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)' }}
              >
                导航前往
              </Button>
              <Button
                type="dashed"
                size="small"
                shape="round"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(item);
                }}
                style={{ marginLeft: 4, fontWeight: 500 }}
              >
                编辑
              </Button>
              <Button
                danger
                size="small"
                shape="round"
                icon={<DeleteOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item);
                }}
                style={{ marginLeft: 4, fontWeight: 500 }}
              >
                删除
              </Button>
            </Space>
          </div>
        </div>
      </Timeline.Item>
    </div>
  );
};

const ItineraryDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  // 使用 App.useApp() 获取上下文消费的方法，消除静态调用的警告
  const { message, modal, notification } = App.useApp();
  
  const [loading, setLoading] = useState(true);
  const [itinerary, setItinerary] = useState(null);
  const [activeDate, setActiveDate] = useState('');
  const [activeDateItems, setActiveDateItems] = useState([]);
  const [routeData, setRouteData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [amapLink, setAmapLink] = useState('');
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [progressLogs, setProgressLogs] = useState([]);
  const [taskId, setTaskId] = useState('');
  
  // 设置网页标题
  useEffect(() => {
    if (itinerary?.title) {
      document.title = `${itinerary.title} - TripAgent`;
    } else {
      document.title = 'TripAgent';
    }
    
    return () => {
      document.title = 'TripAgent';
    };
  }, [itinerary]);

  React.useEffect(() => {
    let intervalId;
    if (regenerating && taskId) {
      intervalId = setInterval(async () => {
        try {
          const res = await llmApi.getProgress(taskId);
          if (res.logs && res.logs.length > 0) {
            setProgressLogs(res.logs);
          }
        } catch (e) {
          console.error('获取进度失败', e);
        }
      }, 1500);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [regenerating, taskId]);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm] = Form.useForm();
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addForm] = Form.useForm();
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement before dragging starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      const oldIndex = activeDateItems.findIndex((item) => item.id === active.id);
      const newIndex = activeDateItems.findIndex((item) => item.id === over.id);
      
      const newItems = arrayMove(activeDateItems, oldIndex, newIndex);
      
      // Update local state immediately for snappy UI
      setActiveDateItems(newItems);
      
      // Call backend to persist new order
      try {
        const orderData = newItems.map((item, index) => ({ id: item.id, orderIndex: index }));
        await itineraryApi.reorderPlanItems(id, orderData);
        message.success('排序已更新');
      } catch (error) {
        message.error('排序更新失败');
        // Revert on failure by refetching
        fetchItinerary();
      }
    }
  };

  const fetchItinerary = async () => {
    try {
      setLoading(true);
      const data = await itineraryApi.getItineraryWithItems(id);
      
      // Ensure data exists before accessing its properties
      if (!data) {
        throw new Error('Failed to load itinerary data');
      }
      
      setItinerary(data);
      
      // 处理日期数据
      if (data.planItems && data.planItems.length > 0) {
        // 按日期分组
        const dateGrouped = groupItemsByDate(data.planItems);
        
        // 默认选择第一天（仅在未选择时）
        if (!activeDate) {
          const firstDate = Object.keys(dateGrouped)[0];
          setActiveDate(firstDate);
          setActiveDateItems(dateGrouped[firstDate]);
        } else {
          setActiveDateItems(dateGrouped[activeDate] || []);
        }
        
        // 获取天气信息
        if (data.planItems[0]?.locationName) {
          fetchWeather(data.planItems[0].locationName.split(' ')[0]); // 使用第一个地点名称的城市部分
        }
        
        // 生成高德地图链接
        generateAmapLink(data.title, data.planItems);
      }
      
    } catch (error) {
      console.error('获取行程详情失败:', error);
      message.error('加载行程详情失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取行程详情
  useEffect(() => {
    fetchItinerary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  
  // 监听 activeDate 的变化，更新 activeDateItems 和 路线数据
  useEffect(() => {
    if (!itinerary || !itinerary.planItems || !activeDate) return;

    const dateGrouped = groupItemsByDate(itinerary.planItems);
    const items = dateGrouped[activeDate] || [];
    
    // 添加排序逻辑，确保按照游览顺序渲染和连线
    const sortedItems = [...items].sort((a, b) => {
      if (a.orderIndex != null && b.orderIndex != null) {
        return a.orderIndex - b.orderIndex;
      }
      if (a.startTime && b.startTime) {
        try {
          return parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime();
        } catch(e) {
          return 0;
        }
      }
      return 0;
    });
    
    setActiveDateItems(sortedItems);
    // 重置选中的地点，这样每次切日期都会默认纵览全图
    setSelectedTimelineSpot(null);
  }, [activeDate, itinerary]);

  // 当 activeDateItems 更新后，去请求对应路线
  useEffect(() => {
    if (!activeDate || activeDate === '未定日期') {
      setRouteData(null);
      return;
    }
    
    // 我们仅在拥有2个及以上的有效坐标点时才去请求路径规划
    const validItemsForRoute = activeDateItems.filter(item => 
      item && item.longitude != null && item.latitude != null && 
      !isNaN(Number(item.longitude)) && !isNaN(Number(item.latitude))
    );

    if (validItemsForRoute.length < 2) {
      setRouteData(null);
      return;
    }

    let isMounted = true;

    const fetchRouteForDate = async () => {
      try {
        setRouteLoading(true);
        const routeResult = await itineraryApi.getRouteForDate(id, activeDate);
        
        if (!isMounted) return; // 避免组件卸载或日期切换后仍更新老状态

        if (routeResult?.route?.paths?.[0]) {
          const path = routeResult.route.paths[0];
          const polyline = [];
          
          if (path.steps) {
            path.steps.forEach(step => {
              if (step.polyline) {
                const points = step.polyline.split(';').map(point => {
                  const [lng, lat] = point.split(',');
                  return [parseFloat(lng), parseFloat(lat)];
                }).filter(p => !isNaN(p[0]) && !isNaN(p[1]));
                polyline.push(...points);
              }
            });
            
            if (polyline.length > 0) {
              setRouteData({
                path: polyline,
                distance: path.distance,
                duration: path.duration
              });
            } else {
              setRouteData(null);
            }
          } else {
            setRouteData(null);
          }
        } else {
          setRouteData(null);
        }
      } catch (error) {
        console.error('获取路线规划失败:', error);
        if (isMounted) setRouteData(null);
      } finally {
        if (isMounted) setRouteLoading(false);
      }
    };

    fetchRouteForDate();

    return () => {
      isMounted = false;
    };
  }, [activeDateItems, activeDate, id]);
  
  const [routeLoading, setRouteLoading] = useState(false);
  const [selectedTimelineSpot, setSelectedTimelineSpot] = useState(null);
  const [timelineExpanded, setTimelineExpanded] = useState(false); // 控制时间轴是否全部展开

  // 按日期分组行程项目
  const groupItemsByDate = (planItems) => {
    const grouped = {};
    
    planItems.forEach(item => {
      let dateStr;
      try {
        const dateObj = new Date(item.planDate);
        if (isNaN(dateObj.getTime())) {
          dateStr = '未定日期';
        } else {
          dateStr = format(dateObj, 'yyyy-MM-dd');
        }
      } catch (e) {
        dateStr = '未定日期';
      }
      
      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      
      grouped[dateStr].push(item);
    });
    
    return grouped;
  };

  // 获取天气数据
  const fetchWeather = async (city) => {
    try {
      setWeatherLoading(true);
      const weather = await amapApi.getWeather(city);
      if (weather && weather.forecasts && weather.forecasts.length > 0) {
        setWeatherData(weather.forecasts[0]);
      } else {
        message.info('暂无可用的天气预报信息');
      }
    } catch (error) {
      console.error('获取天气信息失败:', error);
      message.error('获取天气信息失败');
    } finally {
      setWeatherLoading(false);
    }
  };
  
  // 生成高德地图链接
  const generateAmapLink = async (title, planItems) => {
    try {
      const linkData = await amapApi.generateMapLink(planItems, title);
      if (linkData && linkData.url) {
        setAmapLink(linkData.url);
      }
    } catch (error) {
      console.error('生成高德地图链接失败:', error);
    }
  };
  
  // 点击导航按钮
  const handleNavigate = async (planItem) => {
    try {
      // 查找下一个景点作为目的地
      const currentIndex = activeDateItems.findIndex(item => item.id === planItem.id);
      if (currentIndex >= 0 && currentIndex < activeDateItems.length - 1) {
        const nextPlanItem = activeDateItems[currentIndex + 1];
        
        const result = await amapApi.generateNavigationUrl(
          {
            latitude: planItem.latitude,
            longitude: planItem.longitude
          }, 
          {
            latitude: nextPlanItem.latitude,
            longitude: nextPlanItem.longitude
          },
          'car'
        );
        
        if (result && result.url) {
          window.open(result.url, '_blank');
        }
      } else {
        message.info('这是今天的最后一个景点');
      }
    } catch (error) {
      console.error('生成导航链接失败:', error);
      message.error('导航失败，请重试');
    }
  };
  

  // 渲染日期选项卡
  const renderDateTabs = () => {
    if (!itinerary || !itinerary.startDate || !itinerary.endDate) {
      return null;
    }
    
    let startDate, endDate;
    try {
      startDate = new Date(itinerary.startDate);
      endDate = new Date(itinerary.endDate);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date');
      }
    } catch(e) {
      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="行程日期数据异常" />;
    }
    
    const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    const tabs = [];
    
    for (let i = 0; i < diffDays; i++) {
      let date, dateStr, formattedDate, dayOfWeek;
      try {
        date = addDays(startDate, i);
        dateStr = format(date, 'yyyy-MM-dd');
        formattedDate = format(date, 'MM月dd日', { locale: zhCN });
        dayOfWeek = format(date, 'EEEE', { locale: zhCN });
      } catch (e) {
        continue; // 跳过非法日期
      }
      
      const dateItems = (itinerary.planItems || []).filter(
        item => {
          try {
            return format(parseISO(item.planDate), 'yyyy-MM-dd') === dateStr;
          } catch(e) {
            return false;
          }
        }
      ).sort((a, b) => {
        if (a.orderIndex != null && b.orderIndex != null) {
          return a.orderIndex - b.orderIndex;
        }
        if (a.startTime && b.startTime) {
          try {
            return parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime();
          } catch(e) {
            return 0;
          }
        }
        return 0;
      });
      
      tabs.push({
        key: dateStr,
        forceRender: true, // 强制渲染所有 TabPane 内容，防止高德地图获取不到尺寸报错
        label: (
          <div style={{ padding: '6px 12px' }}>
            <div style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: 2 }}>Day {i + 1}</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>{formattedDate}</div>
          </div>
        ),
        children: (
          <Row gutter={[24, 24]} style={{ minHeight: '600px', display: 'flex', alignItems: 'stretch' }}>
            <Col xs={24} lg={10} xl={9} style={{ display: 'flex', flexDirection: 'column' }}>
              <Card 
                title={<span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e293b' }}>行程安排</span>} 
                extra={
                  <Space>
                    <Button
                      type="default"
                      icon={<EnvironmentOutlined />}
                      size="small"
                      loading={routeLoading}
                      onClick={async () => {
                        try {
                          setRouteLoading(true);
                          const routeResult = await itineraryApi.getRouteForDate(id, activeDate);
                          
                          if (routeResult?.route?.paths?.[0]) {
                            const path = routeResult.route.paths[0];
                            const polyline = [];
                            
                            if (path.steps) {
                              path.steps.forEach(step => {
                                if (step.polyline) {
                                  const points = step.polyline.split(';').map(point => {
                                    const [lng, lat] = point.split(',');
                                    return [parseFloat(lng), parseFloat(lat)];
                                  }).filter(p => !isNaN(p[0]) && !isNaN(p[1]));
                                  polyline.push(...points);
                                }
                              });
                              
                              if (polyline.length > 0) {
                                setRouteData({
                                  path: polyline,
                                  distance: path.distance,
                                  duration: path.duration
                                });
                                message.success('已重新计算当天路线');
                              }
                            }
                          } else {
                            message.warning('无法计算路线，可能是坐标点不足');
                          }
                        } catch (error) {
                          console.error('重新计算路线失败:', error);
                          message.error('重新计算路线失败');
                        } finally {
                          setRouteLoading(false);
                        }
                      }}
                      style={{ borderRadius: 'var(--radius-md)', fontWeight: 500 }}
                    >
                      重算路线
                    </Button>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      size="small"
                      onClick={() => {
                        addForm.resetFields();
                        setAddModalVisible(true);
                      }}
                      style={{ borderRadius: 'var(--radius-md)', fontWeight: 500 }}
                    >
                      添加
                    </Button>
                    <Button 
                      type="text" 
                      icon={timelineExpanded ? <ShrinkOutlined /> : <ExpandAltOutlined />} 
                      onClick={() => setTimelineExpanded(!timelineExpanded)}
                      style={{ color: '#64748b', fontWeight: 500 }}
                      className="hover-bg-slate-100"
                    >
                      {timelineExpanded ? '收起' : '展开'}
                    </Button>
                  </Space>
                }
                variant="borderless" 
                className="timeline-card" 
                style={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)', height: '100%', flex: 1, overflowY: 'auto', backgroundColor: '#ffffff' }}
                styles={{ header: { borderBottom: '1px solid #f1f5f9', padding: '16px 20px' }, body: { padding: '20px 8px 20px 20px' } }}
              >
                {renderDateContent(dateItems)}
              </Card>
            </Col>
            <Col xs={24} lg={14} xl={15} style={{ display: 'flex', flexDirection: 'column' }}>
              {/* 高德地图如果放在 display:none 的容器里会获取不到宽高而报错，
                  所以我们强制渲染了 Tab，但这里只给当前激活的 Tab 传递路线数据 */}
              {/* 这里不再做 display none 切换，而是直接渲染 mapCard，里面的 AMap 自己判断是否渲染 */}
              <div style={{ width: '100%', flex: 1, minHeight: '400px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)', position: 'relative', backgroundColor: '#f8fafc' }}>
                {routeLoading && activeDate === dateStr && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Spin tip="路线规划计算中..." />
                  </div>
                )}
                {renderMap(dateItems, activeDate === dateStr ? routeData : null, dateStr)}
              </div>
              
              {routeData && activeDate === dateStr && (
                <Card style={{ marginTop: 16, borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }} size="small" styles={{ body: { padding: '12px 24px' } }}>
                  <Row justify="space-around" align="middle">
                    <Col>
                      <Statistic 
                        title={<span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 500 }}>驾车总距离</span>} 
                        value={(routeData.distance / 1000).toFixed(1)} 
                        suffix={<span style={{ fontSize: '0.9rem', color: '#64748b', marginLeft: 4 }}>km</span>} 
                        prefix={<EnvironmentOutlined style={{ color: 'var(--primary-color)', fontSize: '1.1rem', marginRight: 8 }} />}
                        valueStyle={{ fontWeight: 800, color: '#1e293b', fontSize: '1.25rem', fontFamily: 'monospace' }}
                      />
                    </Col>
                    <Col>
                      <Divider type="vertical" style={{ height: 32, borderColor: '#e2e8f0' }} />
                    </Col>
                    <Col>
                      <Statistic 
                        title={<span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 500 }}>预计驾车时间</span>} 
                        value={Math.ceil(routeData.duration / 60)} 
                        suffix={<span style={{ fontSize: '0.9rem', color: '#64748b', marginLeft: 4 }}>分钟</span>} 
                        prefix={<ClockCircleOutlined style={{ color: 'var(--primary-color)', fontSize: '1.1rem', marginRight: 8 }} />}
                        valueStyle={{ fontWeight: 800, color: '#1e293b', fontSize: '1.25rem', fontFamily: 'monospace' }}
                      />
                    </Col>
                  </Row>
                </Card>
              )}
            </Col>
          </Row>
        )
      });
    }
    
    return (
      <Tabs 
        activeKey={activeDate || (tabs.length > 0 ? tabs[0].key : undefined)} 
        onChange={setActiveDate}
        type="line"
        size="large"
        style={{ marginBottom: 24 }}
        tabBarStyle={{ marginBottom: 24 }}
        items={tabs.length > 0 ? tabs : [{
          key: 'empty',
          label: '暂无数据',
          children: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无法解析行程日期" style={{ margin: '64px 0' }} />
        }]}
        className="date-tabs"
      />
    );
  };
  
  // 渲染日期内容
  const renderDateContent = (dateItems) => {
    if (!dateItems || dateItems.length === 0) {
      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="今天暂无行程安排" style={{ margin: '64px 0' }} />;
    }

    const getItemIcon = (type, isSelected) => {
      let Icon = EnvironmentOutlined;
      let color = 'var(--primary-color)';
      switch(type) {
        case 'transport': Icon = CarOutlined; color = '#10b981'; break; // 绿色
        case 'food': Icon = CoffeeOutlined; color = '#f59e0b'; break; // 橙色
        case 'accommodation': Icon = HomeOutlined; color = '#8b5cf6'; break; // 紫色
        case 'activity':
        default: Icon = CameraOutlined; color = '#3b82f6'; break; // 蓝色
      }
      if (isSelected) color = '#4F46E5'; // 选中为主色
      
      return (
        <div style={{
          background: isSelected ? '#4F46E5' : '#ffffff',
          color: isSelected ? '#ffffff' : color,
          width: 36,
          height: 36,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `2px solid ${isSelected ? '#4F46E5' : `${color}40`}`,
          boxShadow: isSelected ? '0 0 0 6px #e0e7ff' : '0 2px 4px rgba(0,0,0,0.05)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isSelected ? 'scale(1.15)' : 'scale(1)',
          zIndex: 2
        }}>
          <Icon style={{ fontSize: '18px' }} />
        </div>
      );
    };
    
    return (
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <Timeline
          style={{ marginTop: 24, paddingLeft: 12 }}
        >
          <SortableContext
            items={dateItems.map(item => item.id)}
            strategy={verticalListSortingStrategy}
          >
            {dateItems.map(item => {
              const isSelected = selectedTimelineSpot?.id === item.id;
              const showDetails = timelineExpanded || isSelected;

              return (
                <SortableTimelineItem
                  key={item.id}
                  item={item}
                  isSelected={isSelected}
                  showDetails={showDetails}
                  getItemIcon={getItemIcon}
                  onSelect={setSelectedTimelineSpot}
                  onNavigate={handleNavigate}
                  onEdit={(item) => {
                    setEditingItem(item);
                    editForm.setFieldsValue({
                      title: item.title,
                      description: item.description,
                      locationName: item.locationName,
                      startTime: item.startTime ? dayjs(item.startTime) : null,
                      durationMinutes: item.durationMinutes,
                      estimatedCost: item.estimatedCost,
                      itemType: item.itemType,
                    });
                    setEditModalVisible(true);
                  }}
                  onDelete={(item) => {
                    modal.confirm({
                      title: '删除行程项',
                      icon: <ExclamationCircleOutlined style={{ color: '#DC2626' }} />,
                      content: '确定要删除这个行程节点吗？此操作不可恢复。',
                      okText: '删除',
                      okType: 'danger',
                      cancelText: '取消',
                      onOk: async () => {
                        try {
                          await itineraryApi.deletePlanItem(id, item.id);
                          message.success('删除成功');
                          fetchItinerary();
                        } catch (err) {
                          message.error('删除失败');
                        }
                      }
                    });
                  }}
                />
              );
            })}
          </SortableContext>
        </Timeline>
      </DndContext>
    );
  };
  
  // 渲染地图
  const renderMap = (items = activeDateItems, route = null, dateStr = activeDate) => {
    if (!items || !items.length) {
      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无行程数据，无法显示地图" style={{ margin: '100px 0' }} />;
    }
    
    const validItems = items.filter(item => 
      item && item.longitude != null && item.latitude != null && 
      !isNaN(Number(item.longitude)) && !isNaN(Number(item.latitude))
    );

    if (!validItems.length) {
      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无有效的地理位置数据" style={{ margin: '100px 0' }} />;
    }

    const mapMarkers = validItems.map((item, index) => {
      let formattedTime = '';
      if (item.startTime) {
        try {
          // 这里使用 parseISO 而不是直接 new Date，处理某些浏览器对特定时间字符串格式的兼容问题
          formattedTime = `<p>时间: ${format(parseISO(item.startTime), 'HH:mm', { locale: zhCN })}</p>`;
        } catch(e) {}
      }
      const isSelected = selectedTimelineSpot?.id === item.id;
      
      // 使用更精美的自定义图标
      let markerColor = '#4f46e5'; // 默认主色调
      if (isSelected) {
        markerColor = '#ec4899'; // 选中为粉色以突出显示
      } else {
        switch(item.itemType) {
          case 'transport': markerColor = '#10b981'; break;
          case 'food': markerColor = '#f59e0b'; break;
          case 'accommodation': markerColor = '#8b5cf6'; break;
          case 'activity': default: markerColor = '#3b82f6'; break;
        }
      }
      
      const customIcon = `
        <div style="
          width: ${isSelected ? '32px' : '24px'}; 
          height: ${isSelected ? '32px' : '24px'}; 
          background-color: ${markerColor}; 
          border-radius: 50%; 
          border: 3px solid white; 
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: ${isSelected ? '14px' : '12px'};
          transition: all 0.3s ease;
          transform-origin: center bottom;
        ">
          ${index + 1}
        </div>
      `;

      return {
        longitude: Number(item.longitude),
        latitude: Number(item.latitude),
        title: item.locationName,
        icon: customIcon,
        isCustomIcon: true,
        infoWindow: `
          <div style="padding: 4px; min-width: 150px;">
            <h3 style="margin-top: 0; margin-bottom: 8px; color: #111827; font-size: 16px; border-bottom: 2px solid ${markerColor}; padding-bottom: 4px; display: inline-block;">${item.locationName}</h3>
            <p style="margin-bottom: 4px; color: #4b5563; font-size: 14px;">${item.notes || ''}</p>
            ${formattedTime ? `<p style="margin-bottom: 0; color: ${markerColor}; font-weight: 600; font-size: 13px;">${formattedTime}</p>` : ''}
          </div>
        `
      };
    });
    
    // 重新设计：给每个日期的地图加一个强制的 Key，让 React 在切换 Tabs 时完全卸载并重新创建 AMap
    // 注意：如果只是选中状态变化，不改变 key，这样地图就能平滑过渡缩放
    const mapKey = `amap-${dateStr}-${route ? 'with-route' : 'no-route'}`;
    const currentCenter = selectedTimelineSpot || validItems[0] || null;
    
    // 只有在没有选中特定卡片且没有正在加载路线的情况下，才自动居中适应所有的点
    const shouldAutoFitView = !selectedTimelineSpot && !routeLoading;
    
    // 如果没有选中特定的卡片，并且有多个点，为了能在视野里看到全貌，应该降低缩放级别
    // 我们将其调整为当未选中时 zoom = 10 (约50公里视野，能看清整个城市/县域和远郊景点)
    // 选中时拉近到 14 (约街道/区域级别)
    const currentZoom = selectedTimelineSpot ? 14 : 10;

    return (
      <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
        {activeDate === dateStr && (
          <AMap 
            key={mapKey}
            center={currentCenter} 
            zoom={currentZoom}
            autoFitView={shouldAutoFitView}
            markers={mapMarkers}
            polyline={route ? { path: route.path } : null}
            style={{ height: '100%', width: '100%' }}
            mapKey={process.env.REACT_APP_AMAP_KEY}
          />
        )}
      </div>
    );
  };
  
  const handleRegenerateItinerary = () => {
    const currentTaskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setTaskId(currentTaskId);
    setProgressLogs(['准备启动 AI 引擎重新规划...']);

    modal.confirm({
      title: '重新生成行程',
      icon: <SyncOutlined style={{ color: 'var(--primary-color)' }} />,
      content: '系统将使用您的原始参数生成全新的行程。您当前的计划将被覆盖。是否继续？',
      okText: '重新生成',
      cancelText: '取消',
      onOk: async () => {
        try {
          setRegenerating(true);
          // 调用新的带 taskId 的接口（注意，我们假设后端 controller 会把 query 里的 taskId 传进去，但这需要你确认后端实现。由于我刚刚改了 controller，所以这里要在 api 层传递）
          // 前面我们改的 api.js 还没有给 regenerate 传 taskId，没关系，这里我们直接把 taskId 拼在 url 里。
          await api.post(`/itineraries/${id}/regenerate?taskId=${currentTaskId}`);
          message.success('行程重新生成成功！');
          // 原地刷新以展示最新行程
          window.location.reload();
        } catch (error) {
          console.error('Failed to regenerate:', error);
          message.error('重新生成行程失败，可能是因为找不到原始参数');
        } finally {
          setRegenerating(false);
          try {
            await llmApi.clearProgress(currentTaskId);
          } catch (e) {}
        }
      },
    });
  };

  const handleCopyText = () => {
    if (!itinerary) return;
    
    let text = `# ✈️ ${itinerary.title}\n\n`;
    text += `**📅 日期:** ${format(parseISO(itinerary.startDate), 'yyyy-MM-dd')} 至 ${format(parseISO(itinerary.endDate), 'yyyy-MM-dd')}\n`;
    if (itinerary.budget > 0) {
      text += `**💰 预算:** ¥${itinerary.budget} / **预估花费:** ¥${itinerary.estimatedCost}\n`;
    }
    text += `\n---\n\n`;
    
    const dateGrouped = groupItemsByDate(itinerary.planItems);
    Object.keys(dateGrouped).sort().forEach((date, index) => {
      text += `### 📍 Day ${index + 1} (${date})\n\n`;
      const items = dateGrouped[date].sort((a, b) => {
        if (a.orderIndex != null && b.orderIndex != null) return a.orderIndex - b.orderIndex;
        if (a.startTime && b.startTime) return parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime();
        return 0;
      });
      
      items.forEach(item => {
        const timeStr = item.startTime ? format(parseISO(item.startTime), 'HH:mm') : '未定时间';
        text += `- **[${timeStr}] ${item.title}**\n`;
        if (item.description) text += `  > 📝 ${item.description}\n`;
        if (item.estimatedCost > 0) text += `  > 💵 花费: ¥${item.estimatedCost}\n`;
      });
      text += `\n`;
    });
    
    text += `\n*💡 Generated by TripAgent*`;
    
    navigator.clipboard.writeText(text).then(() => {
      message.success('行程已复制到剪贴板');
    }).catch(() => {
      message.error('复制失败，请重试');
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadICS = () => {
    if (!itinerary || !itinerary.planItems) return;
    
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//TripAgent//Itinerary//EN\n";
    
    itinerary.planItems.forEach(item => {
      if (!item.startTime) return;
      
      // 简单处理时间格式 2025-06-30T08:00:00.000Z -> 20250630T080000Z
      const start = new Date(item.startTime).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      // 如果没有 endTime，默认加1小时
      let endObj = item.endTime ? new Date(item.endTime) : new Date(new Date(item.startTime).getTime() + 60 * 60 * 1000);
      const end = endObj.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      
      icsContent += "BEGIN:VEVENT\n";
      icsContent += `DTSTART:${start}\n`;
      icsContent += `DTEND:${end}\n`;
      icsContent += `SUMMARY:${item.title}\n`;
      icsContent += `DESCRIPTION:${(item.description || '').replace(/\n/g, '\\n')}\n`;
      icsContent += `LOCATION:${item.locationName || ''}\n`;
      icsContent += "END:VEVENT\n";
    });
    
    icsContent += "END:VCALENDAR";
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `${itinerary.title}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    message.success('日历文件下载成功！');
  };

  const handleDeleteItinerary = () => {
    modal.confirm({
      title: '删除行程',
      icon: <ExclamationCircleOutlined style={{ color: '#DC2626' }} />,
      content: '确定要删除此行程吗？此操作无法撤销。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await itineraryApi.deleteItinerary(id);
          message.success('行程删除成功');
          window.dispatchEvent(new Event('refresh-itineraries'));
          navigate('/generate', { replace: true });
        } catch (error) {
          console.error('Failed to delete trip:', error);
          message.error('删除行程失败，请重试');
        }
      },
    });
  };
  
  // 渲染页面标题和基本信息
  const renderPageHeader = () => {
    if (!itinerary) return null;
    
    let startDateStr = '待定';
    let endDateStr = '待定';
    
    if (itinerary.startDate) {
      try { startDateStr = format(parseISO(itinerary.startDate), 'yyyy-MM-dd'); } catch(e) {}
    }
    if (itinerary.endDate) {
      try { endDateStr = format(parseISO(itinerary.endDate), 'yyyy-MM-dd'); } catch(e) {}
    }
    
    const percent = itinerary.budget > 0 ? Math.min(100, Math.round((itinerary.estimatedCost / itinerary.budget) * 100)) : 0;
    const isOverBudget = itinerary.estimatedCost > itinerary.budget;
    const progressStatus = isOverBudget ? 'exception' : 'normal';
    
    return (
      <Card 
        style={{ marginBottom: 24, borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}
        styles={{ body: { paddingTop: 24, paddingBottom: 24 } }}
      >
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={14}>
            <Title level={2} style={{ margin: 0, fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #1a73e8 0%, #4285f4 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px rgba(26, 115, 232, 0.2)' }}>
                <EnvironmentOutlined style={{ fontSize: 24 }} /> 
              </div>
              {itinerary.title}
            </Title>
            <Space size="middle" style={{ marginTop: 16 }}>
              <Tag icon={<CalendarOutlined />} style={{ borderRadius: 6, padding: '4px 10px', fontSize: '0.95rem', border: 'none', background: '#f3f4f6', color: '#4b5563' }}>
                {startDateStr} 至 {endDateStr}
              </Tag>
              {itinerary.budget > 0 && (
                <Tag color={isOverBudget ? 'error' : 'success'} style={{ borderRadius: 6, padding: '4px 10px', fontSize: '0.95rem', border: 'none' }}>
                  {isOverBudget ? '超支预警' : '预算健康'}
                </Tag>
              )}
            </Space>
          </Col>
          <Col xs={24} md={10} style={{ textAlign: 'right' }}>
            <Space size="small" wrap>
              <Button icon={<CopyOutlined />} onClick={handleCopyText} style={{ borderRadius: 'var(--radius-md)', fontWeight: 500 }} className="hide-on-print">
                复制
              </Button>
              <Button icon={<CloudOutlined />} onClick={() => fetchWeather(itinerary.destination)} loading={weatherLoading} style={{ borderRadius: 'var(--radius-md)', fontWeight: 500 }} className="hide-on-print">
                刷新天气
              </Button>
              <Button icon={<SyncOutlined />} onClick={handleRegenerateItinerary} loading={regenerating} style={{ borderRadius: 'var(--radius-md)', fontWeight: 500 }} className="hide-on-print">
                重新生成
              </Button>
              <Button type="primary" icon={<LinkOutlined />} onClick={() => setQrModalVisible(true)} disabled={!amapLink} style={{ borderRadius: 'var(--radius-md)', fontWeight: 500 }} className="hide-on-print">
                分享 / 导出
              </Button>
              <Button danger type="text" icon={<DeleteOutlined />} onClick={handleDeleteItinerary} style={{ borderRadius: 'var(--radius-md)', fontWeight: 500 }} className="hide-on-print">
                删除
              </Button>
            </Space>
          </Col>
        </Row>

        {itinerary.description && (
          <div style={{ marginTop: 24, padding: '16px 20px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap', color: '#475569', lineHeight: 1.6, fontSize: '0.95rem' }}>
            <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 8, display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '1.2rem', marginRight: 8 }}>💡</span> 规划摘要与预算分析
            </div>
            {itinerary.description}
          </div>
        )}
        
        {itinerary.budget > 0 && (
          <div style={{ marginTop: 24, padding: '16px 20px', background: '#f8fafc', borderRadius: 12 }}>
            <Row gutter={[24, 24]} align="middle">
              <Col xs={12} md={8}>
                <Statistic title={<span style={{ color: 'var(--text-secondary)' }}>人均预算</span>} value={itinerary.budget} prefix="¥" valueStyle={{ fontWeight: 700, color: 'var(--text-main)', fontSize: 20 }} />
              </Col>
              <Col xs={12} md={8}>
                <Statistic title={<span style={{ color: 'var(--text-secondary)' }}>预估花费</span>} value={itinerary.estimatedCost} prefix="¥" valueStyle={{ fontWeight: 700, color: isOverBudget ? '#ef4444' : 'var(--text-main)', fontSize: 20 }} />
              </Col>
              <Col xs={24} md={8}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>预算使用情况 ({percent}%)</div>
                <Progress 
                  percent={percent} 
                  status={progressStatus} 
                  strokeColor={isOverBudget ? '#ea4335' : { '0%': '#1a73e8', '100%': '#4285f4' }}
                  strokeWidth={10}
                  trailColor="#f1f5f9"
                  showInfo={false}
                />
              </Col>
            </Row>
          </div>
        )}
      </Card>
    );
  };
  
  const renderWeatherWidget = () => {
    if (weatherLoading) {
      return (
        <Card style={{ marginBottom: 24, borderRadius: 'var(--radius-lg)', border: '1px solid #e2e8f0', background: '#f8fafc' }} className="hide-on-print">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 0' }}>
            <Spin size="small" /> <span style={{ marginLeft: 8, color: '#64748b' }}>获取当地天气中...</span>
          </div>
        </Card>
      );
    }

    if (!weatherData || !weatherData.casts) return null;

    return (
      <Card 
        style={{ marginBottom: 24, borderRadius: 'var(--radius-lg)', border: '1px solid #e2e8f0', background: '#ffffff' }}
        styles={{ body: { padding: '16px 24px' } }}
        className="hide-on-print"
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <CloudOutlined style={{ fontSize: 20, color: 'var(--primary-color)', marginRight: 8 }} />
          <Text style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e293b' }}>
            {weatherData.city} 近期天气预报
          </Text>
        </div>
        <Row gutter={[16, 16]}>
          {weatherData.casts.slice(0, 4).map((cast, idx) => (
            <Col xs={12} sm={6} key={idx}>
              <div style={{ 
                padding: '12px', 
                borderRadius: '12px', 
                background: idx === 0 ? '#eef2ff' : '#f8fafc',
                border: `1px solid ${idx === 0 ? '#c7d2fe' : '#e2e8f0'}`,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 4 }}>
                  {idx === 0 ? '今天' : cast.date.substring(5)}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
                  {cast.dayweather}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#4F46E5', fontWeight: 500 }}>
                  {cast.nighttemp} ~ {cast.daytemp}℃
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </Card>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载中...</div>
      </div>
    );
  }
  
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      {renderPageHeader()}
      {renderWeatherWidget()}
      
      {regenerating && progressLogs.length > 0 && (
        <Card 
          style={{ marginBottom: 24, borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--primary-color)' }}
        >
          <div style={{ fontSize: 13, color: 'var(--primary-color)', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <SyncOutlined spin style={{ marginRight: 8 }} />
            AI 正在重新规划行程...
          </div>
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {progressLogs.map((log, index) => {
              const isLast = index === progressLogs.length - 1;
              return (
                <div key={index} style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start',
                  color: isLast ? '#0f172a' : '#94a3b8',
                  fontWeight: isLast ? 500 : 400,
                  opacity: isLast ? 1 : 0.7,
                  transform: isLast ? 'translateY(0)' : 'translateY(-2px)',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ marginRight: 12, marginTop: 2 }}>
                    {isLast ? <LoadingOutlined style={{ color: 'var(--primary-color)' }} /> : <CheckCircleOutlined style={{ color: '#10b981' }} />}
                  </div>
                  <div style={{ flex: 1, lineHeight: 1.5, fontSize: 14 }}>
                    {log}
                  </div>
                </div>
              );
            })}
          </Space>
        </Card>
      )}

      <Row gutter={[24, 24]}>
        <Col span={24}>
          {renderDateTabs()}
        </Col>
      </Row>
      
      {/* 分享二维码弹窗 */}
      <Modal
        title="分享与导出"
        open={qrModalVisible}
        onCancel={() => setQrModalVisible(false)}
        footer={[
          <Button key="calendar" onClick={handleDownloadICS} style={{ borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}>
            导出到系统日历 (.ics)
          </Button>,
          <Button key="print" type="primary" onClick={handlePrint}>
            保存为 PDF / 打印
          </Button>,
          <Button key="close" onClick={() => setQrModalVisible(false)}>
            关闭
          </Button>
        ]}
      >
        {amapLink ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 16 }}>
              <Text>使用高德地图扫码查看完整路线</Text>
            </div>
            <div>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(amapLink)}`} 
                alt="Amap Route QR Code" 
                style={{ width: 200, height: 200 }}
              />
            </div>
            <div style={{ marginTop: 16 }}>
              <Button type="link" onClick={() => {
                navigator.clipboard.writeText(amapLink);
                message.success('链接已复制到剪贴板');
              }}>
                复制链接
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <Spin />
            <div style={{ marginTop: 16 }}>正在生成分享码...</div>
          </div>
        )}
      </Modal>

      {/* 编辑行程项弹窗 */}
      <Modal
        title="编辑行程项"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingItem(null);
        }}
        onOk={async () => {
          try {
            const values = await editForm.validateFields();
            setSubmittingEdit(true);
            
            const updateData = {
              title: values.title,
              description: values.description,
              locationName: values.locationName,
              durationMinutes: values.durationMinutes,
              estimatedCost: values.estimatedCost,
              itemType: values.itemType,
            };

            if (values.startTime) {
              updateData.startTime = values.startTime.toISOString();
            }

            await itineraryApi.updatePlanItem(id, editingItem.id, updateData);
            message.success('更新成功');
            setEditModalVisible(false);
            setEditingItem(null);
            fetchItinerary();
          } catch (err) {
            console.error('Failed to update item:', err);
            if (!err.errorFields) { // Not a form validation error
              message.error('更新失败');
            }
          } finally {
            setSubmittingEdit(false);
          }
        }}
        confirmLoading={submittingEdit}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="如：天安门广场、午餐：烤鸭" />
          </Form.Item>
          
          <Form.Item
            name="locationName"
            label="地点名称"
            rules={[{ required: true, message: '请输入地点名称' }]}
          >
            <Input placeholder="如：天安门广场" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="startTime"
                label="开始时间"
                rules={[{ required: true, message: '请选择开始时间' }]}
              >
                <TimePicker format="HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="durationMinutes"
                label="游玩时长 (分钟)"
                rules={[{ required: true, message: '请输入游玩时长' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="estimatedCost"
                label="预估花费 (元)"
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="itemType"
                label="类型"
              >
                <Select>
                  <Select.Option value="activity">景点/活动</Select.Option>
                  <Select.Option value="food">餐饮</Select.Option>
                  <Select.Option value="accommodation">住宿</Select.Option>
                  <Select.Option value="transport">交通</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="备注/描述"
          >
            <Input.TextArea rows={3} placeholder="添加一些备注..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* 添加行程项弹窗 */}
      <Modal
        title={`添加行程项 (${activeDate})`}
        open={addModalVisible}
        onCancel={() => {
          setAddModalVisible(false);
          addForm.resetFields();
        }}
        onOk={async () => {
          try {
            const values = await addForm.validateFields();
            setSubmittingAdd(true);
            
            // 获取所选日期，默认为当前激活的日期
            const itemDate = activeDate;
            
            // 构造完整时间
            let startTimeStr = null;
            if (values.startTime) {
              // 组合 activeDate 和 startTime
              const timeObj = values.startTime.toDate();
              const dateObj = new Date(itemDate);
              dateObj.setHours(timeObj.getHours(), timeObj.getMinutes(), 0, 0);
              startTimeStr = dateObj.toISOString();
            } else {
              // 默认使用当天中午12点
              const dateObj = new Date(itemDate);
              dateObj.setHours(12, 0, 0, 0);
              startTimeStr = dateObj.toISOString();
            }

            // 这里默认将其添加到当天行程的最后
            // 后端其实不需要 orderIndex，因为后端的逻辑可能只接受一个 item，不一定能自动排列
            // 或者在后端的 addPlanItem 中自动排到最后
            const createData = {
              title: values.title,
              description: values.description || '',
              planDate: itemDate,
              startTime: startTimeStr,
              durationMinutes: values.durationMinutes || 60,
              itemType: values.itemType || 'activity',
              locationName: values.locationName,
              estimatedCost: values.estimatedCost || 0,
              latitude: 0,  // 先默认填 0，前端不强求经纬度，后续如果有需要可以加搜索
              longitude: 0,
            };

            await itineraryApi.addPlanItem(id, createData);
            message.success('添加成功');
            setAddModalVisible(false);
            addForm.resetFields();
            fetchItinerary();
          } catch (err) {
            console.error('Failed to add item:', err);
            if (!err.errorFields) {
              message.error('添加失败');
            }
          } finally {
            setSubmittingAdd(false);
          }
        }}
        confirmLoading={submittingAdd}
      >
        <Form form={addForm} layout="vertical" initialValues={{ durationMinutes: 60, estimatedCost: 0, itemType: 'activity' }}>
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="如：天安门广场、午餐：烤鸭" />
          </Form.Item>
          
          <Form.Item
            name="locationName"
            label="地点名称"
            rules={[{ required: true, message: '请输入地点名称' }]}
          >
            <Input placeholder="如：天安门广场" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="startTime"
                label="开始时间"
                rules={[{ required: true, message: '请选择开始时间' }]}
              >
                <TimePicker format="HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="durationMinutes"
                label="游玩时长 (分钟)"
                rules={[{ required: true, message: '请输入游玩时长' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="estimatedCost"
                label="预估花费 (元)"
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="itemType"
                label="类型"
              >
                <Select>
                  <Select.Option value="activity">景点/活动</Select.Option>
                  <Select.Option value="food">餐饮</Select.Option>
                  <Select.Option value="accommodation">住宿</Select.Option>
                  <Select.Option value="transport">交通</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="备注/描述"
          >
            <Input.TextArea rows={3} placeholder="添加一些备注..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ItineraryDetailPage; 