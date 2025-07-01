#!/bin/bash

# ProductMind AI 监控系统部署脚本
# 功能：将监控脚本上传到服务器并自动安装

# 服务器配置
SERVER="ec2-user@3.93.149.236"
PEM_FILE="/Users/a1/work/productmindai.pem"
REMOTE_DIR="/home/productmindaidev"

# 本地文件
LOCAL_SCRIPTS=(
    "system-monitor.sh"
    "system-service-manager.sh"
    "install-monitor.sh"
)

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 日志函数
log() {
    local level=$1
    local message=$2
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') [${level}] ${message}"
}

# 检查本地文件
check_local_files() {
    log "INFO" "${YELLOW}检查本地文件...${NC}"
    for script in "${LOCAL_SCRIPTS[@]}"; do
        if [ ! -f "$script" ]; then
            log "ERROR" "${RED}错误: 找不到文件 $script${NC}"
            exit 1
        fi
    done
    log "SUCCESS" "${GREEN}✓ 本地文件检查通过${NC}"
}

# 检查服务器连接
check_server_connection() {
    log "INFO" "${YELLOW}检查服务器连接...${NC}"
    if ! ssh -i "$PEM_FILE" -o ConnectTimeout=5 "$SERVER" "echo 'Connection test'" &>/dev/null; then
        log "ERROR" "${RED}错误: 无法连接到服务器${NC}"
        exit 1
    fi
    log "SUCCESS" "${GREEN}✓ 服务器连接正常${NC}"
}

# 上传文件
upload_files() {
    log "INFO" "${YELLOW}上传文件到服务器...${NC}"
    
    # 创建远程目录（如果不存在）
    ssh -i "$PEM_FILE" "$SERVER" "mkdir -p $REMOTE_DIR"
    
    # 上传文件
    for script in "${LOCAL_SCRIPTS[@]}"; do
        log "INFO" "上传 $script..."
        scp -i "$PEM_FILE" "$script" "$SERVER:$REMOTE_DIR/"
        if [ $? -ne 0 ]; then
            log "ERROR" "${RED}错误: 上传 $script 失败${NC}"
            exit 1
        fi
    done
    
    log "SUCCESS" "${GREEN}✓ 文件上传完成${NC}"
}

# 设置权限
set_permissions() {
    log "INFO" "${YELLOW}设置文件权限...${NC}"
    
    ssh -i "$PEM_FILE" "$SERVER" "cd $REMOTE_DIR && \
        chmod +x system-monitor.sh system-service-manager.sh install-monitor.sh"
        
    if [ $? -ne 0 ]; then
        log "ERROR" "${RED}错误: 设置权限失败${NC}"
        exit 1
    fi
    log "SUCCESS" "${GREEN}✓ 权限设置完成${NC}"
}

# 安装监控系统
install_monitor() {
    log "INFO" "${YELLOW}安装监控系统...${NC}"
    
    ssh -i "$PEM_FILE" "$SERVER" "cd $REMOTE_DIR && ./install-monitor.sh"
    
    if [ $? -ne 0 ]; then
        log "ERROR" "${RED}错误: 安装监控系统失败${NC}"
        exit 1
    fi
    log "SUCCESS" "${GREEN}✓ 监控系统安装完成${NC}"
}

# 验证安装
verify_installation() {
    log "INFO" "${YELLOW}验证安装...${NC}"
    
    # 检查cron任务
    ssh -i "$PEM_FILE" "$SERVER" "crontab -l | grep system-monitor.sh"
    if [ $? -ne 0 ]; then
        log "ERROR" "${RED}错误: Cron任务验证失败${NC}"
        exit 1
    fi
    
    # 检查监控脚本运行状态
    ssh -i "$PEM_FILE" "$SERVER" "cd $REMOTE_DIR && ./system-monitor.sh"
    if [ $? -ne 0 ]; then
        log "ERROR" "${RED}错误: 监控脚本运行测试失败${NC}"
        exit 1
    fi
    
    log "SUCCESS" "${GREEN}✓ 安装验证通过${NC}"
}

# 显示部署结果
show_deployment_result() {
    log "INFO" "\n${GREEN}=== ProductMind AI 监控系统部署完成 ===${NC}"
    log "INFO" "监控脚本已安装在: $REMOTE_DIR"
    log "INFO" "监控日志位置: $REMOTE_DIR/logs/monitor-cron.log"
    log "INFO" "\n${YELLOW}常用命令:${NC}"
    log "INFO" "1. 查看监控日志:"
    log "INFO" "   ssh -i $PEM_FILE $SERVER 'tail -f $REMOTE_DIR/logs/monitor-cron.log'"
    log "INFO" "2. 查看服务状态:"
    log "INFO" "   ssh -i $PEM_FILE $SERVER 'cd $REMOTE_DIR && ./system-service-manager.sh status'"
    log "INFO" "3. 手动运行监控:"
    log "INFO" "   ssh -i $PEM_FILE $SERVER 'cd $REMOTE_DIR && ./system-monitor.sh'"
}

# 主函数
main() {
    log "INFO" "${GREEN}开始部署 ProductMind AI 监控系统...${NC}"
    
    # 执行部署步骤
    check_local_files
    check_server_connection
    upload_files
    set_permissions
    install_monitor
    verify_installation
    show_deployment_result
    
    log "SUCCESS" "\n${GREEN}✓ 部署成功完成!${NC}"
}

# 执行主函数
main "$@" 