import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Card, Typography, Tabs, Spin, Row, Col, Button, 
  message, Divider, Modal, Descriptions, Badge, Tooltip,
  Timeline, Empty, Tag, Space, Statistic
} from 'antd';
import { 
  CalendarOutlined, EnvironmentOutlined, CloudOutlined,
  CarOutlined, QrcodeOutlined, LinkOutlined, WalletOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { format, addDays, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import AMap from '../components/AMap';
import ScenicSpotCard from '../components/ScenicSpotCard';
import { itineraryApi, amapApi } from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const ItineraryDetailPage = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [itinerary, setItinerary] = useState(null);
  const [activeDate, setActiveDate] = useState('');
  const [activeDateItems, setActiveDateItems] = useState([]);
  const [routeData, setRouteData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [selectedSpotDetail, setSelectedSpotDetail] = useState(null);
  const [amapLink, setAmapLink] = useState('');
  const [qrModalVisible, setQrModalVisible] = useState(false);
  
  // 获取行程详情
  useEffect(() => {
    const fetchItinerary = async () => {
      try {
        setLoading(true);
        const data = await itineraryApi.getItineraryWithItems(id);
        setItinerary(data);
        
        // 处理日期数据
        if (data && data.planItems && data.planItems.length > 0) {
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
  }, [id]);
  
  // 获取路线规划
  useEffect(() => {
    if (activeDate && activeDateItems.length > 1) {
      fetchRouteForDate();
    } else {
      setRouteData(null);
    }
  }, [activeDate, activeDateItems]);
  
  // 按日期分组行程项目
  const groupItemsByDate = (planItems) => {
    const grouped = {};
    
    planItems.forEach(item => {
      const dateStr = format(new Date(item.planDate), 'yyyy-MM-dd');
      
      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      
      grouped[dateStr].push(item);
    });
    
    return grouped;
  };
  
  // 获取特定日期的路线规划
  const fetchRouteForDate = async () => {
    try {
      const routeResult = await itineraryApi.getRouteForDate(id, activeDate);
      if (routeResult && routeResult.route && routeResult.route.paths) {
        // 解析路径点
        const path = routeResult.route.paths[0];
        const polyline = [];
        
        if (path && path.steps) {
          path.steps.forEach(step => {
            if (step.polyline) {
              const points = step.polyline.split(';').map(point => {
                const [lng, lat] = point.split(',');
                return [parseFloat(lng), parseFloat(lat)];
              });
              polyline.push(...points);
            }
          });
          
          setRouteData({
            path: polyline,
            distance: path.distance,
            duration: path.duration
          });
        }
      } else {
        setRouteData(null); // 如果没有路径数据，确保清除旧的路线
      }
    } catch (error) {
      console.error('获取路线规划失败:', error);
    }
  };
  
  // 获取天气数据
  const fetchWeather = async (city) => {
    try {
      setWeatherLoading(true);
      const weather = await amapApi.getWeather(city);
      setWeatherData(weather);
    } catch (error) {
      console.error('获取天气信息失败:', error);
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
  
  // 查看景点详情
  const handleViewDetail = (planItem, poiDetail) => {
    setSelectedSpot(planItem);
    setSelectedSpotDetail(poiDetail);
    setModalVisible(true);
  };
  
  // 渲染日期选项卡
  const renderDateTabs = () => {
    if (!itinerary || !itinerary.startDate || !itinerary.endDate) {
      return null;
    }
    
    const startDate = new Date(itinerary.startDate);
    const endDate = new Date(itinerary.endDate);
    const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    const tabs = [];
    
    for (let i = 0; i < diffDays; i++) {
      const date = addDays(startDate, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const formattedDate = format(date, 'MM月dd日', { locale: zhCN });
      const dayOfWeek = format(date, 'EEEE', { locale: zhCN });
      
      const itemCount = itinerary.planItems.filter(
        item => format(new Date(item.planDate), 'yyyy-MM-dd') === dateStr
      ).length;
      
      tabs.push(
        <TabPane 
          tab={
            <div>
              <div>第{i + 1}天</div>
              <div>{formattedDate} {dayOfWeek}</div>
            </div>
          } 
          key={dateStr}
        >
          {renderDateContent(dateStr)}
        </TabPane>
      );
    }
    
    return (
      <Tabs 
        activeKey={activeDate} 
        onChange={setActiveDate}
        type="card"
        size="large"
        style={{ marginBottom: 24 }}
      >
        {tabs}
      </Tabs>
    );
  };
  
  // 渲染日期内容
  const renderDateContent = (dateStr) => {
    const dateItems = itinerary.planItems.filter(
      item => format(new Date(item.planDate), 'yyyy-MM-dd') === dateStr
    ).sort((a, b) => a.orderIndex - b.orderIndex);
    
    if (dateItems.length === 0) {
      return <Empty description="当天没有安排行程" />;
    }
    
    return (
      <Timeline>
        {dateItems.map(item => (
          <Timeline.Item key={item.id}>
            <p><strong>{format(parseISO(item.startTime), 'HH:mm')} - {item.title}</strong></p>
            {item.description && <Text type="secondary">{item.description}</Text>}
            <br/>
            {item.estimatedCost > 0 && (
              <Tag icon={<WalletOutlined />} color="gold">
                预估花费: ¥{item.estimatedCost}
              </Tag>
            )}
            <Button 
              type="link" 
              size="small"
              onClick={() => handleNavigate(item)}
            >
              导航
            </Button>
          </Timeline.Item>
        ))}
      </Timeline>
    );
  };
  
  // 渲染地图
  const renderMap = () => {
    if (!activeDateItems.length) {
      return <Empty description="当天没有行程安排，无法显示地图" />;
    }
    
    const mapMarkers = activeDateItems.map((item, index) => ({
      longitude: item.longitude,
      latitude: item.latitude,
      title: item.locationName,
      infoWindow: `
        <div>
          <h3>${item.locationName}</h3>
          <p>${item.notes || ''}</p>
          ${item.startTime ? `<p>计划时间: ${format(new Date(item.startTime), 'HH:mm', { locale: zhCN })}</p>` : ''}
        </div>
      `
    }));
    
    return (
      <Card bordered={false}>
        <AMap 
          center={activeDateItems[0]} 
          markers={mapMarkers}
          polyline={routeData ? { path: routeData.path } : null}
          style={{ height: 500 }}
          mapKey={process.env.REACT_APP_AMAP_KEY}
        />
      </Card>
    );
  };
  
  // 渲染页面标题和基本信息
  const renderPageHeader = () => {
    if (!itinerary) return null;
    
    return (
      <Card 
        style={{ marginBottom: 24, borderRadius: 16 }}
        bodyStyle={{ paddingTop: 16, paddingBottom: 16 }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              <EnvironmentOutlined /> {itinerary.title}
            </Title>
            <Text type="secondary">
              <CalendarOutlined style={{ marginRight: 8 }} />
              {format(parseISO(itinerary.startDate), 'yyyy-MM-dd')} 至 {format(parseISO(itinerary.endDate), 'yyyy-MM-dd')}
            </Text>
          </Col>
          <Col>
            <Space size="large">
              <Button icon={<LinkOutlined />} onClick={() => setQrModalVisible(true)} disabled={!amapLink}>
                分享到高德地图
              </Button>
              <Button type="primary" icon={<CloudOutlined />} onClick={() => fetchWeather(itinerary.destination)} loading={weatherLoading}>
                天气预报
              </Button>
            </Space>
          </Col>
        </Row>
        {itinerary.budget > 0 && (
          <>
            <Divider style={{ marginTop: 16, marginBottom: 16 }} />
            <Row gutter={16}>
              <Col span={8}>
                <Statistic title="人均预算" value={itinerary.budget} prefix="¥" />
              </Col>
              <Col span={8}>
                <Statistic title="预估总花费" value={itinerary.estimatedCost} prefix="¥" />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="预算充足" 
                  value={itinerary.budget >= itinerary.estimatedCost ? '是' : '否'} 
                  valueStyle={{ color: itinerary.budget >= itinerary.estimatedCost ? '#3f8600' : '#cf1322' }}
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
          
          <Divider>行程地图</Divider>
          
          {renderMap()}
        </Col>
      </Row>
      
      {/* 景点详情弹窗 */}
      <Modal
        title={selectedSpot?.locationName || '景点详情'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            关闭
          </Button>,
          <Button 
            key="navigate" 
            type="primary"
            onClick={() => {
              setModalVisible(false);
              handleNavigate(selectedSpot);
            }}
          >
            导航前往
          </Button>
        ]}
        width={600}
      >
        {selectedSpot && (
          <div>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="景点名称">
                {selectedSpot.locationName}
              </Descriptions.Item>
              <Descriptions.Item label="地址">
                {selectedSpotDetail?.address || selectedSpot.notes || '暂无详细地址'}
              </Descriptions.Item>
              {selectedSpotDetail?.tel && (
                <Descriptions.Item label="联系电话">
                  {selectedSpotDetail.tel}
                </Descriptions.Item>
              )}
              {selectedSpot.startTime && (
                <Descriptions.Item label="计划游览时间">
                  {format(new Date(selectedSpot.startTime), 'HH:mm', { locale: zhCN })}
                  {selectedSpot.durationMinutes && ` (约${selectedSpot.durationMinutes}分钟)`}
                </Descriptions.Item>
              )}
              {selectedSpotDetail?.type && (
                <Descriptions.Item label="景点类型">
                  {selectedSpotDetail.type}
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        )}
      </Modal>
      
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