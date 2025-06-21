#!/bin/bash

# Git提交脚本 - 提交模板正式生成相关代码到GitHub

echo "🚀 开始提交代码到GitHub..."

# 检查Git状态
echo "📋 检查Git状态..."
git status

# 添加所有修改的文件
echo "📁 添加修改的文件..."
git add .

# 检查暂存区状态
echo "📋 检查暂存区状态..."
git status --staged

# 提交代码
echo "💾 提交代码..."
git commit -m "feat: 完成模板正式生成系统

- 修复UUID格式问题，使用真实用户ID替代字符串
- 完善英文翻译逻辑，支持中英双语内容生成
- 优化批量生产流程，提升内容生成质量
- 添加数据库开发问题清单和模板中英文字段开发说明
- 创建完整的部署执行指南
- 修复MockAIService语言参数处理问题
- 优化错误处理和日志记录
- 完善生产环境批量生产脚本

技术改进:
- 使用真实UUID: afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1
- 修复language参数处理逻辑
- 完善数据库保存机制
- 优化AI服务调用流程

文档更新:
- 新增: 模板中英文字段开发说明.md
- 新增: 模板正式生成部署执行指南.md
- 更新: 数据库开发问题清单.md
- 完善: 系统部署记录.md"

# 推送到远程仓库
echo "📤 推送到远程仓库..."
git push origin main

echo "✅ 代码提交完成！"

# 显示提交历史
echo "📜 最近提交历史:"
git log --oneline -5 