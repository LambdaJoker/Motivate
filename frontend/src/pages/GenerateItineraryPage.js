import React, { useState, useEffect } from 'react';
import { 
  Form, Input, DatePicker, InputNumber, Button, Select, 
  Typography, Card, message, Space, Divider, List, Skeleton
} from 'antd';
import { 
  PlusOutlined, MinusCircleOutlined, 
  EnvironmentOutlined, CalendarOutlined, RightOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { itineraryApi } from '../services/api';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const GenerateItineraryPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [itineraries, setItineraries] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchItineraries();
  }, []);

  const fetchItineraries = async () => {
    try {
      setListLoading(true);
      const data = await itineraryApi.getAllItineraries();
      setItineraries(data);
    } catch (error) {
      message.error('获取行程列表失败');
    } finally {
      setListLoading(false);
    }
  };

  // 生成旅行攻略
  const onFinish = async (values) => {
    try {
      setLoading(true);
      
      const formattedValues = {
        ...values,
        origin: values.origin || '', // Ensure origin is not undefined
        startDate: values.startDate.format('YYYY-MM-DD'),
        mustVisitSpots: values.spots
          .filter(spot => spot.isRequired)
          .map(spot => spot.name),
        optionalSpots: values.spots
          .filter(spot => !spot.isRequired)
          .map(spot => spot.name),
      };
      
      delete formattedValues.spots;
      
      const result = await itineraryApi.generateItinerary(formattedValues);
      
      message.success('旅行攻略生成成功！');
      
      navigate(`/itinerary/${result.id}`);
      fetchItineraries();
    } catch (error) {
      console.error('生成旅行攻略失败:', error);
      const errorMessage = error.response?.data?.message || '生成攻略失败，请重试';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px', display: 'flex', gap: 24 }}>
      {/* Left side: Form */}
      <div style={{ flex: 1 }}>
        <Card 
          bordered={false} 
          style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
        >
          <Title level={2} style={{ textAlign: 'center', marginBottom: 32 }}>
            <CalendarOutlined /> 智能生成旅行攻略
          </Title>
          
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            requiredMark="optional"
            initialValues={{
              transportMode: 'driving',
              durationDays: 3,
              spots: [{ name: '', isRequired: true }]
            }}
          >
            <Form.Item
              label="旅行标题"
              name="title"
              rules={[{ required: true, message: '请输入旅行标题' }]}
            >
              <Input placeholder="例如：三亚五日游" />
            </Form.Item>
            
            <Space style={{ display: 'flex', marginBottom: 0 }} align="start">
              <Form.Item
                label="出发地"
                name="origin"
                style={{ width: '100%' }}
                rules={[{ required: false }]}
              >
                <Input placeholder="（选填）例如：广州" prefix={<EnvironmentOutlined />} />
              </Form.Item>

              <Form.Item
                label="目的地"
                name="destination"
                rules={[{ required: true, message: '请输入旅行目的地' }]}
                style={{ width: '100%' }}
              >
                <Input placeholder="例如：三亚" prefix={<EnvironmentOutlined />} />
              </Form.Item>
            </Space>
            
            <Space style={{ display: 'flex', marginBottom: 24 }} align="start">
              <Form.Item
                label="出发日期"
                name="startDate"
                rules={[{ required: true, message: '请选择出发日期' }]}
                style={{ width: '100%' }}
              >
                <DatePicker style={{ width: '100%' }} disabledDate={(date) => date.isBefore(dayjs().subtract(1, 'day'))} />
              </Form.Item>
              
              <Form.Item
                label="行程天数"
                name="durationDays"
                rules={[{ required: true, message: '请输入行程天数' }]}
                style={{ width: '100%' }}
              >
                <InputNumber min={1} max={30} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                label="人均预算(元)"
                name="budget"
                style={{ width: '100%' }}
              >
                <InputNumber min={0} style={{ width: '100%' }} formatter={value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => (value || '').replace(/¥\s?|(,*)/g, '')} />
              </Form.Item>
            </Space>
            
            <Form.Item
              label="交通方式"
              name="transportMode"
              rules={[{ required: true, message: '请选择景点间的交通方式' }]}
            >
              <Select>
                <Option value="driving">打车</Option>
                <Option value="walking">步行</Option>
                <Option value="bicycling">骑行</Option>
                <Option value="transit">公交</Option>
              </Select>
            </Form.Item>
            
            <Form.Item
              label="行程描述"
              name="description"
              rules={[{ required: false }]}
            >
              <TextArea placeholder="请输入行程描述或特殊要求" rows={4} />
            </Form.Item>
            
            <Divider orientation="left">景点安排</Divider>
            
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
                        <Input placeholder="景点名称" />
                      </Form.Item>
                      
                      <Form.Item
                        {...restField}
                        name={[name, 'isRequired']}
                        valuePropName="checked"
                      >
                        <Select style={{ width: 120 }}>
                          <Option value={true}>必游景点</Option>
                          <Option value={false}>可选景点</Option>
                        </Select>
                      </Form.Item>
                      
                      {fields.length > 1 ? (
                        <MinusCircleOutlined onClick={() => remove(name)} />
                      ) : null}
                    </Space>
                  ))}
                  
                  <Form.Item>
                    <Button 
                      type="dashed" 
                      onClick={() => add()} 
                      block 
                      icon={<PlusOutlined />}
                    >
                      添加景点
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
            
            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                style={{ 
                  width: '100%', 
                  height: 45, 
                  fontSize: 16, 
                  marginTop: 16 
                }}
              >
                生成旅行攻略
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>

      {/* Right side: List of itineraries */}
      <div style={{ flex: 1 }}>
        <Card
          title="我创建的行程"
          bordered={false}
          style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', height: '100%' }}
        >
          <Skeleton loading={listLoading} active avatar>
            <List
              itemLayout="horizontal"
              dataSource={itineraries}
              locale={{ emptyText: '您还没有创建任何行程' }}
              renderItem={item => (
                <List.Item
                  actions={[<Button type="link" icon={<RightOutlined />} onClick={() => navigate(`/itinerary/${item.id}`)}>查看详情</Button>]}
                >
                  <List.Item.Meta
                    title={<a onClick={() => navigate(`/itinerary/${item.id}`)}>{item.title}</a>}
                    description={`${dayjs(item.startDate).format('YYYY-MM-DD')} - ${dayjs(item.endDate).format('YYYY-MM-DD')}`}
                  />
                </List.Item>
              )}
            />
          </Skeleton>
        </Card>
      </div>
    </div>
  );
};

export default GenerateItineraryPage; 