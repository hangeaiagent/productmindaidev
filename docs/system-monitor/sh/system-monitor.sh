#!/bin/bash

# ProductMind AI 系统监控脚本
# 功能：定期检查系统状态并自动恢复

# 配置
MONITOR_INTERVAL=300 # 5分钟
LOG_DIR="/home/productmindaidev/logs"
LOG_FILE="$LOG_DIR/system-monitor.log"
MANAGER_SCRIPT="/home/productmindaidev/system-service-manager.sh"
ALERT_EMAIL="402493977@qq.com"  # 更新为实际的告警邮箱

# 检查是否已经运行
LOCK_FILE="/tmp/system-monitor.lock"
if [ -e "$LOCK_FILE" ]; then
    pid=$(cat "$LOCK_FILE")
    if ps -p "$pid" > /dev/null 2>&1; then
        echo "监控脚本已在运行 (PID: $pid)"
        exit 1
    fi
fi
echo $$ > "$LOCK_FILE"

# 清理函数
cleanup() {
    rm -f "$LOCK_FILE"
    exit 0
}
trap cleanup EXIT

# 检查必要条件
if [ ! -f "$MANAGER_SCRIPT" ]; then
    echo "错误: 找不到服务管理脚本 $MANAGER_SCRIPT"
    exit 1
fi

# 确保日志目录存在
mkdir -p "$LOG_DIR"

# 日志函数
log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# 发送告警邮件
send_alert() {
    local subject=$1
    local message=$2
    echo "$message" | mail -s "[ProductMind AI] $subject" "$ALERT_EMAIL"
}

# 检查系统资源
check_system_resources() {
    # CPU使用率
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d. -f1)
    if [ "$cpu_usage" -gt 80 ]; then
        log "WARN" "CPU使用率过高: ${cpu_usage}%"
        send_alert "CPU告警" "CPU使用率: ${cpu_usage}%"
    fi
    
    # 内存使用率
    local mem_usage=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
    if [ "$mem_usage" -gt 80 ]; then
        log "WARN" "内存使用率过高: ${mem_usage}%"
        send_alert "内存告警" "内存使用率: ${mem_usage}%"
    fi
    
    # 磁盘使用率
    local disk_usage=$(df -h / | awk 'NR==2 {print int($5)}')
    if [ "$disk_usage" -gt 80 ]; then
        log "WARN" "磁盘使用率过高: ${disk_usage}%"
        send_alert "磁盘告警" "磁盘使用率: ${disk_usage}%"
    fi
}

# 检查日志文件大小
check_log_files() {
    find "$LOG_DIR" -type f -name "*.log" | while read -r log_file; do
        # 使用兼容的方式获取文件大小
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # MacOS
            local size=$(stat -f%z "$log_file")
        else
            # Linux
            local size=$(stat -c%s "$log_file")
        fi
        
        if [ "$size" -gt $((100*1024*1024)) ]; then # 100MB
            local backup="${log_file}.$(date +%Y%m%d_%H%M%S)"
            log "INFO" "日志文件过大，进行备份: $log_file -> $backup"
            mv "$log_file" "$backup"
            gzip "$backup"
            touch "$log_file"
        fi
    done
}

# 检查服务状态并恢复
check_and_recover_services() {
    log "INFO" "开始检查服务状态..."
    
    # 使用服务管理脚本检查状态
    "$MANAGER_SCRIPT" status > /dev/null 2>&1
    
    if [ $? -ne 0 ]; then
        log "WARN" "检测到服务异常，尝试恢复..."
        "$MANAGER_SCRIPT" recover
        
        # 再次检查状态
        sleep 10
        "$MANAGER_SCRIPT" status > /dev/null 2>&1
        if [ $? -ne 0 ]; then
            log "ERROR" "服务恢复失败"
            send_alert "服务告警" "服务恢复失败，请手动检查"
        else
            log "SUCCESS" "服务已成功恢复"
        fi
    else
        log "INFO" "所有服务运行正常"
    fi
}

# 主函数
main() {
    log "INFO" "系统监控启动"
    
    # 检查系统资源
    check_system_resources
    
    # 检查日志文件
    check_log_files
    
    # 检查并恢复服务
    check_and_recover_services
}

# 执行主函数
main "$@"
