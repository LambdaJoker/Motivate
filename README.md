# 旅行攻略智能规划网站 (TripAgent)

基于 NestJS 和 React 构建的智能旅行攻略规划网站。本项目深度集成了大语言模型（DeepSeek/MiniMax）和高德地图 API，能够根据用户的预算、天数、偏好一键生成包含详细时间、地点和预估花费的行程，并在地图上提供完美的交互式可视化体验。

## 技术栈

### 后端
- **框架**: NestJS (Node.js)
- **数据库**: MySQL 8.0+
- **ORM**: Prisma
- **认证**: JWT (JSON Web Token)
- **AI 引擎**: OpenAI SDK (兼容 DeepSeek/MiniMax，支持 Function Calling)
- **地理服务**: 高德地图 Web API

### 前端
- **框架**: React (v18+)
- **UI 组件库**: Ant Design v5
- **地图组件**: `@amap/amap-jsapi-loader` (高德地图 JS API 2.0)
- **交互强化**: `@dnd-kit/core` (支持行程拖拽排序)
- **时间处理**: date-fns / dayjs
- **HTTP客户端**: Axios

## 核心功能特性

- 🔐 **用户系统**: 完整的注册和登录功能，个人行程数据云端保存。
- 🤖 **AI 智能一键规划**: 输入出发地、目的地、天数和预算，AI 自动生成精确到每天每个时间段的详细行程（支持跨城大交通如飞机/高铁的精准估算）。
- 🌍 **高德地图深度联动**:
  - AI 生成的景点自动转换为全国精确经纬度。
  - 右侧地图自动绘制每日游览路线折线图，采用定制化水滴形图标，智能识别交通方式（如火箭代表飞机）。
  - **图文双向联动**: 点击左侧时间轴景点，右侧地图平滑缩放并高亮对应坐标；点击右侧地图标点，左侧行程单自动平滑滚动定位并展开详情。
- 📱 **社交攻略自动抓取**: AI 在生成行程时会自动调用工具搜索小红书/抖音等平台的最新避坑指南和美食推荐。
- 🔄 **灵活的行程管理**:
  - **自由编辑**: 支持增、删、改行程项，且支持**拖拽排序 (Drag & Drop)**，后端同步更新。
  - **重新规划**: 对生成的行程不满意？一键重置，保留原参数重新生成，告别数据冗余。
- 🔗 **行程分享与导出**: 
  - 一键生成带有高德地图导航链接的二维码，方便手机扫码查看。
  - 支持导出至系统日历 (.ics 文件)。

## 本地开发指南

### 前提条件

- Node.js 18.x 或更高版本
- MySQL 8.0+ 数据库
- [高德地图开发者账号](https://console.amap.com/dev/key/app) (需申请 Web 服务 API Key 和 Web 端 JS API Key)
- 大语言模型 API Key (推荐使用 DeepSeek 或 MiniMax)

### 安装与启动步骤

1. **克隆仓库**：
   ```bash
   git clone <仓库地址>
   cd Motivate
   ```

2. **后端配置与启动**：
   进入 `backend` 目录，安装依赖：
   ```bash
   cd backend
   npm install
   ```
   
   在 `backend` 根目录下创建 `.env` 文件，填入以下配置：
   ```env
   # 数据库配置 (Prisma)
   DATABASE_URL="mysql://用户名:密码@localhost:3306/motivate_db"

   # JWT 认证
   JWT_SECRET="你的超强随机字符串密钥"

   # 高德地图配置 (Web服务 API Key)
   AMAP_KEY="你的高德地图_Web服务_API密钥"

   # 大模型配置 (以 MiniMax 为例)
   LLM_API_KEY="你的大模型API密钥"
   LLM_BASE_URL="https://api.minimaxi.com/v1"
   LLM_MODEL_NAME="MiniMax-M2.5"
   ```

   同步数据库结构并启动后端：
   ```bash
   npx prisma db push
   npm run start:dev
   ```
   *(后端默认运行在 `http://localhost:3001`)*

3. **前端配置与启动**：
   新开一个终端，进入 `frontend` 目录，安装依赖：
   ```bash
   cd frontend
   npm install
   ```

   在 `frontend` 根目录下创建 `.env` 文件，填入以下配置：
   ```env
   REACT_APP_API_URL=http://localhost:3001
   REACT_APP_AMAP_KEY=你的高德地图_Web端_JS_API密钥
   REACT_APP_AMAP_SECURITY_CODE=你的高德地图_安全密钥
   ```

   启动前端开发服务器：
   ```bash
   npm start
   ```
   *(前端默认运行在 `http://localhost:3000`)*

## 使用说明

1. 访问 `http://localhost:3000` 并注册一个新账号。
2. 登录后，点击导航栏的 **"生成行程"**。
3. 填写出发地（如"南昌"）、目的地（如"五台山"）、天数、预算（如"6000"）以及必去景点。
4. 点击生成，等待 AI 大脑飞速运转（期间会在后台抓取攻略）。
5. 生成完毕后，进入详情页。左侧为可折叠的详细时间轴，右侧为路线地图。
6. 点击时间轴上的卡片，地图将自动为你拉近视角。

## 常见问题 (FAQ)

- **地图显示空白或报错 "Script error"？**
  请检查 `frontend/.env` 中的 `REACT_APP_AMAP_KEY` 和 `REACT_APP_AMAP_SECURITY_CODE` 是否配置正确，并且是在高德控制台申请的 **Web端(JS API)** 密钥，而非 Web 服务密钥。

- **生成行程时提示 "大模型生成行程失败"？**
  1. 请检查 `backend/.env` 中的 `LLM_API_KEY` 是否有效且有余额。
  2. 观察后端控制台日志，查看 `RAW LLM OUTPUT` 是否提示并发限制或模型名称配置错误。

## 贡献指南

欢迎提交 Pull Request 改进代码，或是开启 Issue 讨论新功能。在提交 PR 前，请确保代码通过了基本的 ESLint 检查。