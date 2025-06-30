import React, { useState, useEffect } from 'react';
import { Card, Tag, Button, Tooltip, Image, Skeleton } from 'antd';
import { EnvironmentOutlined, ClockCircleOutlined, CarOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { amapApi } from '../services/api';

const { Meta } = Card;

// 随机景点图片（实际项目中应使用真实图片或从API获取）
const defaultImages = [
  'https://gw.alipayobjects.com/zos/rmsportal/JiqGstEfoWAOHiTxclqi.png',
  'https://img.alicdn.com/imgextra/i1/O1CN01brn2nn1VP6ak0fROe_!!6000000002649-0-tps-1080-720.jpg',
  'https://img.alicdn.com/imgextra/i4/O1CN01kFiCuF1ysT25MQEtp_!!6000000006630-0-tps-1080-720.jpg',
  'https://img.alicdn.com/imgextra/i4/O1CN01sw3K8m1NQh8uCBaaK_!!6000000001566-0-tps-1080-720.jpg',
  'https://img.alicdn.com/imgextra/i3/O1CN01x7GzUo1cUaNL0fUUy_!!6000000003603-0-tps-1080-720.jpg',
];

// 根据transportMode获取相应的标签
const getTransportModeTag = (mode) => {
  switch (mode) {
    case 'driving':
      return <Tag color="blue" icon={<CarOutlined />}>打车</Tag>;
    case 'walking':
      return <Tag color="green">步行</Tag>;
    case 'bicycling':
      return <Tag color="orange">骑行</Tag>;
    case 'transit':
      return <Tag color="purple">公交</Tag>;
    default:
      return <Tag color="blue" icon={<CarOutlined />}>打车</Tag>;
  }
};

const ScenicSpotCard = ({ 
  planItem, 
  showActions = true, 
  style = {},
  onNavigate,
  onViewDetail 
}) => {
  const [loading, setLoading] = useState(true);
  const [poiDetail, setPoiDetail] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  
  // 获取景点详细信息
  useEffect(() => {
    if (planItem.amapPoiId) {
      setLoading(true);
      
      amapApi.getPoiDetail(planItem.amapPoiId)
        .then((data) => {
          if (data && data.pois && data.pois.length > 0) {
            setPoiDetail(data.pois[0]);
          }
        })
        .catch((error) => {
          console.error('获取景点详情失败:', error);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
    
    // 随机选择一个默认图片
    const randomIndex = Math.floor(Math.random() * defaultImages.length);
    setImageUrl(defaultImages[randomIndex]);
  }, [planItem.amapPoiId]);
  
  // 格式化时间显示
  const formatTime = (timeString) => {
    if (!timeString) return '';
    try {
      return format(new Date(timeString), 'HH:mm', { locale: zhCN });
    } catch {
      return '';
    }
  };
  
  // 卡片操作按钮
  const actions = showActions 
    ? [
        <Tooltip title="在高德地图中导航">
          <Button 
            type="link" 
            icon={<CarOutlined />} 
            onClick={() => onNavigate && onNavigate(planItem)}
          >
            导航
          </Button>
        </Tooltip>,
        <Tooltip title="查看景点详情">
          <Button 
            type="link" 
            icon={<InfoCircleOutlined />} 
            onClick={() => onViewDetail && onViewDetail(planItem, poiDetail)}
          >
            详情
          </Button>
        </Tooltip>,
      ] 
    : [];
  
  return (
    <Card
      hoverable
      style={{ marginBottom: 16, borderRadius: 8, overflow: 'hidden', ...style }}
      cover={
        <div style={{ height: 200, overflow: 'hidden' }}>
          <Image
            alt={planItem.locationName}
            src={imageUrl}
            style={{ objectFit: 'cover', height: '100%', width: '100%' }}
            preview={false}
          />
        </div>
      }
      actions={actions}
    >
      <Skeleton loading={loading} active avatar>
        <Meta
          title={planItem.locationName}
          description={
            <div>
              <p>
                <EnvironmentOutlined style={{ marginRight: 4 }} />
                {poiDetail?.address || planItem.notes || '地址未知'}
              </p>
              {planItem.startTime && (
                <p>
                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                  {formatTime(planItem.startTime)}
                  {planItem.durationMinutes && ` (约${planItem.durationMinutes}分钟)`}
                </p>
              )}
              <div style={{ marginTop: 8 }}>
                {getTransportModeTag(planItem.transportMode)}
                {poiDetail?.type && <Tag color="cyan">{poiDetail.type}</Tag>}
              </div>
            </div>
          }
        />
      </Skeleton>
    </Card>
  );
};

export default ScenicSpotCard; 