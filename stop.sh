#!/bin/bash
# ============================================================
# 示例地区报销智能平台 - 一键停止脚本
# ============================================================

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_DIR="$PROJECT_DIR/.pids"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

stop_process() {
    local name=$1
    local pid_file="$PID_DIR/$name.pid"

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid"
            sleep 2
            # 强制终止（如果还活着）
            if kill -0 "$pid" 2>/dev/null; then
                kill -9 "$pid" 2>/dev/null
            fi
            log_info "$name (PID $pid) 已停止"
        else
            log_info "$name (PID $pid) 已经不在运行"
        fi
        rm -f "$pid_file"
    else
        log_info "$name: 无PID文件，尝试按端口查找..."
    fi
}

# 停止前端
stop_process "frontend"
# 额外清理：vite可能有子进程
pkill -f "vite.*--port 18761" 2>/dev/null && log_info "清理 vite 子进程" || true

# 停止移动端 H5
stop_process "mobile"
pkill -f "@dcloudio/uvm/bin/uvm.cjs.*uni" 2>/dev/null && log_info "清理 uni-app H5 子进程" || true
pkill -f "vite.*18762" 2>/dev/null && log_info "清理 18762 子进程" || true

# 停止后端
stop_process "backend"
# 额外清理
pkill -f "reimbursement-admin.*18760" 2>/dev/null && log_info "清理后端子进程" || true

# 清理端口（防漏）
for port in 18760 18761 18762; do
    pids=$(lsof -ti TCP:$port 2>/dev/null)
    if [ -n "$pids" ]; then
        echo "$pids" | xargs kill -9 2>/dev/null
        log_info "清理端口 $port 上的残留进程"
    fi
done

echo ""
echo -e "${GREEN}所有服务已停止${NC}"
