# LineTrip（线旅）/ City Explorer

一款把城市漫游变成任务、奇遇和社交协作体验的全栈应用。项目包含 React Web/PWA 前端、Node.js API、MongoDB 数据层、Socket.io 实时通信，以及基于 Capacitor 的 Android 客户端工程。

> 项目仍处于开发阶段。默认配置适合本地运行；生产部署前请完成安全检查、数据备份和隐私合规评估。

## 项目功能

- **账号与个人主页**：注册登录、JWT 鉴权、资料编辑、关注、好友、收藏和个人展示柜。
- **城市任务**：浏览、搜索、创建、审核、收藏、举报和随机抽取城市探索任务。
- **任务执行**：备战清单、预约与开始、节点打卡、问答校验、图文记录、进度状态和完成结算。
- **奇遇系统**：根据任务进度触发限时奇遇，支持接受、校验、放弃和历史记录。
- **社区内容**：动态发布、图片上传、点赞、评论、收藏、举报和内容审核。
- **社团与活动**：创建或加入社团、入社审核、公告、活动发布、报名和取消报名。
- **组队探索**：邀请码入队、成员状态、节点同步和 Socket.io 实时事件。
- **奖励与通知**：徽章/相册奖励、通知中心、反馈处理和管理员操作。
- **跨端运行**：Web/PWA 与 Android（Capacitor）共用同一套 React 代码。

## 技术栈

### 前端

- React 19 + TypeScript 5
- Vite 6
- Tailwind CSS 4 + PostCSS
- Axios / Capacitor HTTP
- Socket.io Client
- Framer Motion、Lucide React
- browser-image-compression、html2canvas

### 后端

- Node.js 20 + TypeScript
- Express 4
- MongoDB + Mongoose 9
- JWT + bcryptjs
- Socket.io
- Multer + Sharp
- Helmet、CORS、express-rate-limit、express-mongo-sanitize、express-validator

### 移动端

- Capacitor 8
- Android 原生工程（Gradle）

## 项目结构

```text
.
├── App.tsx                 # 前端主应用与页面编排
├── components/             # 业务页面与 UI 组件
├── services/api.ts         # API 客户端、鉴权和请求处理
├── src/
│   ├── contexts/           # Socket 等 React Context
│   ├── hooks/              # 图片上传等复用逻辑
│   ├── utils/              # 图片、敏感词等工具
│   └── constants/          # 城市等静态数据
├── public/                 # PWA 清单与公开静态资源
├── backend/
│   └── src/
│       ├── controllers/    # 业务控制器
│       ├── middleware/     # 鉴权、校验、限流
│       ├── models/         # Mongoose 数据模型
│       ├── routes/         # REST API 路由
│       ├── services/       # 文件存储服务
│       └── index.ts        # HTTP/Socket 服务入口
└── android/                # Capacitor Android 工程
```

## 本地运行

### 前置要求

- Node.js 20（仓库提供 `.nvmrc`）
- npm 9 或更高版本
- MongoDB 本地实例或 MongoDB Atlas 数据库
- Android Studio（仅构建 Android 客户端时需要）

### 1. 安装依赖

```bash
npm install
cd backend
npm install
cd ..
```

### 2. 配置环境变量

前端：复制 `.env.example` 为 `.env.local`。

```dotenv
VITE_API_URL=http://localhost:5000
```

后端：复制 `backend/.env.example` 为 `backend/.env`，至少设置以下变量。

```dotenv
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/city_explorer
JWT_SECRET=<generate-a-strong-random-secret>
FRONTEND_URL=http://localhost:5173
STORAGE_TYPE=local
SERENDIPITY_DEBUG_MODE=false
```

生成 JWT 密钥的示例：

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

`.env`、`.env.local`、`.env.production` 均已被 Git 忽略。不要把数据库连接串、JWT 密钥、云服务 Access Key 或真实用户数据提交到仓库。

### 3. 启动后端

```bash
cd backend
npm run dev
```

默认地址为 `http://localhost:5000`，健康检查接口为 `GET /api`。

### 4. 启动前端

另开终端，在项目根目录运行：

```bash
npm run dev
```

浏览器访问 `http://localhost:5173`。

## 常用命令

| 目录 | 命令 | 说明 |
| --- | --- | --- |
| 根目录 | `npm run dev` | 启动 Vite 开发服务器 |
| 根目录 | `npm run build` | 构建前端到 `dist/` |
| 根目录 | `npm run preview` | 本地预览前端构建产物 |
| `backend/` | `npm run dev` | 使用 nodemon + ts-node 启动后端 |
| `backend/` | `npm run build` | 编译后端 TypeScript |
| `backend/` | `npm start` | 运行编译后的后端 |

当前仓库尚未配置自动化测试脚本；提交改动前至少应运行前后端构建。

## Android 构建

生产 Android 构建必须在构建前通过 `VITE_API_URL` 指定可访问的 HTTPS API 地址，否则客户端只会回退到用于 `adb reverse` 调试的本地地址。

```bash
npm run build
npx cap sync android
npx cap open android
```

之后在 Android Studio 中生成 APK 或 App Bundle。调试本机后端时可使用：

```bash
adb reverse tcp:5000 tcp:5000
```

## 具体实现

### 认证与接口保护

后端使用 bcryptjs 存储密码哈希，登录成功后签发 JWT。受保护路由通过 `Authorization: Bearer <token>` 验证身份，并在处理业务前确认用户仍然存在。管理员接口还会检查用户的 `isAdmin` 字段。

### 任务执行状态

`TaskExecution` 关联用户和任务，保存备战清单、已完成节点、节点记录、预约时间、执行状态和完成结果。前端通过执行接口逐步更新状态，后端负责校验所有权、节点条件与完成逻辑。

### 奇遇机制

奇遇模块在任务执行过程中按条件尝试触发 `Encounter`，并用 `UserEncounter` 保存用户侧状态。开发调试端点在 `NODE_ENV=production` 时会被拒绝；生产环境应保持 `SERENDIPITY_DEBUG_MODE=false`。

### 实时协作

Socket.io 使用 `/api/socket.io` 路径。客户端在握手阶段提交 JWT，服务端验证后按任务执行 ID 加入房间，用于广播协作进度等实时事件。

### 图片上传

上传接口使用 Multer 接收文件、Sharp 处理图片，并通过存储服务写入 `backend/uploads/`。该目录属于运行时用户数据，已被 Git 忽略，不应作为源代码上传。生产环境建议实现对象存储适配器，并使用私有桶、受控访问 URL 和独立的数据保留策略。

### 输入与接口安全

服务端启用了 Helmet、CORS 白名单、请求频率限制、参数校验和 NoSQL 注入清理；前端和后端均包含敏感词过滤逻辑。安全中间件不能替代权限检查，新增接口时仍需逐项验证身份、资源所有权和管理员权限。

## 生产部署要点

1. 将 `NODE_ENV` 设置为 `production`，使用高强度且独立的 `JWT_SECRET`。
2. 将 `FRONTEND_URL` 限制为实际前端域名；不要在生产环境开放任意来源。
3. 仅通过 HTTPS 暴露反向代理，不要直接公开 MongoDB 或内部 Node.js 端口。
4. 构建前端后，在 `backend/` 中构建并启动服务；后端会从根目录 `dist/` 提供前端静态文件。
5. 把数据库、上传文件、日志和密钥放在仓库之外，并建立备份、轮换与删除机制。

## 隐私与仓库安全

- 不提交环境变量、数据库导出、日志、用户上传图片、真实邮箱/手机号、访问令牌或服务器登录配置。
- 若密钥曾经进入 Git 历史，仅删除当前文件并不能使其失效；必须立即在对应平台轮换密钥，并清理历史或使用新的干净仓库。
- 发布前可使用 Gitleaks、TruffleHog 等工具再次扫描当前提交和完整 Git 历史。
- 示例数据应使用明显的占位符，不能使用真实用户 ID、密码哈希或线上连接串。

## 许可证

本仓库目前未提供根目录开源许可证。在添加 `LICENSE` 之前，默认保留全部权利；如果计划接受外部使用或贡献，请先选择合适的许可证。
