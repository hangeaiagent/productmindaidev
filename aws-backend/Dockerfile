# 第一阶段：构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装所有依赖（包括开发依赖）
RUN npm ci

# 复制源代码
COPY . .

# 编译TypeScript
RUN npm run build

# 第二阶段：运行阶段
FROM node:18-alpine AS runtime

# 安装curl用于健康检查
RUN apk add --no-cache curl

WORKDIR /app

# 复制生产依赖
COPY --from=builder /app/node_modules ./node_modules

# 复制编译后的文件
COPY --from=builder /app/dist ./dist
COPY package*.json ./

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S productmind -u 1001

# 设置权限
RUN chown -R productmind:nodejs /app
USER productmind

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 启动应用
CMD ["node", "dist/server.js"] 