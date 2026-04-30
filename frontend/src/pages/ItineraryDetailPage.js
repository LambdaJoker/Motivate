import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, Typography, Tabs, Spin, Row, Col, Button, 
  Divider,
  Timeline, Empty, Tag, Space, Statistic, App, Modal
} from 'antd';
import { 
  CalendarOutlined, EnvironmentOutlined, CloudOutlined,
  CarOutlined, LinkOutlined, WalletOutlined,
  CheckCircleOutlined, DeleteOutlined, ExclamationCircleOutlined, SyncOutlined,
  ExpandAltOutlined, ShrinkOutlined
} from '@ant-design/icons';
import { format, addDays, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import AMap from '../components/AMap';
import { itineraryApi, amapApi } from '../services/api';

const { Title, Text } = Typography;

const ItineraryDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  // 使用 App.useApp() 获取上下文消费的方法，消除静态调用的警告
  const { message, modal } = App.useApp();
  
  const [loading, setLoading] = useState(true);
  const [itinerary, setItinerary] = useState(null);
  const [activeDate, setActiveDate] = useState('');
  const [activeDateItems, setActiveDateItems] = useState([]);
  const [routeData, setRouteData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [amapLink, setAmapLink] = useState('');
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  
  // 获取行程详情
  useEffect(() => {
    const fetchItinerary = async () => {
      try {
        setLoading(true);
        const data = await itineraryApi.getItineraryWithItems(id);
        
        // Ensure data exists before accessing its properties
        if (!data) {
          throw new Error('未获取到行程数据');
        }
        
        setItinerary(data);
        
        // 处理日期数据
        if (data.planItems && data.planItems.length > 0) {
          // 按日期分组
          const dateGrouped = groupItemsByDate(data.planItems);
          
          // 默认选择第一天
          const firstDate = Object.keys(dateGrouped)[0];
          setActiveDate(firstDate);
          setActiveDateItems(dateGrouped[firstDate]);
          
          // 获取天气信息
          if (data.planItems[0]?.locationName) {
            fetchWeather(data.planItems[0].locationName.split(' ')[0]); // 使用第一个地点名称的城市部分
          }
          
          // 生成高德地图链接
          generateAmapLink(data.title, data.planItems);
        }
        
      } catch (error) {
        console.error('获取行程详情失败:', error);
        message.error('获取行程详情失败');
      } finally {
        setLoading(false);
      }
    };
    
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
    // 重置选中的地点
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
      // 这里可以实现展示天气的逻辑，比如弹窗显示
      if (weather) {
        let weatherInfo = '暂无天气信息';
        if (weather.lives && weather.lives.length > 0) {
          const live = weather.lives[0];
          weatherInfo = `${live.city}：${live.weather}，气温 ${live.temperature}℃，${live.winddirection}风 ${live.windpower}级`;
        }
        message.info(weatherInfo);
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
        message.info('这已经是当天最后一个景点了');
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
      return <Empty description="行程日期数据异常" />;
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
          <div style={{ padding: '4px 8px' }}>
            <div style={{ fontWeight: 600, fontSize: '1.125rem', marginBottom: 4 }}>第{i + 1}天</div>
            <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>{formattedDate} {dayOfWeek}</div>
          </div>
        ),
        children: (
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={8}>
              <Card 
                title={<span style={{ fontWeight: 600 }}>行程安排</span>} 
                extra={
                  <Button 
                    type="text" 
                    icon={timelineExpanded ? <ShrinkOutlined /> : <ExpandAltOutlined />} 
                    onClick={() => setTimelineExpanded(!timelineExpanded)}
                  >
                    {timelineExpanded ? '收起详情' : '展开详情'}
                  </Button>
                }
                variant="borderless" 
                className="timeline-card" 
                style={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}
              >
                {renderDateContent(dateItems)}
              </Card>
            </Col>
            <Col xs={24} lg={16}>
              {/* 高德地图如果放在 display:none 的容器里会获取不到宽高而报错，
                  所以我们强制渲染了 Tab，但这里只给当前激活的 Tab 传递路线数据 */}
              {/* 这里不再做 display none 切换，而是直接渲染 mapCard，里面的 AMap 自己判断是否渲染 */}
              <div style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', position: 'relative' }}>
                {routeLoading && activeDate === dateStr && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Spin tip="路线规划计算中..." />
                  </div>
                )}
                {renderMap(dateItems, activeDate === dateStr ? routeData : null, dateStr)}
              </div>
              
              {routeData && activeDate === dateStr && (
                <Card style={{ marginTop: 16, borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }} size="small">
                  <Row justify="space-around">
                    <Col>
                      <Statistic 
                        title={<span style={{ color: 'var(--text-secondary)' }}>总距离</span>} 
                        value={(routeData.distance / 1000).toFixed(1)} 
                        suffix="公里" 
                        prefix={<CarOutlined style={{ color: 'var(--primary-color)' }} />}
                        valueStyle={{ fontWeight: 600, color: 'var(--text-main)' }}
                      />
                    </Col>
                    <Col>
                      <Statistic 
                        title={<span style={{ color: 'var(--text-secondary)' }}>预计车程</span>} 
                        value={Math.ceil(routeData.duration / 60)} 
                        suffix="分钟" 
                        valueStyle={{ fontWeight: 600, color: 'var(--text-main)' }}
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
        type="card"
        size="large"
        style={{ marginBottom: 24 }}
        items={tabs.length > 0 ? tabs : [{
          key: 'empty',
          label: '暂无行程',
          children: <Empty description="无法解析任何有效行程日期" />
        }]}
      />
    );
  };
  
  // 渲染日期内容
  const renderDateContent = (dateItems) => {
    if (!dateItems || dateItems.length === 0) {
      return <Empty description="当天没有安排行程" style={{ margin: '40px 0' }} />;
    }
    
    return (
      <Timeline
        style={{ marginTop: 16 }}
        items={dateItems.map(item => {
          let timeStr = '未定时间';
          if (item.startTime) {
            try {
              timeStr = format(parseISO(item.startTime), 'HH:mm');
            } catch(e) {}
          }
          
          const isSelected = selectedTimelineSpot?.id === item.id;
          // 决定是否展示详情：如果全局展开，或者当前节点被选中，则展示详情
          const showDetails = timelineExpanded || isSelected;
          
          return {
            key: item.id,
            color: isSelected ? '#FF4D4F' : 'var(--primary-color)',
            dot: isSelected ? <EnvironmentOutlined style={{ fontSize: '18px', color: '#FF4D4F' }} /> : null,
            children: (
              <div 
                style={{ 
                  paddingBottom: 16, 
                  cursor: 'pointer',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: isSelected ? 'var(--bg-light)' : 'transparent',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => setSelectedTimelineSpot(item)}
              >
                <p style={{ margin: showDetails ? '0 0 8px 0' : '0', fontSize: '1.05rem', display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: 'var(--primary-color)', marginRight: 12, minWidth: '48px', whiteSpace: 'nowrap' }}>{timeStr}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</span>
                </p>
                
                {/* 折叠/展开区域 */}
                <div style={{ 
                  maxHeight: showDetails ? '500px' : '0', 
                  overflow: 'hidden', 
                  opacity: showDetails ? 1 : 0,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
                }}>
                  {item.description && <Text type="secondary" style={{ display: 'block', marginBottom: 8, lineHeight: 1.5 }}>{item.description}</Text>}
                  <Space wrap style={{ marginTop: 8 }}>
                    {item.estimatedCost > 0 && (
                      <Tag icon={<WalletOutlined />} color="orange" style={{ borderRadius: 4, border: 'none', background: '#fff7e6', color: '#d46b08' }}>
                        预估花费: ¥{item.estimatedCost}
                      </Tag>
                    )}
                    {item.durationMinutes > 0 && (
                      <Tag color="blue" style={{ borderRadius: 4, border: 'none', background: '#e6f7ff', color: '#0958d9' }}>
                        预计: {item.durationMinutes}分钟
                      </Tag>
                    )}
                    <Button 
                      type="primary" 
                      ghost
                      size="small"
                      shape="round"
                      icon={<CarOutlined />}
                      onClick={(e) => {
                        e.stopPropagation(); // 阻止事件冒泡，避免触发选中节点
                        handleNavigate(item);
                      }}
                    >
                      导航
                    </Button>
                  </Space>
                </div>
              </div>
            )
          };
        })}
      />
    );
  };
  
  // 渲染地图
  const renderMap = (items = activeDateItems, route = null, dateStr = activeDate) => {
    if (!items || !items.length) {
      return <Empty description="当天没有行程安排，无法显示地图" />;
    }
    
    const validItems = items.filter(item => 
      item && item.longitude != null && item.latitude != null && 
      !isNaN(Number(item.longitude)) && !isNaN(Number(item.latitude))
    );

    if (!validItems.length) {
      return <Empty description="当天行程没有有效的地理位置数据" />;
    }

    const mapMarkers = validItems.map((item, index) => {
      let formattedTime = '';
      if (item.startTime) {
        try {
          // 这里使用 parseISO 而不是直接 new Date，处理某些浏览器对特定时间字符串格式的兼容问题
          formattedTime = `<p>计划时间: ${format(parseISO(item.startTime), 'HH:mm', { locale: zhCN })}</p>`;
        } catch(e) {}
      }
      const isSelected = selectedTimelineSpot?.id === item.id;
      return {
        longitude: Number(item.longitude),
        latitude: Number(item.latitude),
        title: item.locationName,
        icon: isSelected 
          ? 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png'
          : 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
        infoWindow: `
          <div>
            <h3>${item.locationName}</h3>
            <p>${item.notes || ''}</p>
            ${formattedTime}
          </div>
        `
      };
    });
    
    // 重新设计：给每个日期的地图加一个强制的 Key，让 React 在切换 Tabs 时完全卸载并重新创建 AMap
    // 注意：这里不再将 selectedTimelineSpot 放入 mapKey 中，防止点击卡片时整个地图组件被卸载重刷！
    const mapKey = `amap-${dateStr}-${route ? 'with-route' : 'no-route'}`;
    const currentCenter = selectedTimelineSpot || validItems[0] || null;
    
    // 如果没有选中特定的卡片，并且有多个点，为了能在视野里看到全貌，应该降低缩放级别
    // 我们将其调整为当未选中时 zoom = 10 (约50公里视野，能看清整个城市/县域和远郊景点)
    // 选中时拉近到 14 (约街道/区域级别)
    const currentZoom = selectedTimelineSpot ? 14 : 10;

    return (
      <Card variant="borderless" style={{ width: '100%', minHeight: '500px' }}>
        {activeDate === dateStr && (
          <AMap 
            key={mapKey}
            center={currentCenter} 
            zoom={currentZoom}
            autoFitView={!selectedTimelineSpot}
            markers={mapMarkers}
            polyline={route ? { path: route.path } : null}
            style={{ height: '500px', width: '100%' }}
            mapKey={process.env.REACT_APP_AMAP_KEY}
          />
        )}
      </Card>
    );
  };
  
  const handleRegenerateItinerary = () => {
    modal.confirm({
      title: '重新规划行程',
      icon: <SyncOutlined style={{ color: 'var(--primary-color)' }} />,
      content: '系统将使用您当初填写的参数重新生成一份全新的行程安排，当前行程将会被覆盖，是否继续？',
      okText: '重新生成',
      cancelText: '取消',
      onOk: async () => {
        try {
          setRegenerating(true);
          await itineraryApi.regenerateItinerary(id);
          message.success('行程重新规划成功！');
          // 原地刷新以展示最新行程
          window.location.reload();
        } catch (error) {
          console.error('重新生成行程失败:', error);
          message.error('重新生成行程失败，可能原始参数已丢失');
        } finally {
          setRegenerating(false);
        }
      },
    });
  };

  const handleDeleteItinerary = () => {
    modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined style={{ color: '#DC2626' }} />,
      content: '确定要删除这个旅行攻略吗？此操作不可恢复。',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await itineraryApi.deleteItinerary(id);
          message.success('行程已成功删除');
          navigate('/generate', { replace: true });
        } catch (error) {
          console.error('删除行程失败:', error);
          message.error('删除行程失败，请重试');
        }
      },
    });
  };
  
  // 渲染页面标题和基本信息
  const renderPageHeader = () => {
    if (!itinerary) return null;
    
    let startDateStr = '未定开始日期';
    let endDateStr = '未定结束日期';
    
    if (itinerary.startDate) {
      try { startDateStr = format(parseISO(itinerary.startDate), 'yyyy-MM-dd'); } catch(e) {}
    }
    if (itinerary.endDate) {
      try { endDateStr = format(parseISO(itinerary.endDate), 'yyyy-MM-dd'); } catch(e) {}
    }
    
    return (
      <Card 
        style={{ marginBottom: 24, borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}
        styles={{ body: { paddingTop: 24, paddingBottom: 24 } }}
      >
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={14}>
            <Title level={2} style={{ margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>
              <EnvironmentOutlined style={{ color: 'var(--primary-color)' }} /> {itinerary.title}
            </Title>
            <Text type="secondary" style={{ display: 'inline-block', marginTop: 8, fontSize: '1rem' }}>
              <CalendarOutlined style={{ marginRight: 8 }} />
              {startDateStr} 至 {endDateStr}
            </Text>
          </Col>
          <Col xs={24} md={10} style={{ textAlign: 'right' }}>
            <Space size="middle" wrap>
              <Button icon={<SyncOutlined />} onClick={handleRegenerateItinerary} loading={regenerating} style={{ borderRadius: 'var(--radius-md)' }}>
                重新规划
              </Button>
              <Button icon={<LinkOutlined />} onClick={() => setQrModalVisible(true)} disabled={!amapLink} style={{ borderRadius: 'var(--radius-md)' }}>
                分享
              </Button>
              <Button icon={<CloudOutlined />} onClick={() => fetchWeather(itinerary.destination)} loading={weatherLoading} style={{ borderRadius: 'var(--radius-md)' }}>
                天气
              </Button>
              <Button danger icon={<DeleteOutlined />} onClick={handleDeleteItinerary} style={{ borderRadius: 'var(--radius-md)' }}>
                删除
              </Button>
            </Space>
          </Col>
        </Row>
        {itinerary.budget > 0 && (
          <>
            <Divider style={{ marginTop: 24, marginBottom: 24, borderColor: 'var(--border-color)' }} />
            <Row gutter={[24, 24]}>
              <Col xs={12} md={8}>
                <Statistic title={<span style={{ color: 'var(--text-secondary)' }}>人均预算</span>} value={itinerary.budget} prefix="¥" valueStyle={{ fontWeight: 600, color: 'var(--text-main)' }} />
              </Col>
              <Col xs={12} md={8}>
                <Statistic title={<span style={{ color: 'var(--text-secondary)' }}>预估总花费</span>} value={itinerary.estimatedCost} prefix="¥" valueStyle={{ fontWeight: 600, color: 'var(--text-main)' }} />
              </Col>
              <Col xs={24} md={8}>
                <Statistic 
                  title={<span style={{ color: 'var(--text-secondary)' }}>预算充足</span>} 
                  value={itinerary.budget >= itinerary.estimatedCost ? '是' : '否'} 
                  valueStyle={{ color: itinerary.budget >= itinerary.estimatedCost ? '#059669' : '#DC2626', fontWeight: 600 }}
                  prefix={itinerary.budget >= itinerary.estimatedCost ? <CheckCircleOutlined /> : <WalletOutlined />}
                />
              </Col>
            </Row>
          </>
        )}
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
      
      <Row gutter={[24, 24]}>
        <Col span={24}>
          {renderDateTabs()}
        </Col>
      </Row>
      
      {/* 分享二维码弹窗 */}
      <Modal
        title="分享行程"
        open={qrModalVisible}
        onCancel={() => setQrModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setQrModalVisible(false)}>
            关闭
          </Button>
        ]}
      >
        {amapLink ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 16 }}>
              <Text>使用高德地图扫描下方二维码，查看完整行程</Text>
            </div>
            <div>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(amapLink)}`} 
                alt="高德地图行程二维码" 
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
            <div style={{ marginTop: 16 }}>生成分享码中...</div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ItineraryDetailPage; 