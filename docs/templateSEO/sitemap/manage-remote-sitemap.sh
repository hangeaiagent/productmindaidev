#!/bin/bash
# manage-remote-sitemap.sh - 本地管理远程sitemap系统的便捷脚本
# ProductMind AI Sitemap远程管理工具

# 服务器配置
REMOTE_HOST="ec2-user@3.93.149.236"
SSH_KEY="/Users/a1/work/productmindai.pem"
REMOTE_PATH="/home/productmindaidev/sitemap-system"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 显示帮助信息
show_help() {
    echo -e "${BLUE}🚀 ProductMind AI 远程Sitemap管理工具${NC}"
    echo "=========================================="
    echo "用法: $0 [命令]"
    echo ""
    echo "可用命令:"
    echo -e "  ${GREEN}generate${NC}     - 立即生成sitemap"
    echo -e "  ${GREEN}status${NC}       - 检查系统状态"
    echo -e "  ${GREEN}logs${NC}         - 查看最新日志"
    echo -e "  ${GREEN}test${NC}         - 测试网络访问"
    echo -e "  ${GREEN}cron${NC}         - 查看定时任务"
    echo -e "  ${GREEN}ssh${NC}          - SSH连接到服务器"
    echo -e "  ${GREEN}files${NC}        - 查看sitemap文件"
    echo -e "  ${GREEN}help${NC}         - 显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 generate    # 立即生成sitemap"
    echo "  $0 status      # 检查系统状态"
    echo "  $0 test        # 测试所有sitemap访问"
}

# 检查SSH连接
check_connection() {
    echo -e "${YELLOW}🔍 检查SSH连接...${NC}"
    if ssh -i "$SSH_KEY" "$REMOTE_HOST" "echo 'SSH连接正常'" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ SSH连接正常${NC}"
        return 0
    else
        echo -e "${RED}❌ SSH连接失败，请检查网络和密钥${NC}"
        return 1
    fi
}

# 执行远程命令
execute_remote() {
    local command="$1"
    ssh -i "$SSH_KEY" "$REMOTE_HOST" "cd $REMOTE_PATH && $command"
}

# 立即生成sitemap
generate_sitemap() {
    echo -e "${BLUE}🚀 开始生成sitemap...${NC}"
    if ! check_connection; then
        return 1
    fi
    
    execute_remote "bash server-quick-generate.sh"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Sitemap生成完成！${NC}"
        echo -e "${YELLOW}🌐 访问地址:${NC}"
        echo "  https://productmindai.com/sitemap.xml"
        echo "  https://productmindai.com/sitemap-zh.xml"
        echo "  https://productmindai.com/sitemap-en.xml"
    else
        echo -e "${RED}❌ Sitemap生成失败${NC}"
        return 1
    fi
}

# 检查系统状态
check_status() {
    echo -e "${BLUE}📊 检查系统状态...${NC}"
    if ! check_connection; then
        return 1
    fi
    
    execute_remote "bash server-status.sh"
}

# 查看日志
view_logs() {
    echo -e "${BLUE}📝 查看最新日志...${NC}"
    if ! check_connection; then
        return 1
    fi
    
    echo -e "${YELLOW}最近的定时任务日志:${NC}"
    execute_remote "if [ -f logs/sitemap-cron.log ]; then tail -20 logs/sitemap-cron.log; else echo '暂无定时任务日志'; fi"
}

# 测试网络访问
test_access() {
    echo -e "${BLUE}🌐 测试sitemap网络访问...${NC}"
    
    local sitemaps=("sitemap.xml" "sitemap-zh.xml" "sitemap-en.xml" "sitemap-index.xml" "sitemap-images.xml")
    local all_ok=true
    
    for sitemap in "${sitemaps[@]}"; do
        local status=$(curl -s -o /dev/null -w "%{http_code}" "https://productmindai.com/$sitemap")
        if [ "$status" = "200" ]; then
            echo -e "  ${GREEN}✅ $sitemap: HTTP $status${NC}"
        else
            echo -e "  ${RED}❌ $sitemap: HTTP $status${NC}"
            all_ok=false
        fi
    done
    
    if $all_ok; then
        echo -e "${GREEN}🎉 所有sitemap文件访问正常！${NC}"
    else
        echo -e "${YELLOW}⚠️  部分sitemap文件访问异常，请检查服务器状态${NC}"
    fi
}

# 查看定时任务
view_cron() {
    echo -e "${BLUE}⏰ 查看定时任务...${NC}"
    if ! check_connection; then
        return 1
    fi
    
    echo -e "${YELLOW}当前定时任务:${NC}"
    execute_remote "crontab -l | grep sitemap"
}

# SSH连接到服务器
ssh_connect() {
    echo -e "${BLUE}🔗 连接到远程服务器...${NC}"
    echo -e "${YELLOW}提示: 连接后请执行 'cd $REMOTE_PATH' 进入sitemap目录${NC}"
    ssh -i "$SSH_KEY" "$REMOTE_HOST"
}

# 查看sitemap文件
view_files() {
    echo -e "${BLUE}📄 查看sitemap文件...${NC}"
    if ! check_connection; then
        return 1
    fi
    
    echo -e "${YELLOW}Sitemap文件列表:${NC}"
    execute_remote "ls -lh /home/productmindaidev/public/sitemap*.xml"
    
    echo -e "\n${YELLOW}文件内容统计:${NC}"
    execute_remote "
    if [ -f /home/productmindaidev/public/sitemap.xml ]; then
        echo '  主sitemap URL数量: '$(grep -c '<loc>' /home/productmindaidev/public/sitemap.xml)
        echo '  中文sitemap URL数量: '$(grep -c '<loc>' /home/productmindaidev/public/sitemap-zh.xml)
        echo '  英文sitemap URL数量: '$(grep -c '<loc>' /home/productmindaidev/public/sitemap-en.xml)
    else
        echo '  sitemap文件不存在'
    fi
    "
}

# 主函数
main() {
    case "${1:-help}" in
        "generate"|"gen"|"g")
            generate_sitemap
            ;;
        "status"|"stat"|"s")
            check_status
            ;;
        "logs"|"log"|"l")
            view_logs
            ;;
        "test"|"t")
            test_access
            ;;
        "cron"|"c")
            view_cron
            ;;
        "ssh")
            ssh_connect
            ;;
        "files"|"f")
            view_files
            ;;
        "help"|"h"|"--help"|"-h")
            show_help
            ;;
        *)
            echo -e "${RED}❌ 未知命令: $1${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@" 