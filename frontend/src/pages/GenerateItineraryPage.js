import React, { useState } from 'react';
import { 
  Form, Input, DatePicker, InputNumber, Button, Select, 
  Typography, Card, Space, Divider, Row, Col, App, Collapse, Tag
} from 'antd';
import { 
  PlusOutlined, MinusCircleOutlined, 
  EnvironmentOutlined, CalendarOutlined,
  LoadingOutlined, CheckCircleOutlined, BulbOutlined, RightOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { itineraryApi, llmApi } from '../services/api';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { CheckableTag } = Tag;

const PREFERENCES = [
  { value: 'nature', label: '⛰️ 自然风光' },
  { value: 'food', label: '🍜 特色美食' },
  { value: 'culture', label: '🏛️ 历史文化' },
  { value: 'relax', label: '☕ 休闲放松' },
  { value: 'social', label: '👫 社交约会' },
  { value: 'trend', label: '📸 网红打卡' },
  { value: 'growth', label: '🌱 亲子游玩' },
  { value: 'fun', label: '⛺ 探索冒险' },
];

const SURPRISE_DESTINATIONS = ['东京', '巴黎', '三亚', '成都', '大理', '京都', '巴厘岛', '清迈', '重庆', '杭州'];

const GenerateItineraryPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [progressLogs, setProgressLogs] = useState([]);
  const [taskId, setTaskId] = useState('');
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [selectedPrefs, setSelectedPrefs] = useState([]);

  const handleSurpriseMe = () => {
    const randomDest = SURPRISE_DESTINATIONS[Math.floor(Math.random() * SURPRISE_DESTINATIONS.length)];
    form.setFieldsValue({ destination: randomDest });
  };

  const handlePrefChange = (val, checked) => {
    const nextSelectedTags = checked ? [...selectedPrefs, val] : selectedPrefs.filter((t) => t !== val);
    setSelectedPrefs(nextSelectedTags);
    form.setFieldsValue({ travelPreference: nextSelectedTags });
  };

  React.useEffect(() => {
    document.title = '新建行程 - TripAgent';
    return () => {
      document.title = 'TripAgent';
    };
  }, []);

  React.useEffect(() => {
    let intervalId;
    if (loading && taskId) {
      intervalId = setInterval(async () => {
        try {
          const res = await llmApi.getProgress(taskId);
          if (res.logs && res.logs.length > 0) {
            setProgressLogs(res.logs);
          }
        } catch (e) {
          console.error('获取进度失败', e);
        }
      }, 1500); // 每1.5秒拉取一次
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [loading, taskId]);

  // 生成旅行攻略
  const onFinish = async (values) => {
    const currentTaskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setTaskId(currentTaskId);
    setProgressLogs(['准备启动 AI 引擎...']);

    try {
      setLoading(true);
      
      const formattedValues = {
        ...values,
        origin: values.origin || '', // Ensure origin is not undefined
        startDate: values.startDate.format('YYYY-MM-DD'),
        mustVisitSpots: (values.spots || [])
          .filter(spot => spot && spot.isRequired === true)
          .map(spot => spot.name),
        optionalSpots: (values.spots || [])
          .filter(spot => spot && spot.isRequired === false)
          .map(spot => spot.name),
        taskId: currentTaskId
      };
      
      delete formattedValues.spots;
      
      const result = await itineraryApi.generateItinerary(formattedValues);
      
      message.success('旅行攻略生成成功！');
      
      navigate(`/itinerary/${result.id}`);
      window.dispatchEvent(new Event('refresh-itineraries'));
    } catch (error) {
      console.error('生成旅行攻略失败:', error);
      const errorMessage = error.response?.data?.message || '生成攻略失败，请重试';
      message.error(errorMessage);
    } finally {
      setLoading(false);
      try {
        await llmApi.clearProgress(currentTaskId);
      } catch (e) {}
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 16px 64px', position: 'relative' }}>
      <Card 
        variant="borderless" 
        style={{ background: 'transparent' }}
        styles={{ body: { padding: '48px 0' } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Title level={1} style={{ margin: '0 0 16px 0', fontWeight: 800, letterSpacing: '-0.025em', fontSize: '3rem', color: '#111827' }}>
            Where to next?
          </Title>
          <div style={{ color: '#6b7280', fontSize: '1.125rem', fontWeight: 500 }}>
            Tell us your travel ideas, and our AI will craft the perfect itinerary for you.
          </div>
        </div>
          
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            requiredMark="optional"
            initialValues={{
              transportMode: 'driving',
              durationDays: 3,
              travelPreference: [],
              spots: []
            }}
            style={{
              background: '#ffffff',
              padding: '40px',
              borderRadius: '24px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
              border: '1px solid #f3f4f6'
            }}
          >
            <Form.Item
              label={<span style={{ fontWeight: 600, color: '#111827', fontSize: '1.05rem' }}>行程标题</span>}
              name="title"
              rules={[{ required: true, message: '请输入标题' }]}
              hasFeedback
            >
              <Input placeholder="例如：东京五日游" size="large" style={{ borderRadius: 12, background: '#f9fafb' }} />
            </Form.Item>
            
            <Space style={{ display: 'flex', marginBottom: 0 }} align="start">
              <Form.Item
                label={<span style={{ fontWeight: 600, color: '#111827', fontSize: '1.05rem' }}>出发地</span>}
                name="origin"
                style={{ width: '100%' }}
                rules={[{ required: false }]}
              >
                <Input placeholder="选填" size="large" style={{ borderRadius: 12, background: '#f9fafb' }} prefix={<EnvironmentOutlined style={{ color: '#9ca3af' }} />} />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontWeight: 600, color: '#111827', fontSize: '1.05rem' }}>目的地</span>}
                name="destination"
                rules={[{ required: true, message: '请输入目的地' }]}
                style={{ width: '100%' }}
                hasFeedback
              >
                <Input 
                  placeholder="想去哪里？" 
                  size="large" 
                  style={{ borderRadius: 12, background: '#f9fafb' }} 
                  prefix={<EnvironmentOutlined style={{ color: '#9ca3af' }} />} 
                  addonAfter={
                    <Button type="text" size="small" icon={<BulbOutlined />} onClick={handleSurpriseMe} style={{ color: 'var(--primary-color)', fontWeight: 500, border: 'none', background: 'transparent' }}>
                      随机灵感
                    </Button>
                  }
                />
              </Form.Item>
            </Space>
            
            <Space style={{ display: 'flex', marginBottom: 24 }} align="start">
              <Form.Item
                label={<span style={{ fontWeight: 600, color: '#111827', fontSize: '1.05rem' }}>出发日期</span>}
                name="startDate"
                rules={[{ required: true, message: '请选择日期' }]}
                style={{ width: '100%' }}
                hasFeedback
              >
                <DatePicker size="large" style={{ width: '100%', borderRadius: 12, background: '#f9fafb' }} disabledDate={(date) => date.isBefore(dayjs().subtract(1, 'day'))} />
              </Form.Item>
              
              <Form.Item
                label={<span style={{ fontWeight: 600, color: '#111827', fontSize: '1.05rem' }}>游玩天数</span>}
                name="durationDays"
                rules={[{ required: true, message: '请输入天数' }]}
                style={{ width: '100%' }}
                hasFeedback
              >
                <InputNumber size="large" min={1} max={30} style={{ width: '100%', borderRadius: 12, background: '#f9fafb' }} />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontWeight: 600, color: '#111827', fontSize: '1.05rem' }}>人均预算</span>}
                name="budget"
                style={{ width: '100%' }}
              >
                <InputNumber size="large" min={0} style={{ width: '100%', borderRadius: 12, background: '#f9fafb' }} formatter={value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => (value || '').replace(/¥\s?|(,*)/g, '')} />
              </Form.Item>
            </Space>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label={<span style={{ fontWeight: 600, color: '#111827', fontSize: '1.05rem' }}>出行方式</span>}
                  name="transportMode"
                  rules={[{ required: true, message: '请选择出行方式' }]}
                >
                  <Select size="large" style={{ borderRadius: 12 }}>
                    <Option value="driving">🚗 自驾 / 打车</Option>
                    <Option value="transit">🚇 公共交通</Option>
                    <Option value="walking">🚶 步行</Option>
                    <Option value="bicycling">🚲 骑行</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={<span style={{ fontWeight: 600, color: '#111827', fontSize: '1.05rem' }}>偏好设置</span>}
                  name="travelPreference"
                  rules={[{ required: false }]}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {PREFERENCES.map((pref) => (
                      <CheckableTag
                        key={pref.value}
                        checked={selectedPrefs.includes(pref.value)}
                        onChange={(checked) => handlePrefChange(pref.value, checked)}
                        style={{
                          border: selectedPrefs.includes(pref.value) ? '1px solid var(--primary-color)' : '1px solid #d1d5db',
                          background: selectedPrefs.includes(pref.value) ? '#eef2ff' : '#f9fafb',
                          color: selectedPrefs.includes(pref.value) ? 'var(--primary-color)' : '#4b5563',
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {pref.label}
                      </CheckableTag>
                    ))}
                  </div>
                </Form.Item>
              </Col>
            </Row>
            
            <Collapse 
              ghost 
              expandIcon={({ isActive }) => <RightOutlined rotate={isActive ? 90 : 0} style={{ color: '#6b7280' }} />}
              style={{ background: '#f8fafc', borderRadius: '16px', marginBottom: 24, border: '1px solid #e2e8f0' }}
              items={[{
                key: '1',
                label: <span style={{ fontWeight: 600, color: '#374151' }}>高级选项（指定景点、特殊要求）</span>,
                children: (
                  <>
                    <Form.Item
                      label={<span style={{ fontWeight: 500, color: '#4b5563' }}>特殊要求</span>}
                      name="description"
                      rules={[{ required: false }]}
                    >
                      <TextArea placeholder="有任何特殊饮食要求、节奏偏好或想避开的地方吗？" rows={3} style={{ borderRadius: 12, background: '#ffffff', resize: 'none' }} />
                    </Form.Item>
                    
                    <div style={{ color: '#4b5563', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>指定景点</div>
                    <Form.List name="spots">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space 
                      key={key} 
                      style={{ display: 'flex', marginBottom: 8 }} 
                      align="baseline"
                    >
                      <Form.Item
                        {...restField}
                        name={[name, 'name']}
                        rules={[{ required: true, message: '请输入景点名称' }]}
                      >
                        <Input placeholder="景点名称" style={{ borderRadius: 8, background: '#ffffff' }} />
                      </Form.Item>
                      
                      <Form.Item
                        {...restField}
                        name={[name, 'isRequired']}
                        initialValue={true}
                      >
                        <Select style={{ width: 100, borderRadius: 8 }}>
                          <Option value={true}>必去</Option>
                          <Option value={false}>可选</Option>
                        </Select>
                      </Form.Item>
                      
                      <MinusCircleOutlined title="移除" aria-label="移除" onClick={() => remove(name)} style={{ color: '#ef4444', fontSize: 18 }} />
                    </Space>
                  ))}
                          
                          <Form.Item>
                            <Button 
                              type="dashed" 
                              onClick={() => add()} 
                              block 
                              icon={<PlusOutlined />}
                              style={{ borderRadius: 8, borderColor: '#cbd5e1', color: '#64748b' }}
                            >
                              添加景点
                            </Button>
                          </Form.Item>
                        </>
                      )}
                    </Form.List>
                  </>
                )
              }]}
            />
            
            {loading && progressLogs.length > 0 && (
              <div style={{ 
                marginTop: 16, 
                marginBottom: 24, 
                padding: '24px', 
                background: '#f8fafc', 
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.02)'
              }}>
                <div style={{ fontSize: 14, color: 'var(--primary-color)', marginBottom: 16, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                  <LoadingOutlined style={{ marginRight: 8, fontSize: 18 }} />
                  AI 正在思考中...
                </div>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  {progressLogs.map((log, index) => {
                    const isLast = index === progressLogs.length - 1;
                    return (
                      <div key={index} style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start',
                        color: isLast ? '#1e293b' : '#94a3b8',
                        fontWeight: isLast ? 500 : 400,
                        opacity: isLast ? 1 : 0.6,
                        transform: isLast ? 'translateX(4px)' : 'translateX(0)',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}>
                        <div style={{ marginRight: 12, marginTop: 2 }}>
                          {isLast ? <span style={{ color: 'var(--primary-color)' }}>✨</span> : <CheckCircleOutlined style={{ color: '#10b981' }} />}
                        </div>
                        <div style={{ flex: 1, lineHeight: 1.5, fontSize: 14 }}>
                          {log}
                        </div>
                      </div>
                    );
                  })}
                </Space>
              </div>
            )}
            
            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                style={{ 
                  width: '100%', 
                  height: 56, 
                  fontSize: 18, 
                  marginTop: loading ? 8 : 24,
                  fontWeight: 600,
                  borderRadius: 16,
                  background: 'var(--primary-color)',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)'
                }}
              >
                {loading ? 'AI 正在努力规划中...' : '✨ 立即生成专属行程'}
              </Button>
            </Form.Item>
          </Form>
        </Card>
    </div>
  );
};

export default GenerateItineraryPage; 