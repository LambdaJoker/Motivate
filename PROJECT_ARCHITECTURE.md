# 旅游路线规划网站 - 项目架构设计文档

## 1. 项目概述

本项目旨在开发一个智能旅游路线规划网站。用户可以根据个人需求，创建、定制和管理自己的旅游行程。系统需支持多目的地路线规划，精确到特定时间点的安排，并在地图上进行可视化展示，同时提供每个地点（POI）的详细介绍。项目将遵循企业级开发标准，保证代码质量、可扩展性和可维护性。

### 核心功能：
- **用户系统**：支持用户注册、登录、个人信息管理。
- **行程创建**：用户可以创建新的旅游行程，定义行程名称、起止日期等。
- **目的地规划**：在行程中添加、删除、编辑多个目的地（POI）。
- **时间规划**：为每个目的地设置计划到达和离开时间。
- **路线可视化**：在地图上实时绘制和展示行程中各地之间的路线（驾车、步行、骑行等）。
- **行程管理**：保存、查看、分享用户的行程方案。
- **POI信息查询**：集成高德地图搜索，提供目的地点的详细信息（如地址、评分、照片等）。

---

## 2. 技术选型

- **前端**：`React` (使用 `Vite` + `TypeScript` 模板)
    - **UI 框架**：Ant Design 或 Material-UI，用于快速构建美观的界面。
    - **状态管理**：Redux Toolkit 或 Zustand。
    - **地图引擎**：高德地图 JavaScript API 2.0。
- **后端**：
    - **主框架**：`Node.js` + `NestJS` (使用 `TypeScript`)。NestJS 提供了模块化、依赖注入等企业级特性，非常适合构建可维护的后端服务。
    - **Python 服务 (可选)**：未来可用于实现复杂算法，如路线智能优化 (TSP问题)、旅游推荐算法等。初期可以先不引入。
- **数据库**：`MySQL`
    - **ORM**：`TypeORM` (配合 NestJS 使用) 或 `Prisma`。
- **API 通信**：`RESTful API` 或 `GraphQL`。
- **代码管理**：`Git` + `pnpm monorepo`，统一管理前后端代码。
- **部署**：`Docker` 容器化 + `CI/CD` (如 GitHub Actions)。

---

## 3. 系统架构设计

我们将采用前后端分离的微服务友好型架构。

### 3.1. 架构图

```mermaid
graph TD
    subgraph "用户端"
        A[用户浏览器/User Browser <br/> React SPA]
    end

    subgraph "云端服务 (Cloud Services)"
        B[API网关 (API Gateway) <br/> Nginx]
        C[用户服务 (User Service) <br/> Node.js/NestJS]
        D[行程服务 (Itinerary Service) <br/> Node.js/NestJS]
        E[地图服务 (Map Service) <br/> Node.js/NestJS]
        F[数据库 (MySQL DB)]
        G[高德地图API (Amap API)]
    end

    A -- "HTTPS/API请求" --> B
    B -- "路由到 -> /auth/*" --> C
    B -- "路由到 -> /itineraries/*" --> D
    B -- "路由到 -> /map/*" --> E

    C -- "读写用户数据" --> F
    D -- "读写行程数据" --> F
    E -- "封装并调用" --> G
    
    G -- "地图数据" --> E
    E -- "处理后数据" --> B
    C -- "处理后数据" --> B
    D -- "处理后数据" --> B
    B -- "API响应" --> A
```

### 3.2. 后端架构

后端采用基于 `NestJS` 的模块化设计，初期可以是一个单体应用，但逻辑上分离，为未来拆分为微服务做好准备。

- **`AppModule` (根模块)**
- **`AuthModule` (认证模块)**：处理用户注册、登录（JWT 认证）、身份验证等。
- **`UserModule` (用户模块)**：管理用户资料。
- **`ItineraryModule` (行程模块)**：核心业务模块，负责行程和目的地的增删改查。
- **`MapModule` (地图模块)**：作为高德地图API的代理和封装层。所有与高德的交互（如POI搜索、路径规划、地理编码等）都在此模块中处理，避免业务逻辑与第三方服务直接耦合。

### 3.3. 数据库设计 (MySQL)

#### a. `users` - 用户表
```sql
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(255) NOT NULL UNIQUE,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### b. `itineraries` - 行程表
```sql
CREATE TABLE `itineraries` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `start_date` DATE,
  `end_date` DATE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
```

#### c. `destinations` - 目的地表
```sql
CREATE TABLE `destinations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `itinerary_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `address` VARCHAR(255),
  `latitude` DECIMAL(10, 8) NOT NULL,
  `longitude` DECIMAL(11, 8) NOT NULL,
  `poi_id` VARCHAR(255),
  `arrival_time` DATETIME,
  `departure_time` DATETIME,
  `notes` TEXT,
  `sequence` INT NOT NULL COMMENT '目的地在行程中的顺序',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`itinerary_id`) REFERENCES `itineraries`(`id`) ON DELETE CASCADE
);
```

---

## 4. 开发阶段规划

建议分阶段进行开发，逐步迭代，快速验证核心功能。

### 第一阶段：MVP - 核心后端与项目设置
- **目标**：搭建好项目骨架，完成最核心的后端服务。
1.  **环境搭建**：初始化 pnpm monorepo，包含 `apps/backend` 和 `apps/frontend` 两个目录。
2.  **后端项目初始化**：使用 NestJS CLI 创建后端项目。
3.  **数据库与ORM集成**：配置 TypeORM 连接 MySQL，并根据设计的 schema 创建 Entity 文件。
4.  **用户认证实现**：完成 `AuthModule`，实现用户注册、登录接口，使用 JWT 生成 token。
5.  **地图服务封装**：创建 `MapModule`，封装1-2个基本的高德API调用，如"关键字搜索"和"驾车路径规划"，用于后续测试。

### 第二阶段：MVP - 核心前端功能
- **目标**：实现用户能跑通的核心规划流程。
1.  **前端项目初始化**：使用 Vite + React + TS 创建前端项目。
2.  **实现用户登录/注册页面**：对接第一阶段开发的后端接口。
3.  **创建地图主页面**：
    - 集成高德地图 JS API，渲染出基本地图。
    - 添加一个搜索框，调用后端封装的"关键字搜索"接口，并在地图上标记搜索结果。
4.  **实现简易行程规划**：
    - 允许用户在地图上选点或通过搜索添加目的地到一个列表中。
    - 添加目的地后，调用后端"路径规划"接口，并在地图上绘制出路线。

### 第三阶段：功能完善与优化
- **目标**：完善行程管理的完整闭环和用户体验。
1.  **完善行程管理**：实现行程的创建、保存、加载、编辑、删除功能，对接后端的 `ItineraryModule`。
2.  **优化交互体验**：
    - 实现目的地列表拖拽排序，并实时重新规划路线。
    - 为目的地添加时间选择器。
    - 在地图上显示更丰富的 POI 信息。
3.  **支持多种交通方式**：在前端提供选项，让用户选择驾车、骑行或步行，并调用对应的后端接口。

### 第四阶段：部署与运维
- **目标**：让项目上线，并建立自动化流程。
1.  **编写 Dockerfile**：为前端和后端应用编写 Dockerfile。
2.  **使用 Docker Compose**：在本地编排应用、数据库等服务，方便测试。
3.  **设置 CI/CD**：配置 GitHub Actions，实现代码提交后自动构建、测试和部署到服务器。
4.  **配置 Nginx**：作为反向代理和 API 网关。

---

## 5. 我们应该先做什么？

**答案是：从"第一阶段：MVP - 核心后端与项目设置"开始。**

一个稳定、结构清晰的后端是整个项目成功的基石。

**具体启动步骤：**

1.  **初始化项目仓库**：
    - `git init`
    - 创建一个 `pnpm-workspace.yaml` 文件，配置 monorepo。
    - 创建 `apps/backend` 和 `apps/frontend` 文件夹。
2.  **搭建后端基础**：
    - `cd apps/backend`
    - `npx @nestjs/cli new .`
    - 安装 `TypeORM`, `mysql2`, `@nestjs/typeorm` 等依赖。
3.  **建立数据库连接**：在 `app.module.ts` 中配置好数据库连接信息。
4.  **创建第一个模块 - 用户认证**：
    - `nest g module auth`
    - `nest g controller auth`
    - `nest g service auth`
    - 开始编写注册和登录的逻辑。

完成这些步骤后，您将拥有一个可以运行的、具备用户认证能力的后端服务，为后续所有功能的开发奠定了坚实的基础。 