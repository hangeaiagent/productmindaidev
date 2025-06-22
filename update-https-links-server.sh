#!/bin/bash

# HTTPS链接更新脚本
# 用于将产品主页中的HTTP链接更新为HTTPS

echo "🔄 开始更新HTTP链接为HTTPS..."

# 定义静态页面目录
STATIC_DIR="static-pages/pdhtml"

if [ ! -d "$STATIC_DIR" ]; then
    echo "❌ 静态页面目录不存在: $STATIC_DIR"
    exit 1
fi

echo "📁 扫描目录: $STATIC_DIR"

# 统计变量
updated_files=0
total_files=0

# 查找所有HTML文件并更新链接
find "$STATIC_DIR" -name "*.html" -type f | while read -r file; do
    total_files=$((total_files + 1))
    
    # 检查文件是否包含HTTP链接
    if grep -q "http://productmindai.com" "$file"; then
        echo "🔧 更新文件: $file"
        
        # 备份原文件
        cp "$file" "$file.backup"
        
        # 替换HTTP为HTTPS
        sed -i 's|http://productmindai.com|https://productmindai.com|g' "$file"
        
        updated_files=$((updated_files + 1))
        echo "✅ 已更新: $file"
    fi
done

echo ""
echo "📊 更新完成统计:"
echo "   总文件数: $(find "$STATIC_DIR" -name "*.html" -type f | wc -l)"
echo "   已更新文件: $updated_files"

# 检查是否有备份文件
backup_count=$(find "$STATIC_DIR" -name "*.backup" -type f | wc -l)
if [ $backup_count -gt 0 ]; then
    echo "📦 备份文件数: $backup_count"
    echo "💡 如需恢复，备份文件后缀为 .backup"
fi

echo ""
echo "🎉 HTTPS链接更新完成！"

# 验证更新结果
echo "🔍 验证更新结果..."
remaining_http=$(find "$STATIC_DIR" -name "*.html" -type f -exec grep -l "http://productmindai.com" {} \; | wc -l)

if [ $remaining_http -eq 0 ]; then
    echo "✅ 所有HTTP链接已成功更新为HTTPS"
else
    echo "⚠️  仍有 $remaining_http 个文件包含HTTP链接，请检查"
    find "$STATIC_DIR" -name "*.html" -type f -exec grep -l "http://productmindai.com" {} \;
fi

echo ""
echo "🔗 测试HTTPS访问..."
if curl -s -I https://productmindai.com | grep -q "200 OK"; then
    echo "✅ HTTPS访问正常"
else
    echo "⚠️  HTTPS访问可能有问题，请检查配置"
fi 