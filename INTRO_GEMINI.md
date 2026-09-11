# City Explorer 全栈开发与发布指南 (INTRO_GEMINI.MD)

这是一份为非技术背景的开发者（即使你自称“完全不会编程”）准备的完整行动指南。
**目标**：将你现在的 City Explorer 前端原型，转变为一个拥有完整后台数据库、可以用户登录、数据云端同步、并最终发布到应用商店的真实 APP。

本指南采用**“复制粘贴驱动开发”**模式。你只需要按顺序将文档中的“提示语块（Prompt）”复制给 AI（如 ChatGPT、Claude、DeepSeek），它们就会为你生成所需的代码和操作步骤。

---

## 📅 这是我们要完成的宏伟蓝图

我们将开发过程分为 **10 个里程碑**。请不要跳过任何一步。

1.  **里程碑 1：地基搭建** —— 建立后端项目，让电脑跑起服务器。
2.  **里程碑 2：用户中心** —— 实现注册、登录、个人资料。
3.  **里程碑 3：任务核心** —— 任务的发布、浏览、详情与执行状态。
4.  **里程碑 4：备战系统** —— 复杂的备战清单与物资管理。
5.  **里程碑 5：社群与内容** —— 社区帖子、关注系统。
6.  **里程碑 6：俱乐部体系** —— 社团、活动与群聊基础。
7.  **里程碑 7：奇遇与奖励** —— 随机事件、成就系统、赞助商奖励。
8.  **里程碑 8：辅助工具** —— 行程导入、路线 Remix、剪贴板检测。
9.  **里程碑 9：前后端合体** —— 让前端真正连接到后端数据。
10. **里程碑 10：打包发布** —— 生成 Android/iOS 安装包并上线。

---

## 🚀 开始行动：一步一步来

### ⚠️ 准备工作
在开始之前，请确保你已经安装了以下软件（如果没有，请让 AI 教你安装）：
- **Node.js** (推荐 LTS 版本)
- **Visual Studio Code** (你正在用的这个)
- **MongoDB Community Server** (数据库)
- **Postman** (用来测试接口，可选但推荐)

---

### 第一阶段：后端环境初始化

我们先不管前端，要在你的文件夹里新建一个“大脑”（后端）。

**👉 复制下面的 [Prompt 1] 给 AI：**

```markdown
# [Prompt 1] 初始化后端项目骨架
你好，我有一个 React 前端项目（City Explorer），现在通过这几个前端组件文件名你能大概了解它的功能：CreateTaskScreen, TaskDetailScreen, ClubScreen, ChatScreen, TaskPrepScreen, SponsorRewardScreen 等。

我现在需要你帮我从零开始搭建后端。我是小白，请一步一步教我：
1. 请详细分析我的前端功能，列出所有需要的后端“资源（Resource）”（例如：User, Task, Club, Post, Message, Encounter, Reward 等）。
2. 在我的项目根目录下，告诉我如何用命令行创建一个名为 `backend` 的文件夹。
3. 并在里面初始化一个 **Node.js + TypeScript + Express + MongoDB** 的项目。
4. 请给出所有需要安装的 npm 依赖包的安装命令（包含 express, mongoose, cors, dotenv, jsonwebtoken, bcryptjs, socket.io 以及它们的类型定义）。
5. 请直接给出 `package.json`, `tsconfig.json`, `nodemon.json` 的完整文件内容。
6. 请给出最基础的 `src/index.ts` 代码，代码里要包含：
   - 连接本地 MongoDB 数据库的代码。
   - 配置 CORS 跨域。
   - 一个简单的根路由 `GET /` 返回 "City Explorer API is running"。
   - 启动服务器在 5000 端口。

请只要告诉我怎么做，不用解释太深奥的原理，直接给我代码和命令。
```

---

### 第二阶段：设计数据库（APP 的记忆）

服务器跑起来后，我们要告诉它怎么存数据。

**👉 复制下面的 [Prompt 2] 给 AI：**

```markdown
# [Prompt 2] 设计全套数据库模型 (Mongoose Schemas)
我的后端环境已经跑起来了。现在根据前端功能，我需要你帮我设计 MongoDB 的数据模型（Schemas）。请在 `backend/src/models` 下为我生成以下 Model 文件（请包含详细的 TypeScript Interface 定义）：

1. **User.ts**: 用户名、密码(hash)、头像、等级、经验值、关注/粉丝列表、收藏的任务ID列表、加入的俱乐部ID列表。
2. **Task.ts**: 
   - 基础信息：标题、描述、位置(文本+坐标)、封面图、难度、发布者ID。
   - **路线节点(Nodes)**: 数组，包含描述、是否指定地点、地点坐标、参考图。
   - **配置**: 是否AI生成、是否官方推荐。
   - **备战清单配置**: 数组，每项包含标题、类型(ticket/transport/lodging/documents/other)、默认备注。
3. **TaskExecution.ts** (用户执行任务的状态): 
   - 关联 User 和 Task。
   - 状态(status): new/ongoing/completed。
   - **备战进度**: 记录每一项备战清单的完成状态、填写的备注、上传的附件URL。
   - **节点打卡**: 记录哪些节点完成了。
   - 倒计时/开始时间。
4. **Post.ts** (社区帖子): 内容、图片数组、关联的任务ID、发布者、点赞用户列表、评论数组。
5. **Club.ts**: 名称、封面、描述、城市、会长ID、成员ID列表、关联的 ActivityTasks（活动任务）。
6. **Message.ts**: 发送者、接收者、群组ID（如属于俱乐部）、内容、类型(text/image)、时间。
7. **Encounter.ts** (奇遇): 标题、描述、触发条件、奖励内容。
8. **UserEncounter.ts** (用户触发记录): 状态(active/completed/ignored/suspended)、进度。

请一次性给我这些文件的完整代码。
```

---

### 第三阶段：核心接口开发（前 50%）

现在我们开始写功能接口。

**👉 复制下面的 [Prompt 3] 给 AI：**

```markdown
# [Prompt 3] 实现认证与任务管理 API
请在 `backend/src/routes` 下帮我生成路由代码，并在 `backend/src/controllers` 下生成逻辑代码。然后告诉我如何在 `index.ts` 中注册它们。

需要实现的功能如下：
1. **Auth (authRoutes.ts)**:
   - `POST /register`: 用户注册，密码加密。
   - `POST /login`: 登录，返回 JWT Token 和用户信息。
   - 中间件 `middleware/auth.ts`: 用于验证 Token，保护后续接口。

2. **Task (taskRoutes.ts)**:
   - `POST /`: 创建新任务（接收前端 CreateTaskScreen 的数据，包括节点和备战清单配置）。
   - `GET /`: 获取任务列表（支持分页，支持筛选：热门/官方推荐/附近的）。
   - `GET /:id`: 获取任务详情。
   - `POST /:taskId/join`: 用户领取任务（在 TaskExecution 表创建记录）。

3. **TaskExecution (executionRoutes.ts)**:
   - `GET /mine`: 获取“我的任务”列表 (MyTasksScreen 用)。
   - `PUT /:id/prep`: 更新备战清单某一项的状态（勾选/取消勾选/填写备注）。(TaskPrepScreen 用)
   - `PUT /:id/node`: 任务节点打卡。
   - `POST /:id/complete`: 完成任务，结算奖励。

请给我完整的代码文件。
```

---

### 第四阶段：核心接口开发（后 50%）

继续实现剩下的功能。

**👉 复制下面的 [Prompt 4] 给 AI：**

```markdown
# [Prompt 4] 实现俱乐部、社区与奇遇 API
请继续帮我生成以下模块的路由和控制器代码：

1. **Club (clubRoutes.ts)**:
   - `GET /`: 浏览俱乐部列表。
   - `POST /`: 创建俱乐部。
   - `POST /:id/join`: 加入俱乐部。
   - `POST /:id/activity`: 俱乐部发布活动任务（带开始/结束时间、容量限制）。
   - `GET /activity`: 获取“社团活动” (ClubActivityScreen 用)。

2. **Community (postRoutes.ts)**:
   - `GET /`: 获取社区帖子流 (CommunityScreen 用)。
   - `POST /`: 发布帖子 (PublishPostScreen 用)，支持关联任务。
   - `POST /:id/like`: 点赞/取消点赞。

3. **Encounter (encounterRoutes.ts)**:
   - `GET /random`: 触发一个随机奇遇 (TaskMapScreen/Exploration 用)。
   - `POST /:id/accept`: 接受奇遇。
   - `GET /history`: 获取我的奇遇历史 (EncounterHistoryScreen 用)。

4. **Utils (utilRoutes.ts)** - 对应前端特殊功能：
   - `POST /trip-import`: 接收外部链接，解析并生成一个临时的 Task 结构 (TripImportScreen 用)。
   - `POST /remix`: 复制一个现有任务为新草稿 (RemixRouteScreen 用)。

请给我完整的代码，并提醒我在 `index.ts` 里注册。
```

---

### 第五阶段：前端对接准备

后端接口写好了，前端需要一个“联络员”去和后端说话。

**👉 复制下面的 [Prompt 5] 给 AI：**

```markdown
# [Prompt 5] 前端 API 请求封装
现在回到前端项目。我需要你帮我封装一套与后端通信的工具。
1. 请告诉我如何安装 `axios`。
2. 在 `src/services/api.ts` 中创建一个 axios 实例：
   - BaseURL 设置为 `http://localhost:5000/api` (开发环境) 或 `/api` (生产环境)。
   - 添加请求拦截器：自动从 localStorage 读取 `token` 并添加到 Header 中。
   - 添加响应拦截器：如果是 401 错误（未登录），自动跳转到登录页。
3. 请基于之前的后端接口，封装所有的前端 API 方法，例如：
   - `auth.login(data)`
   - `task.create(data)`
   - `task.getMyTasks()`
   - `task.updatePrepStatus(executionId, itemId, status)`
   - `club.getDetails(id)`
   - ...等等所有对应之前后端的功能。

请给我写好 `src/services/api.ts` 的完整代码。
```

---

### 第六阶段：组件数据接入（这是最累的一步）

你需要把前端所有的假数据（Mock Data）替换成 `api.ts` 的调用。这需要一个个页面改。

**👉 复制下面的 [Prompt 6] 给 AI（这是一个通用模板，你需要对每个页面重复发这个指令）：**

```markdown
# [Prompt 6] 组件接入 API - 通用指令
（请你根据你要修改的文件，把下面这段话发给 AI。例如修改 MyTasksScreen.tsx）

我现在要修改前端组件 `components/MyTasksScreen.tsx`。
请把里面写死的 `allTasks` 假数据删掉，改为使用我刚才定义的 `api.ts` 中的 `task.getMyTasks()` 方法从后端获取真实数据。
1. 使用 `useEffect` 在组件加载时请求数据。
2. 添加 `loading` 状态，在数据加载时显示 Loading 界面。
3. 确保数据字段的映射正确（后端返回的字段名可能和前端现在的 Mock 数据不一样，请帮我调整前端渲染代码以匹配后端数据结构）。
4. 里面比如“点击任务”、“更新状态”的操作，也请改为调用 API。

请给我修改后的完整组件代码。
```
*你要对 `LoginScreen`, `CreateTaskScreen`, `TaskDetailScreen`, `ClubScreen`... 等所有核心页面重复执行这个步骤。*

---

### 第七阶段：文件上传（图片、证件）

APP 里有很多上传图片的地方，这比较特殊。

**👉 复制下面的 [Prompt 7] 给 AI：**

```markdown
# [Prompt 7] 实现图片上传功能
我的 APP 需要上传图片（头像、任务封面、备战清单里的证件照等）。
1. 后端：请在后端安装 `multer`，并创建一个上传接口 `POST /api/upload`。
   - 图片保存在后端 `uploads/` 文件夹下。
   - 返回图片的访问 URL（静态资源托管）。
2. 前端：请帮我在 `src/services/api.ts` 里添加 `uploadImage(file)` 方法。
3. 前端：给出一个 React Hook `useImageUpload`，让我可以在组件里方便地调用上传功能，并获取上传后的 URL。

请给出前后端的相关代码。
```

---

### 第八阶段：实时聊天（高级功能）

如果你想实现真正的聊天。

**👉 复制下面的 [Prompt 8] 给 AI：**

```markdown
# [Prompt 8] 集成 Socket.io 实现实时聊天
我要让 `ChatScreen.tsx` 和 `ClubChatScreen.tsx` 能真的实时发消息。
1. 后端：请配置 `socket.io`，监听连接，处理 `join_room`, `send_message` 事件。将消息保存到 MongoDB 的 Message 表。
2. 前端：请在 `src/services/socketService.ts` 中封装 Socket 连接逻辑。
3. 前端：修改 `ChatScreen.tsx`，进入页面时连接 Socket，发送消息时通过 Socket 发送，收到 `receive_message` 时更新 UI。

请给我前后端实现代码。
```

---

### 第九阶段：部署上线

代码写完了，要让别人能由外网访问。

**👉 复制下面的 [Prompt 9] 给 AI：**

```markdown
# [Prompt 9] 部署指南
我已经完成了开发。现在我有：
1. 本地 React 前端。
2. 本地 Node.js 后端。
3. 本地 MongoDB。

请告诉我：
1. 如何购买和设置一个便宜的云服务器（Linux）。
2. 如何在服务器上安装 Node.js, PM2, Nginx, MongoDB。
3. 如何把我的后端代码传上去并用 PM2 启动。
4. 如何构建（Build）我的前端 React 代码，并用 Nginx 托管静态文件，同时配置反向代理指向后端 API（解决跨域问题）。
5. 域名怎么配。

请给我一份详细的运维操作清单。
```

---

### 第十阶段：打包 APP

最后一步，生成手机上能装的软件。

**👉 复制下面的 [Prompt 10] 给 AI：**

```markdown
# [Prompt 10] 使用 Capacitor 打包 APP
我想把这个 Web 项目打包成 Android APK 和 iOS IPA。
1. 请教我安装 Capacitor：`npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios`。
2. 初始化：`npx cap init`。
3. 告诉我如何修改 `capacitor.config.ts`，特别是 `server.url` 如果我想在开发时可以热更新（或者打包时指向我的线上域名）。
4. 运行 `npx cap add android` 和 `npx cap open android` 后，在 Android Studio 里我需要做什么配置才能生成签名的 APK？
5. 怎么处理跨域和 HTTP 请求在真机上失败的问题（AndroidManifest.xml 配置）？

请给我详细步骤。
```

---

### 💡 遇到报错怎么办？

**万能纠错 Prompt:**
> "我照着你的步骤执行 [XXX命令/操作] 时，终端报了以下错误：
> [粘贴错误信息]
> 请告诉我这是什么原因，并给出修复命令。"

---
**加油！City Explorer 的创始人，你的全栈开发之旅开始了！**
