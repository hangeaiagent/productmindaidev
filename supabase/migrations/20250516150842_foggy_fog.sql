/*
  # 添加模板排序功能
  
  1. 新增字段
    - templates表添加no字段用于排序
    - 更新现有模板的排序规则
    
  2. 排序规则说明
    按照应用顺序排序：
    1. 产品愿景和价值主张（战略层）
    2. 用户研究和需求分析（研究层）
    3. 产品规划和功能设计（规划层）
    4. 技术评估和开发规划（实施层）
    5. 运营策略和增长方案（运营层）
*/

-- 添加排序字段
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS no INTEGER NOT NULL DEFAULT 1;

-- 更新现有模板排序
DO $$ 
BEGIN
  -- 策略与愿景类
  UPDATE templates SET no = 1 WHERE name_en = 'Product Vision Statement';
  UPDATE templates SET no = 2 WHERE name_en = 'Product Value Proposition';
  UPDATE templates SET no = 3 WHERE name_en = 'Pricing Strategy';
  
  -- 用户研究类
  UPDATE templates SET no = 1 WHERE name_en = 'User Persona Building';
  UPDATE templates SET no = 2 WHERE name_en = 'User Pain Points Analysis';
  UPDATE templates SET no = 3 WHERE name_en = 'User Interview Questions';
  UPDATE templates SET no = 4 WHERE name_en = 'User Satisfaction Survey';
  
  -- 产品规划类
  UPDATE templates SET no = 1 WHERE name_en = 'Product Requirements Document';
  UPDATE templates SET no = 2 WHERE name_en = 'MVP Feature Definition';
  UPDATE templates SET no = 3 WHERE name_en = 'Feature Prioritization';
  UPDATE templates SET no = 4 WHERE name_en = 'Product Roadmap';
  
  -- 数据分析类
  UPDATE templates SET no = 1 WHERE name_en = 'Market Trend Analysis';
  UPDATE templates SET no = 2 WHERE name_en = 'Competitor Analysis';
  UPDATE templates SET no = 3 WHERE name_en = 'Product Metrics Definition';
  UPDATE templates SET no = 4 WHERE name_en = 'A/B Testing Plan';
  
  -- 增长与留存类
  UPDATE templates SET no = 1 WHERE name_en = 'Growth Strategy';
  UPDATE templates SET no = 2 WHERE name_en = 'User Retention Strategy';
  UPDATE templates SET no = 3 WHERE name_en = 'Product Operations Strategy';
  
  -- 设计与体验类
  UPDATE templates SET no = 1 WHERE name_en = 'User Experience Design';
  UPDATE templates SET no = 2 WHERE name_en = 'Dashboard Design';
  UPDATE templates SET no = 3 WHERE name_en = 'Process Flow Design';
  
  -- 开发类
  UPDATE templates SET no = 1 WHERE name_en = 'Technical Requirements';
  UPDATE templates SET no = 2 WHERE name_en = 'Technical Feasibility Analysis';
  UPDATE templates SET no = 3 WHERE name_en = 'Analytics Implementation';
  UPDATE templates SET no = 4 WHERE name_en = 'Product Terminology Guide';
END $$;