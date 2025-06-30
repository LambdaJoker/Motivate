import axios from 'axios';

// const API_URL = process.env.REACT_APP_API_URL || '';
const API_URL = 'http://localhost:3000/api';

// 创建axios实例
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器，添加token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器，处理错误
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // 如果是401错误，可能是token过期，清除token并跳转到登录页
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 行程相关API
const itineraryApi = {
  // 获取所有行程
  getAllItineraries: () => api.get('/itineraries'),
  
  // 获取单个行程详情
  getItineraryById: (id) => api.get(`/itineraries/${id}`),
  
  // 获取行程完整信息（包含行程项）
  getItineraryWithItems: (id) => api.get(`/itineraries/${id}/full`),
  
  // 创建新行程
  createItinerary: (data) => api.post('/itineraries', data),
  
  // 生成旅行攻略
  generateItinerary: (data) => api.post('/itineraries/generate', data),
  
  // 添加行程项
  addPlanItem: (itineraryId, data) => api.post(`/itineraries/${itineraryId}/plan-items`, data),
  
  // 获取特定日期的行程项
  getPlanItemsForDate: (itineraryId, date) => api.get(`/itineraries/${itineraryId}/plan-items?planDate=${date}`),
  
  // 获取特定日期的路线规划
  getRouteForDate: (itineraryId, date) => api.get(`/itineraries/${itineraryId}/route?planDate=${date}`),
};

// 高德地图相关API
const amapApi = {
  // 搜索POI
  search: (keywords, city) => api.get(`/amap/search?keywords=${encodeURIComponent(keywords)}&city=${encodeURIComponent(city || '')}`),
  
  // 获取天气信息
  getWeather: (city) => api.get(`/amap/weather?city=${encodeURIComponent(city)}`),
  
  // 获取POI详情
  getPoiDetail: (id) => api.get(`/amap/poi/${id}`),
  
  // 获取步行路线
  getWalkingRoute: (origin, destination) => api.get(`/amap/route/walking?origin=${origin}&destination=${destination}`),
  
  // 获取骑行路线
  getBicyclingRoute: (origin, destination) => api.get(`/amap/route/bicycling?origin=${origin}&destination=${destination}`),
  
  // 获取驾车路线
  getDrivingRoute: (planItems) => api.post(`/amap/route/driving`, planItems),
  
  // 生成导航链接
  generateNavigationUrl: (start, end, mode) => api.post(`/amap/navigation-url`, { start, end, mode }),
  
  // 生成地图链接
  generateMapLink: (planItems, title) => api.post(`/amap/map-link`, { planItems, title }),
};

// 认证相关API
const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
};

export { api as default, itineraryApi, amapApi, authApi }; 