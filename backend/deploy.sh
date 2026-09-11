#!/bin/bash
# City Explorer 服务器部署脚本
# 适用于 Ubuntu/Debian 系统

set -e  # 遇到错误立即退出

echo "=========================================="
echo "City Explorer 部署脚本"
echo "=========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}建议使用 sudo 运行此脚本${NC}"
fi

# 1. 更新系统
echo -e "${GREEN}[1/6] 更新系统包...${NC}"
apt update && apt upgrade -y

# 2. 安装 Node.js 20.x
echo -e "${GREEN}[2/6] 安装 Node.js 20.x...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
else
    echo "Node.js 已安装: $(node -v)"
fi

# 3. 安装 PM2
echo -e "${GREEN}[3/6] 安装 PM2 进程管理器...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
else
    echo "PM2 已安装"
fi

# 4. 安装依赖
echo -e "${GREEN}[4/6] 安装项目依赖...${NC}"
cd /var/www/city-explorer/backend
npm ci --production=false  # 安装所有依赖（包括 devDependencies 用于构建）

# 5. 构建项目
echo -e "${GREEN}[5/6] 构建 TypeScript...${NC}"
npm run build

# 6. 启动/重启服务
echo -e "${GREEN}[6/6] 启动服务...${NC}"
pm2 delete city-explorer 2>/dev/null || true
pm2 start dist/index.js --name city-explorer
pm2 save
pm2 startup

echo ""
echo -e "${GREEN}=========================================="
echo "部署完成!"
echo "=========================================="
echo -e "${NC}"
echo "服务状态: pm2 status"
echo "查看日志: pm2 logs city-explorer"
echo "重启服务: pm2 restart city-explorer"
