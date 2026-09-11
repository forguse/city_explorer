# City Explorer 部署指南

## 环境要求

| 软件 | 版本 | 说明 |
|------|------|------|
| Node.js | 18.x - 20.x | 推荐 20.x LTS |
| npm | 9.x+ | 随 Node.js 安装 |
| MongoDB | 6.x+ | 或使用 MongoDB Atlas |

## 快速部署步骤

### 1. 服务器准备 (Ubuntu/Debian)

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node -v  # 应显示 v20.x.x
npm -v   # 应显示 9.x.x 或 10.x.x

# 安装 PM2 (进程管理)
sudo npm install -g pm2
```

### 2. 上传代码

```bash
# 方式1: 使用 Git
cd /var/www
git clone <你的仓库地址> city-explorer
cd city-explorer/backend

# 方式2: 使用 SCP/SFTP 上传
# 将本地 backend 文件夹上传到 /var/www/city-explorer/backend
```

### 3. 配置环境变量

```bash
cd /var/www/city-explorer/backend

# 复制环境变量模板
cp .env.example .env

# 编辑配置
nano .env
```

**必须修改的配置：**
```env
# 生产环境
NODE_ENV=production

# MongoDB Atlas 连接字符串
MONGODB_URI=replace-with-your-mongodb-connection-string

# JWT 密钥 (使用强随机字符串)
# 生成命令: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=<generate-a-strong-random-secret>

# 前端域名
FRONTEND_URL=https://你的域名.com
```

### 4. 安装依赖并构建

```bash
# 安装依赖
npm ci

# 构建 TypeScript
npm run build

# 验证构建成功
ls dist/  # 应该看到 index.js 等文件
```

### 5. 启动服务

```bash
# 使用 PM2 启动
pm2 start dist/index.js --name city-explorer

# 设置开机自启
pm2 save
pm2 startup

# 查看状态
pm2 status
```

### 6. 配置 Nginx (可选但推荐)

```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/city-explorer
```

```nginx
server {
    listen 80;
    server_name api.你的域名.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 启用配置
sudo ln -s /etc/nginx/sites-available/city-explorer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `pm2 status` | 查看服务状态 |
| `pm2 logs city-explorer` | 查看日志 |
| `pm2 restart city-explorer` | 重启服务 |
| `pm2 stop city-explorer` | 停止服务 |
| `pm2 monit` | 实时监控 |

## 更新部署

```bash
cd /var/www/city-explorer/backend

# 拉取最新代码
git pull

# 安装新依赖
npm ci

# 重新构建
npm run build

# 重启服务
pm2 restart city-explorer
```

## 故障排查

### 服务无法启动
```bash
# 查看详细日志
pm2 logs city-explorer --lines 100

# 检查端口占用
sudo lsof -i :5000
```

### 数据库连接失败
- 检查 MongoDB Atlas IP 白名单是否包含服务器 IP
- 检查 MONGODB_URI 格式是否正确
- 测试连接: `node -e "require('mongoose').connect(process.env.MONGODB_URI)"`

### 内存不足
```bash
# 查看内存使用
free -h

# PM2 内存限制
pm2 start dist/index.js --name city-explorer --max-memory-restart 1G
```
