# 使用 Node.js 20 镜像
FROM node:20-slim

WORKDIR /app

# 先复制 package 文件
COPY package*.json ./

# 安装依赖，使用 legacy-openssl-provider 解决兼容性问题
RUN npm ci --omit=optional --legacy-peer-deps 2>/dev/null || npm install --omit=optional --legacy-peer-deps

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 3000

# 启动
CMD ["node", "index.js"]