# ============================================================
# Backend Dockerfile — multi-stage build
# Usage:
#   cd backend && mvn package -DskipTests
#   docker build -t reimbursement-backend .
# ============================================================

FROM eclipse-temurin:17-jre-alpine AS runtime

LABEL maintainer="maintainer@example.com"
LABEL description="示例地区报销智能平台 - 后端服务"

WORKDIR /app

# 从构建产物中拷贝 jar
COPY reimbursement-admin/target/reimbursement-admin-*.jar app.jar

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/v1/auth/health || exit 1

EXPOSE 8080

ENV JAVA_OPTS="-Xms512m -Xmx1024m -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -Djava.security.egd=file:/dev/./urandom"
ENV TZ=Asia/Shanghai

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
