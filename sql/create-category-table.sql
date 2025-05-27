-- ===========================================
-- 产品分类表建立脚本
-- 基于AIbase网站分类结构
-- ===========================================

-- 删除表（如果存在）
DROP TABLE IF EXISTS user_projectscategory CASCADE;

-- 创建分类表
CREATE TABLE user_projectscategory (
  id SERIAL PRIMARY KEY,
  category_code VARCHAR(10) NOT NULL UNIQUE,
  category_name VARCHAR(100) NOT NULL,
  parent_category_code VARCHAR(10),
  category_level INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_user_projectscategory_parent ON user_projectscategory(parent_category_code);
CREATE INDEX idx_user_projectscategory_level ON user_projectscategory(category_level);
CREATE INDEX idx_user_projectscategory_sort ON user_projectscategory(sort_order);

-- ===========================================
-- 插入一级分类数据
-- ===========================================
INSERT INTO user_projectscategory (category_code, category_name, parent_category_code, category_level, sort_order) VALUES
('10', '图像处理', NULL, 1, 10),
('20', '视频创作', NULL, 1, 20),
('30', '效率助手', NULL, 1, 30),
('40', '写作灵感', NULL, 1, 40),
('50', '艺术灵感', NULL, 1, 50),
('60', '趣味', NULL, 1, 60),
('70', '开发编程', NULL, 1, 70),
('80', '聊天机器人', NULL, 1, 80),
('90', '翻译', NULL, 1, 90),
('100', '教育学习', NULL, 1, 100),
('110', '智能营销', NULL, 1, 110);

-- ===========================================
-- 插入二级分类数据
-- ===========================================

-- 图像处理 (10)
INSERT INTO user_projectscategory (category_code, category_name, parent_category_code, category_level, sort_order) VALUES
('1010', '图片背景移除', '10', 2, 1010),
('1020', '图片无损放大', '10', 2, 1020),
('1030', '图片AI修复', '10', 2, 1030),
('1040', '图像生成', '10', 2, 1040),
('1050', 'Ai图片拓展', '10', 2, 1050),
('1060', 'Ai漫画生成', '10', 2, 1060),
('1070', 'Ai生成写真', '10', 2, 1070),
('1080', '电商图片制作', '10', 2, 1080),
('1090', 'Ai图像转视频', '10', 2, 1090);

-- 视频创作 (20)
INSERT INTO user_projectscategory (category_code, category_name, parent_category_code, category_level, sort_order) VALUES
('2010', '视频剪辑', '20', 2, 2010),
('2020', '生成视频', '20', 2, 2020),
('2030', 'Ai动画制作', '20', 2, 2030),
('2040', '字幕生成', '20', 2, 2040);

-- 效率助手 (30)
INSERT INTO user_projectscategory (category_code, category_name, parent_category_code, category_level, sort_order) VALUES
('3010', 'AI文档工具', '30', 2, 3010),
('3020', 'PPT', '30', 2, 3020),
('3030', '思维导图', '30', 2, 3030),
('3040', '表格处理', '30', 2, 3040),
('3050', 'Ai办公助手', '30', 2, 3050);

-- 写作灵感 (40)
INSERT INTO user_projectscategory (category_code, category_name, parent_category_code, category_level, sort_order) VALUES
('4010', '文案写作', '40', 2, 4010),
('4020', '论文写作', '40', 2, 4020);

-- 艺术灵感 (50)
INSERT INTO user_projectscategory (category_code, category_name, parent_category_code, category_level, sort_order) VALUES
('5010', '语音克隆', '50', 2, 5010),
('5020', '设计创作', '50', 2, 5020),
('5030', 'Ai图标生成', '50', 2, 5030);

-- 趣味 (60)
INSERT INTO user_projectscategory (category_code, category_name, parent_category_code, category_level, sort_order) VALUES
('6010', 'Ai名字生成器', '60', 2, 6010),
('6020', '游戏娱乐', '60', 2, 6020),
('6030', '其他', '60', 2, 6030);

-- 开发编程 (70)
INSERT INTO user_projectscategory (category_code, category_name, parent_category_code, category_level, sort_order) VALUES
('7010', '开发编程', '70', 2, 7010),
('7020', 'Ai开放平台', '70', 2, 7020),
('7030', 'Ai算力平台', '70', 2, 7030);

-- 聊天机器人 (80)
INSERT INTO user_projectscategory (category_code, category_name, parent_category_code, category_level, sort_order) VALUES
('8010', '智能聊天', '80', 2, 8010),
('8020', '智能客服', '80', 2, 8020);

-- 翻译 (90)
INSERT INTO user_projectscategory (category_code, category_name, parent_category_code, category_level, sort_order) VALUES
('9010', '翻译', '90', 2, 9010);

-- 教育学习 (100)
INSERT INTO user_projectscategory (category_code, category_name, parent_category_code, category_level, sort_order) VALUES
('10010', '教育学习', '100', 2, 10010);

-- 智能营销 (110)
INSERT INTO user_projectscategory (category_code, category_name, parent_category_code, category_level, sort_order) VALUES
('11010', '智能营销', '110', 2, 11010);

-- ===========================================
-- 查询示例
-- ===========================================

-- 查询所有一级分类
-- SELECT * FROM user_projectscategory WHERE category_level = 1 ORDER BY sort_order;

-- 查询某个一级分类下的二级分类（例如：图像处理）
-- SELECT * FROM user_projectscategory WHERE parent_category_code = '10' ORDER BY sort_order;

-- 查询完整的层级结构
-- WITH RECURSIVE category_tree AS (
--   SELECT *, 0 as depth FROM user_projectscategory WHERE category_level = 1
--   UNION ALL
--   SELECT c.*, ct.depth + 1 FROM user_projectscategory c
--   JOIN category_tree ct ON c.parent_category_code = ct.category_code
-- )
-- SELECT * FROM category_tree ORDER BY sort_order;

-- 统计各分类下的产品数量（需要先关联user_projects表）
-- SELECT 
--   c.category_name,
--   c.category_level,
--   COUNT(p.id) as product_count
-- FROM user_projectscategory c
-- LEFT JOIN user_projects p ON (
--   (c.category_level = 1 AND p.primary_category = c.category_name) OR
--   (c.category_level = 2 AND p.secondary_category = c.category_name)
-- )
-- GROUP BY c.id, c.category_name, c.category_level
-- ORDER BY c.sort_order; 