# City Explorer 技术架构与实现文档 (Technical Documentation)

本文档旨在为开发人员、运维人员及技术审核方提供关于 **City Explorer** 项目的深度技术剖析。文档涵盖了技术选型、架构设计、核心模块实现细节、数据库设计以及安全防护策略。

---

## 1. 技术栈概览 (Technology Stack)

本项目采用目前主流的 **MERN Stack** (MongoDB, Express, React, Node.js) 变体，强调类型安全与高性能。

### 1.1 前端 (Frontend)
*   **核心框架**: React 18 (Hooks, Functional Components)
*   **构建工具**: Vite (极速冷启动与热更新)
*   **语言**: TypeScript (严格类型检查)
*   **路由**: React Router v6
*   **样式方案**: Tailwind CSS (Utility-first CSS framework)
*   **图标库**: Lucide React
*   **状态管理**: React Context / Hooks

### 1.2 后端 (Backend)
*   **运行时**: Node.js
*   **Web 框架**: Express 5.x (Beta/Latest)
*   **语言**: TypeScript
*   **数据库 ORM**: Mongoose 8.x (Schema Validation, Middleware)
*   **鉴权**: JWT (JSON Web Token)
*   **密码加密**: bcryptjs
*   **实时通信**: Socket.io (实现组队位置同步、状态更新)
*   **文件上传**: Multer (处理 Multipart/form-data)

### 1.3 基础设施与安全 (Infrastructure & Security)
*   **数据库**: MongoDB Community Edition (自建/云托管)
*   **流量网关**: Cloudflare (CDN, WAF, SSL, DDoS Protection)
*   **反向代理**: Nginx (可选，用于生产环境负载均衡)
*   **进程管理**: PM2 (守护进程)

---

## 2. 项目目录结构 (Project Structure)

```text
/
├── backend/                 # 后端源码
│   ├── src/
│   │   ├── controllers/     # 业务逻辑控制层 (核心代码)
│   │   ├── middleware/      # 中间件 (Auth, ErrorHandling)
│   │   ├── models/          # Mongoose 数据模型定义
│   │   ├── routes/          # API 路由定义
│   │   ├── utils/           # 工具函数 (如敏感词过滤)
│   │   ├── socket.ts        # Socket.io 逻辑
│   │   └── index.ts         # 入口文件
│   └── package.json
├── src/                     # 前端源码 (React)
│   ├── components/          # UI 组件
│   ├── services/            # API 请求封装
│   ├── App.tsx              # 主应用组件
│   └── main.tsx             # 入口
├── PROJECT_README.md        # 功能说明书
├── SECURITY.md              # 安全操作手册
└── package.json             # 前端依赖配置
```

---

## 3. 核心模块实现细节 (Implementation Details)

### 3.1 用户认证与鉴权 (Authentication)
*   **注册/登录**:
    *   接收 `username`, `password`。
    *   使用 `bcryptjs.hash` 对密码进行加盐哈希存储。
    *   登录成功后签发 `JWT Token`，有效期 7 天。
*   **鉴权中间件 (`auth.ts`)**:
    *   拦截所有受保护路由。
    *   解析 `Authorization: Bearer <token>` 头。
    *   验证 Token 签名，若合法则将 `userId` 注入 `req` 对象，供后续 Controller 使用。
    *   若 Token 过期或非法，直接返回 401 Unauthorized。

### 3.2 任务执行引擎 (Task Execution Engine)
这是系统的核心心脏，负责管理用户从“领取任务”到“完成任务”的全过程。
*   **数据模型**: `TaskExecution`
    *   关联 `User` 和 `Task`。
    *   `status`: 状态机 (`new` -> `scheduled` -> `ongoing` -> `completed`)。
    *   `prepProgress`: 存储备战清单的勾选状态。
    *   `completedNodes`: 数组，存储已点亮的节点索引。
    *   `nodeStartTimes`: Map，记录每个节点的到达时间，用于校验限时逻辑。
*   **核心逻辑**:
    *   **领取**: `getOrCreateExecution` 检查是否已有进行中的记录，没有则创建。
    *   **备战**: `updatePrepProgress` 更新备战打勾状态。
    *   **节点校验**: `checkNode` 接收用户上传的答案或位置，校验通过后更新 `completedNodes`，并记录当前时间戳。
    *   **完成结算**: `completeTask` 计算所有节点的时间差，若满足 limit 则标记 `isSuccess: true` 并发放奖励。

### 3.3 奇遇系统 (Serendipity Module)
实现“随机触发”的逻辑。
*   **触发时机**: 用户每次调用 `checkNode` (完成节点) 时，前端后台静默调用 `checkAndTriggerSerendipity`。
*   **概率算法**:
    *   基于 `completedNodes.length` 的分段函数。
    *   K <= 5: 线性增长 (3% * K)。
    *   K > 12: 高概率平台期 (50%+)。
*   **唯一性检查**: 触发前检查 `UserEncounter` 表，确保同一 Execution 不会短时间内重复触发，且该用户没有正在进行的奇遇。
*   **生命周期**: 奇遇创建后，会写入 `expiresAt` (默认 3 天)。后端接口每次返回详情时，都会惰性检查是否过期，若过期则自动删除。

### 3.4 实时协作 (Real-time Co-op)
使用 `Socket.io` 实现。
*   **房间机制**: 每个 Execution ID 即为一个 `Room`。
*   **状态同步**:
    *   当任意队员调用 `checkNode` 成功，后端会向该 Room 广播 `execution-updated` 事件。
    *   所有客户端收到事件后，自动刷新本地状态，无需手动刷新页面。
*   **位置共享**: 客户端定时 (每 10s) 发送 GPS 坐标，服务器转发给同房间的其他 Socket 客户端。

---

## 4. 数据库设计 (Database Schema)

### 4.1 User (用户)
| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `username` | String | 唯一索引，显示名 |
| `passwordHash` | String | 加密后的密码 |
| `level`/`xp` | Number | 等级和经验值 |
| `friends` | [ObjectId] | 好友列表 (双向) |
| `preferences` | Object | 偏好设置 (如是否接收奇遇) |

### 4.2 Task (任务)
| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `title` | String | 任务标题 |
| `nodes` | Array | 核心数据结构，包含每个步骤的描述、QA配置、限时配置 |
| `targetCities` | [String] | 任务适用城市 |
| `author` | ObjectId | 发布者 |
| `status` | String | `pending` (待审), `approved` (已发), `rejected` |

### 4.3 TaskExecution (执行记录)
| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `user` | ObjectId | 执行者 |
| `task` | ObjectId | 关联任务 |
| `status` | String | 当前状态 |
| `prepProgress` | Array | 备战清单完成情况 |
| `coopContext` | Object | { isHost, participants } 联机信息 |

---

## 5. 安全防护策略详解 (Security Implementation)

### 5.1 隐形服务器架构 (Invisible Server)
为了最大程度减少攻击面，我们采用了“隐形”策略。
*   **端口封锁**: Iptables/安全组 封禁了 22, 80 等所有常见端口。
*   **白名单**: 443 端口仅对 Cloudflare 的 IP 段开放。
*   **效果**: 绕过 Cloudflare 试图直接扫描 IP 的攻击者会发现端口全部关闭，无法建立连接。

### 5.2 代码层防御
*   **NoSQL 注入**: 引入 `express-mongo-sanitize` 中间件，自动剥离请求 Payload 中的 `$` 符号，防止 `{ $ne: null }` 等注入攻击。
*   **Rate Limiting**: 使用 `express-rate-limit`。
    *   全站 API: 300 requests / 15 min。
    *   Auth API: 10 requests / 1 hour (防暴力破解)。

### 5.3 资源安全
*   **OSS 私有桶**: 将云存储 Bucket 权限设为 Private。
*   **Signed URL**: 后端在返回图片链接时，通过 SDK 生成带有签名的临时 URL (expires=300s)。
*   **原理**: 链接包含 `Signature` 参数，攻击者无法伪造，且链接过时失效，有效防止盗链和带宽盗刷。

---

## 6. API 设计规范 (API Design)

遵循 RESTful 风格。

*   `GET /tasks`: 获取任务列表 (支持分页、筛选)。
*   `POST /tasks`: 创建任务。
*   `GET /tasks/:id`: 获取任务详情。
*   `POST /executions/task/:taskId/start`: 开始执行任务。
*   `PUT /executions/:id/node`: 打卡/更新节点进度。
*   `POST /encounters/check-trigger`: 检查奇遇触发。
*   `GET /users/me`: 获取个人信息。

---

## 7. 开发与部署 (DevOps)

### 7.1 本地开发
1.  启动 MongoDB: `mongod`
2.  启动后端: `cd backend && npm run dev` (监听 3000)
3.  启动前端: `npm run dev` (监听 5173)

### 7.2 生产环境部署
1.  **构建**:
    *   前端: `npm run build` -> 生成 `/dist` 静态文件。
    *   后端: `npm run build` -> 生成 `/dist` JS 文件。
2.  **服务**:
    *   使用 Nginx 托管前端静态文件，并反向代理 `/api` 到 localhost:3000。
    *   使用 PM2 (`pm2 start dist/index.js`) 守护后端进程，确保持续运行。

---

**文档维护**: City Explorer 开发团队
**最后更新**: 2026-01-26
