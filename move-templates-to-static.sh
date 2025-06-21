#!/bin/bash

# 远程服务器模板详情页面迁移脚本
# 将已生成的模板详情页面从 aws-backend/pdhtml 移动到 static/pdhtml

echo "🚀 ProductMind AI 模板详情页面迁移脚本"
echo "========================================"

# 设置工作目录
WORK_DIR="/home/productmindaidev"
cd $WORK_DIR

echo "📍 当前工作目录: $(pwd)"

# 1. 检查源目录
if [ ! -d "aws-backend/pdhtml" ]; then
    echo "❌ 源目录不存在: aws-backend/pdhtml"
    echo "请先确认模板详情页面已经生成"
    exit 1
fi

# 统计源目录文件
TOTAL_PROJECTS=$(find aws-backend/pdhtml -maxdepth 1 -type d | grep -v "^aws-backend/pdhtml$" | wc -l)
TOTAL_FILES=$(find aws-backend/pdhtml -name "*.html" | wc -l)

echo "📊 发现源文件:"
echo "   - 项目目录: $TOTAL_PROJECTS 个"
echo "   - HTML文件: $TOTAL_FILES 个"

if [ "$TOTAL_FILES" -eq 0 ]; then
    echo "⚠️  没有发现HTML文件，退出操作"
    exit 1
fi

# 2. 创建目标目录
echo ""
echo "📁 创建目标目录结构..."
mkdir -p static/pdhtml
echo "✅ 创建目录: static/pdhtml"

# 3. 物理移动整个目录
echo ""
echo "📦 物理移动目录..."
echo "   源目录: aws-backend/pdhtml/"
echo "   目标目录: static/pdhtml/"

# 直接移动整个目录
mv aws-backend/pdhtml static/pdhtml

# 4. 验证移动结果
echo ""
echo "✅ 目录移动完成，验证结果..."

if [ -d "static/pdhtml" ]; then
    MOVED_PROJECTS=$(find static/pdhtml -maxdepth 1 -type d | grep -v "^static/pdhtml$" | wc -l)
    MOVED_FILES=$(find static/pdhtml -name "*.html" | wc -l)
    
    echo "📊 移动后统计:"
    echo "   - 项目目录: $MOVED_PROJECTS 个"
    echo "   - HTML文件: $MOVED_FILES 个"
    
    # 5. 检查移动完整性
    if [ "$TOTAL_FILES" -eq "$MOVED_FILES" ] && [ "$TOTAL_PROJECTS" -eq "$MOVED_PROJECTS" ]; then
        echo "✅ 目录物理移动成功！"
        echo "❌ 原目录已不存在: aws-backend/pdhtml/"
        echo "✅ 新目录位置: static/pdhtml/"
        
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
if [ -d "static/pdhtml" ]; then
    # 显示前3个项目目录
    find static/pdhtml -maxdepth 1 -type d | grep -v "^static/pdhtml$" | head -3 | while read dir; do
        project_id=$(basename "$dir")
        echo "   static/pdhtml/$project_id/"
        
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
echo "   旧路径: /aws-backend/pdhtml/<project_id>/<template_version_id>.html"
echo "   新路径: /static/pdhtml/<project_id>/<template_version_id>.html"

# 8. 最终统计
echo ""
echo "📊 迁移完成统计:"
echo "=================="
echo "📁 总项目数: $MOVED_PROJECTS"
echo "📄 总文件数: $MOVED_FILES"
echo "📍 新位置: static/pdhtml/"
echo "❌ 原位置: aws-backend/pdhtml/ (已移除)"

echo ""
echo "🎉 迁移完成！"
echo ""
echo "💡 下一步操作:"
echo "   1. 重启静态文件服务器以应用新路径"
echo "   2. 测试模板详情页面访问"
echo "   3. 更新前端页面中的链接路径"

echo ""
echo "🧪 测试命令:"
echo "   # 检查文件是否可访问"
echo "   curl -I http://localhost:3030/static/pdhtml/[project_id]/[template_version_id].html" 