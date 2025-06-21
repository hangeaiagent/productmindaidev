#!/bin/bash

# 远程服务器模板详情页面迁移脚本
# 移除aws-backend/pdhtml软链接，将static/pdhtml移动到static-pages/pdhtml

echo "🚀 ProductMind AI 模板详情页面迁移到static-pages"
echo "================================================="

# 设置工作目录
WORK_DIR="/home/productmindaidev"
cd $WORK_DIR

echo "📍 当前工作目录: $(pwd)"

# 1. 检查当前状态
echo ""
echo "🔍 检查当前目录状态..."

if [ -L "aws-backend/pdhtml" ]; then
    echo "✅ 发现软链接: aws-backend/pdhtml"
    echo "   链接目标: $(readlink aws-backend/pdhtml)"
elif [ -d "aws-backend/pdhtml" ]; then
    echo "⚠️  aws-backend/pdhtml 是真实目录，不是软链接"
else
    echo "❌ aws-backend/pdhtml 不存在"
fi

if [ -d "static/pdhtml" ]; then
    TOTAL_PROJECTS=$(find static/pdhtml -maxdepth 1 -type d | grep -v "^static/pdhtml$" | wc -l)
    TOTAL_FILES=$(find static/pdhtml -name "*.html" | wc -l)
    echo "✅ 发现源目录: static/pdhtml"
    echo "   项目目录: $TOTAL_PROJECTS 个"
    echo "   HTML文件: $TOTAL_FILES 个"
else
    echo "❌ static/pdhtml 目录不存在"
    exit 1
fi

# 2. 移除软链接
echo ""
echo "🗑️  移除软链接..."
if [ -L "aws-backend/pdhtml" ]; then
    rm aws-backend/pdhtml
    echo "✅ 已移除软链接: aws-backend/pdhtml"
elif [ -d "aws-backend/pdhtml" ]; then
    echo "⚠️  aws-backend/pdhtml 是真实目录，跳过删除"
fi

# 3. 创建static-pages目录
echo ""
echo "📁 准备static-pages目录..."
mkdir -p static-pages
echo "✅ 确保目录存在: static-pages/"

# 4. 移动目录
echo ""
echo "📦 移动目录到static-pages..."
echo "   源目录: static/pdhtml/"
echo "   目标目录: static-pages/pdhtml/"

# 直接移动整个目录
mv static/pdhtml static-pages/pdhtml

# 5. 验证移动结果
echo ""
echo "✅ 移动完成，验证结果..."

if [ -d "static-pages/pdhtml" ]; then
    MOVED_PROJECTS=$(find static-pages/pdhtml -maxdepth 1 -type d | grep -v "^static-pages/pdhtml$" | wc -l)
    MOVED_FILES=$(find static-pages/pdhtml -name "*.html" | wc -l)
    
    echo "📊 移动后统计:"
    echo "   - 项目目录: $MOVED_PROJECTS 个"
    echo "   - HTML文件: $MOVED_FILES 个"
    
    # 检查移动完整性
    if [ "$TOTAL_FILES" -eq "$MOVED_FILES" ] && [ "$TOTAL_PROJECTS" -eq "$MOVED_PROJECTS" ]; then
        echo "✅ 目录移动成功！"
        echo "❌ 原目录已不存在: static/pdhtml/"
        echo "✅ 新目录位置: static-pages/pdhtml/"
        
    else
        echo "⚠️  文件数量不匹配，请检查:"
        echo "   原始文件: $TOTAL_FILES, 移动后: $MOVED_FILES"
        echo "   原始目录: $TOTAL_PROJECTS, 移动后: $MOVED_PROJECTS"
    fi
else
    echo "❌ 移动失败，目标目录不存在"
    exit 1
fi

# 6. 显示目录结构示例
echo ""
echo "📂 新的目录结构示例:"
if [ -d "static-pages/pdhtml" ]; then
    # 显示前3个项目目录
    find static-pages/pdhtml -maxdepth 1 -type d | grep -v "^static-pages/pdhtml$" | head -3 | while read dir; do
        project_id=$(basename "$dir")
        echo "   static-pages/pdhtml/$project_id/"
        
        # 显示该项目下的前2个文件
        find "$dir" -name "*.html" | head -2 | while read file; do
            filename=$(basename "$file")
            echo "   ├── $filename"
        done
        
        # 如果有更多文件，显示省略号
        file_count=$(find "$dir" -name "*.html" | wc -l)
        if [ "$file_count" -gt 2 ]; then
            echo "   └── ... (共 $file_count 个文件)"
        fi
        echo ""
    done
fi

# 7. 显示访问路径变更信息
echo "🔗 访问路径变更:"
echo "   旧路径: /static/pdhtml/<project_id>/<template_version_id>.html"
echo "   新路径: /static-pages/pdhtml/<project_id>/<template_version_id>.html"

# 8. 最终统计
echo ""
echo "📊 迁移完成统计:"
echo "=================="
echo "📁 总项目数: $MOVED_PROJECTS"
echo "📄 总文件数: $MOVED_FILES"
echo "📍 新位置: static-pages/pdhtml/"
echo "❌ 原位置: static/pdhtml/ (已移除)"
echo "🗑️  软链接: aws-backend/pdhtml (已移除)"

echo ""
echo "🎉 迁移完成！"
echo ""
echo "💡 下一步操作:"
echo "   1. 更新静态文件服务器配置"
echo "   2. 重启静态文件服务器"
echo "   3. 测试模板详情页面访问"
echo "   4. 更新前端页面中的链接路径"

echo ""
echo "🧪 测试命令:"
echo "   # 检查文件是否可访问"
echo "   curl -I http://localhost:3030/static-pages/pdhtml/[project_id]/[template_version_id].html" 