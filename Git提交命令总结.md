# Git提交命令总结

## 快速提交命令

### 1. 标准提交流程
```bash
# 检查状态
git status

# 添加文件
git add .

# 提交代码
git commit -m "feat: 完成模板正式生成系统优化"

# 推送到远程
git push origin main
```

### 2. 一键提交脚本
```bash
# 使用提交脚本
chmod +x commit-to-github.sh
./commit-to-github.sh
```

### 3. 分步提交（推荐）
```bash
# 1. 添加文档文件
git add 模板中英文字段开发说明.md
git add 模板正式生成部署执行指南.md
git add 数据库开发问题清单.md

# 2. 添加脚本文件
git add production-batch-executor.mjs
git add test-production-batch-fixed.mjs

# 3. 提交文档
git commit -m "docs: 添加模板中英文字段开发说明和部署指南"

# 4. 提交代码
git commit -m "feat: 修复UUID格式和英文翻译问题"

# 5. 推送
git push origin main
```

## 提交信息模板

### 功能开发提交
```bash
git commit -m "feat: 完成模板正式生成系统

- 修复UUID格式问题，使用真实用户ID
- 完善英文翻译逻辑，支持中英双语
- 优化批量生产流程
- 添加完整文档说明"
```

### 文档更新提交
```bash
git commit -m "docs: 更新开发文档

- 新增模板中英文字段开发说明
- 新增部署执行指南
- 更新数据库开发问题清单
- 完善系统部署记录"
```

### 修复问题提交
```bash
git commit -m "fix: 修复批量生产问题

- 修复created_by字段UUID格式错误
- 修复MockAIService语言参数处理
- 优化错误处理机制"
```

## 常用Git命令

### 状态检查
```bash
# 查看工作区状态
git status

# 查看暂存区状态
git status --staged

# 查看修改内容
git diff
```

### 分支操作
```bash
# 查看分支
git branch

# 创建新分支
git checkout -b feature/template-generation

# 切换分支
git checkout main

# 合并分支
git merge feature/template-generation
```

### 历史查看
```bash
# 查看提交历史
git log --oneline -10

# 查看文件历史
git log --follow 模板中英文字段开发说明.md

# 查看提交详情
git show <commit-hash>
```

## 注意事项

### 提交前检查
- 确认所有修改都已保存
- 检查是否有敏感信息
- 验证代码功能正常
- 确认文档内容准确

### 提交后验证
- 检查远程仓库更新
- 验证CI/CD流程正常
- 确认部署成功
- 通知团队成员

---

**创建时间**: 2024年12月19日  
**维护人员**: ProductMind AI开发团队 