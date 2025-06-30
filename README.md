# 旅行攻略规划网站

基于NestJS和React的旅行攻略规划网站，集成了高德地图API，帮助用户规划最佳旅行路线。

## 技术栈

### 后端
- NestJS - Node.js框架
- PostgreSQL - 数据库
- Prisma - ORM工具
- JWT - 用户认证
- 高德地图API - 地理信息服务

### 前端
- React - 用户界面库
- Ant Design - UI组件库
- Axios - HTTP客户端
- React Router - 路由管理

## 功能特性

- 用户注册和登录
- 创建和管理旅行计划
- 添加计划项目（景点、餐厅、酒店等）
- 根据地点和日期优化旅行路线
- 查看路线地图和导航
- 获取目的地天气信息

## 安装指南

### 前提条件

- Node.js 14.x或更高版本
- PostgreSQL 12.x或更高版本
- 高德地图开发者账号和API密钥

### 安装步骤

1. 克隆仓库：

```bash
git clone <仓库地址>
cd travel-planner
```

2. 运行安装脚本：

Windows:
```
setup.bat
```

Linux/Mac:
```
chmod +x setup.sh
./setup.sh
```

3. 配置环境变量：

编辑`backend/.env`文件，填入你的数据库连接信息和高德地图API密钥：

```
DATABASE_URL="postgresql://用户名:密码@localhost:5432/travel_planner"
JWT_SECRET="你的JWT密钥"
AMAP_KEY="你的高德地图API密钥"
AMAP_SECRET="你的高德地图API密钥密钥"
```

4. 启动应用：

后端：
```bash
cd backend
npm run start:dev
```

前端：
```bash
cd frontend
npm run dev
```

5. 访问应用：

打开浏览器访问：http://localhost:3000

## 使用说明

### 用户注册/登录

1. 访问登录页面
2. 新用户点击注册按钮创建账号
3. 使用用户名和密码登录

### 创建旅行计划

1. 登录后点击"新建旅行计划"
2. 填写目的地、开始日期和结束日期
3. 点击保存

### 添加计划项

1. 在行程详情页点击"添加计划项"
2. 搜索目的地（景点、餐厅、酒店等）
3. 选择日期和时间
4. 添加备注（可选）
5. 点击保存

### 查看路线规划

1. 在行程详情页选择日期
2. 系统会自动优化当天的行程路线
3. 点击"查看地图"可在高德地图中查看路线

## 演示账号

可使用以下演示账号登录体验系统功能：

- 用户名：demo
- 密码：demo123

## 文档

- [API文档](docs/api.md)
- [数据库设计](docs/database.md)
- [高德地图API集成](docs/amap.md)
