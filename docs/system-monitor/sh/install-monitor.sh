#!/bin/bash

# ProductMind AI 监控系统安装脚本
# 功能：安装和配置系统监控

# 配置
INSTALL_DIR="/home/productmindaidev"
SCRIPTS_DIR="$INSTALL_DIR"
LOG_DIR="$INSTALL_DIR/logs"
MONITOR_SCRIPT="$SCRIPTS_DIR/system-monitor.sh"
MANAGER_SCRIPT="$SCRIPTS_DIR/system-service-manager.sh"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# 日志函数
log() {
    echo -e "$1"
}

# 检查必要条件
check_prerequisites() {
    log "${GREEN}检查必要条件...${NC}"
    
    # 检查目录
    if [ ! -d "$INSTALL_DIR" ]; then
        log "${RED}错误: 安装目录不存在${NC}"
        exit 1
    fi
    
    # 检查脚本文件
    if [ ! -f "$MONITOR_SCRIPT" ] || [ ! -f "$MANAGER_SCRIPT" ]; then
        log "${RED}错误: 监控脚本或管理脚本不存在${NC}"
        exit 1
    fi
    
    # 检查权限
    if [ ! -x "$MONITOR_SCRIPT" ] || [ ! -x "$MANAGER_SCRIPT" ]; then
        log "${GREEN}设置脚本执行权限...${NC}"
        chmod +x "$MONITOR_SCRIPT" "$MANAGER_SCRIPT"
    fi
}

# 创建日志目录
setup_logging() {
    log "${GREEN}设置日志目录...${NC}"
    mkdir -p "$LOG_DIR"
    chmod 755 "$LOG_DIR"
}

# 安装cron任务
install_cron() {
    log "${GREEN}安装cron任务...${NC}"
    
    # 移除旧的cron任务
    (crontab -l 2>/dev/null | grep -v "$MONITOR_SCRIPT") | crontab -
    
    # 添加新的cron任务
    (crontab -l 2>/dev/null; echo "*/5 * * * * $MONITOR_SCRIPT >> $LOG_DIR/monitor-cron.log 2>&1") | crontab -
    
    if [ $? -eq 0 ]; then
        log "${GREEN}✓ Cron任务安装成功${NC}"
    else
        log "${RED}✗ Cron任务安装失败${NC}"
        exit 1
    fi
}

# 验证安装
verify_installation() {
    log "${GREEN}验证安装...${NC}"
    
    # 检查cron任务
    if crontab -l | grep -q "$MONITOR_SCRIPT"; then
        log "${GREEN}✓ Cron任务已配置${NC}"
    else
        log "${RED}✗ Cron任务配置失败${NC}"
        exit 1
    fi
    
    # 测试运行监控脚本
    log "${GREEN}测试运行监控脚本...${NC}"
    $MONITOR_SCRIPT
    
    if [ $? -eq 0 ]; then
        log "${GREEN}✓ 监控脚本测试运行成功${NC}"
    else
        log "${RED}✗ 监控脚本测试运行失败${NC}"
        exit 1
    fi
}

# 显示使用说明
show_usage() {
    log "\n${GREEN}=== ProductMind AI 监控系统 ===${NC}"
    log "监控脚本已安装并配置为每5分钟运行一次"
    log "\n${GREEN}常用命令:${NC}"
    log "查看cron任务: crontab -l"
    log "查看监控日志: tail -f $LOG_DIR/monitor-cron.log"
    log "查看服务状态: $MANAGER_SCRIPT status"
    log "\n${GREEN}手动操作:${NC}"
    log "手动运行监控: $MONITOR_SCRIPT"
    log "服务恢复: $MANAGER_SCRIPT recover"
    log "\n${GREEN}注意事项:${NC}"
    log "1. 监控日志位于: $LOG_DIR"
    log "2. 告警邮件将发送至配置的邮箱"
    log "3. 如需修改配置，请编辑 $MONITOR_SCRIPT"
}

# 主函数
main() {
    log "${GREEN}开始安装 ProductMind AI 监控系统...${NC}"
    
    # 执行安装步骤
    check_prerequisites
    setup_logging
    install_cron
    verify_installation
    show_usage
    
    log "\n${GREEN}✓ 安装完成!${NC}"
}

# 执行主函数
main "$@" 