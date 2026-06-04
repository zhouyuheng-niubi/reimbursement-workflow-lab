# ============================================================
# Frontend Dockerfile — build + serve with Nginx
# Usage: docker build -t reimbursement-web .
# ============================================================

FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json pnpm-lock.yaml* yarn.lock* package-lock.json* ./

# 安装依赖（兼容多种包管理器）
RUN if [ -f pnpm-lock.yaml ]; then npm install -g pnpm && pnpm install --frozen-lockfile; \
    elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    else npm ci; fi

COPY . .
RUN npm run build

# ---- Nginx 运行阶段 ----
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
