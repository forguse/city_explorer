# City Explorer: 从零到上线终极通关指南 (The Ultimate Roadmap)

这份文档是你项目的“寻宝图”。请严格按照顺序执行，不要跳步。
目前状态：**代码逻辑基本完成，安全代码待补充，服务器未购买。**

---

## 📅 第一阶段：出发前准备 (Local Preparation)
**地点**：你的本地电脑
**目标**：把半成品加工成可以运输的“成品”。

### 1.1 补全安全代码 (暂跳过，但在打包前必做)
> *你在指令中说先不写，但为了以后不忘记，记在这里。*
*   [ ] 后端引入 `express-rate-limit` (防爆破)。
*   [ ] 后端引入 `express-mongo-sanitize` (防注入)。
*   [ ] 检查 OSS 图片链接生成逻辑 (私有+签名)。

### 1.2 "切蛋糕"打包法
把你的项目拆分成三份：

1.  **后端包 (Backend)**:
    *   进入 `backend` 目录。
    *   删除 `node_modules` (太重了，不要带走)。
    *   把剩余的 `backend` 文件夹压缩成 -> **`backend.zip`**。

2.  **前端网页包 (Web)**:
    *   在根目录运行 `npm run build`。
    *   检查根目录是否生成了 `dist` 文件夹。
    *   把 `dist` 文件夹压缩成 -> **`dist.zip`**。

3.  **安卓安装包 (APK)**:
    *   运行 `npx cap sync`。
    *   运行 `npx cap open android` 打开 Android Studio。
    *   点击 Build -> Build Bundle(s) / APK(s) -> Build APK(s)。
    *   拿到生成的 **`app-debug.apk`** (以后我会教你签名变 release)。

---

## 🏗️ 第二阶段：基础设施建设 (Infrastructure)
**地点**：云厂商控制台
**核心原则**：先建围墙，再盖房。

### 2.1 购买服务器
*   **厂商**: 腾讯云 / 阿里云 / AWS (推荐腾讯云香港轻量应用服务器，性价比高且免备案)。
*   **系统**: 选择 **Ubuntu 22.04 LTS** (不要选 CentOS)。
*   **配置**: 最低 1核2G 即可 (学生机)，推荐 2核4G。

### 2.2 域名与 Cloudflare (护盾)
1.  **买域名**: Namecheap / Godaddy / 阿里云 (随便买个便宜的 .xyz 或 .top)。
2.  **接入 CF**:
    *   注册 Cloudflare 账号。
    *   添加你的域名。
    *   按 CF 提示，去你的域名购买商那里把 DNS 服务器改成 Cloudflare 提供的地址。
    *   等待生效 (看到 CF 面板里变成“Active”)。
3.  **设置解析**:
    *   在 CF 添加 A 记录：`@` -> 指向你刚买的服务器 IP。
    *   **关键**: 开启“小黄云” (Proxied)。

### 2.3 设置云防火墙 (防盗门)
*   回到云服务器控制台 -> 防火墙 (安全组)。
*   **添加规则**: 允许 TCP 端口 **443** (HTTPS)。
*   **添加规则**: 允许 TCP 端口 **22** (SSH，建议仅限你自己 IP，或者不做限制但在 SSH 软件里做密钥登录)。
*   **拒绝规则**: 确保 80, 27017, 3000 这些端口**全部关闭** (不要对外暴露)。

---

## 🛠️ 第三阶段：服务器环境搭建 (Server Setup)
**地点**：服务器终端 (SSH)
**操作**：复制粘贴以下命令。

### 3.1 连上服务器
使用 Termius 或 CMD: `ssh root@你的服务器IP` (密码在控制台重置获取)。

### 3.2 一键装机
```bash
# 1. 升级系统
sudo apt update && sudo apt upgrade -y

# 2. 安装基础软件 (Nginx, Git, 解压工具)
sudo apt install -y nginx git unzip curl

# 3. 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 4. 安装 PM2 (守护进程)
sudo npm install -g pm2

# 5. 安装 MongoDB 7.0
sudo apt install -y gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

---

## 🚀 第四阶段：部署上线 (Deployment)

### 4.1 上传文件
用 SFTP 工具把第一阶段准备好的 `backend.zip` 和 `dist.zip` 上传到服务器的 `/root/` 目录。

### 4.2 部署后端
```bash
# 准备目录
mkdir -p /var/www/city-explorer/backend

# 解压
unzip /root/backend.zip -d /var/www/city-explorer/backend

# 运行
cd /var/www/city-explorer/backend
npm install               # 装依赖
npm run build             # 编译 TS -> JS
pm2 start dist/index.js --name "api" # 启动!
pm2 save                  # 保存当前状态
pm2 startup               # 设置开机自启
```

### 4.3 部署前端网站
```bash
# 准备目录
mkdir -p /var/www/city-explorer/dist

# 解压
unzip /root/dist.zip -d /var/www/city-explorer/dist
```

### 4.4 配置 Nginx (大管家)
编辑配置：`nano /etc/nginx/sites-available/default`
(按 `Ctrl+K` 删光所有内容，粘贴下面的)

```nginx
server {
    # 暂时先监听 80，后面有了 SSL 再改 443
    listen 80;
    server_name your_domain.com; # 【改】换成你的域名

    # 1. 网站大厅
    location / {
        root /var/www/city-explorer/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 2. 后厨通道 (API)
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
保存生效：`systemctl restart nginx`

---

## � 第五阶段：安全加固 (Security Config)

### 5.1 开启 SSL (HTTPS)
因为你用了 Cloudflare，这步超级简单。
1.  在 Cloudflare 后台，SSL/TLS -> Overview -> 选 **Flexible** 模式。
2.  你的 Nginx 配置其实不需要动（因为 CF 会负责加密用户到 CF 这一段，CF 到你服务器走 HTTP 80 即可，这样最省事且安全）。
3.  *进阶*: 如果选 **Full** 模式，需要给 Nginx 装一个自签名证书 (以后再教)。

### 5.2 验证
打开浏览器，访问 `https://你的域名`。
*   能看到网站？成功！
*   能登录？(API 通了) 成功！

---

## 📲 第六阶段：发布 APP
把第一阶段生成的 `app-debug.apk` 上传到服务器的 `/var/www/city-explorer/dist` 目录下。
这样用户就可以通过 `https://你的域名/app-debug.apk` 下载安装了。

---

**最终状态**:
*   🌐 **网站**: `https://cityexplorer.xyz` (全球加速，防DDoS)
*   📱 **APP**: 用户手机里运行，数据连你的服务器。
*   🛡️ **安全**: 端口全关，只留 CF 通道，黑客扫描不到 IP。
