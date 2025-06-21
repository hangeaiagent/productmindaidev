import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 导入增强版生成器
import('./template-html-generator.mjs').then(({ HtmlTemplateGenerator, MarkdownToHtml }) => {
  
  console.log('🧪 开始测试增强版HTML生成器...\n');

  // 测试数据
  const testData = {
    id: 'test-enhanced-001',
    output_content_zh: JSON.stringify({
      content: `# AI特征工程系统

## 系统架构概述

本系统采用先进的AI技术栈，实现智能化的特征工程处理。

### 特征类型对比

| 特征类型 | 计算逻辑 | 存储形式 |
|------------------|--------------------------------------------|-------------------|
| 广告主价值等级 | RFM模型：最近活动、生成量、平均单价 | Elasticsearch Doc |
| 创作者合规指数 | 版权协议完备性 × 素材侵权风险预测 | MongoDB JSON |
| 内容偏好向量 | BERT多语言嵌入（sentence-transformers 2.2）| 768维Float数组 |

### 核心算法实现

\`\`\`python
# AI特征工程示例
class FeatureEngine:
    def __init__(self, config):
        self.config = config
        self.features = new Map()
    
    async def process_user_behavior(self, user_data):
        """处理用户行为数据"""
        rfm_score = self.calculate_rfm(user_data)
        compliance_index = await self.assess_compliance(user_data)
        preference_vector = self.generate_preference_vector(user_data)
        
        return {
            'rfm_score': rfm_score,
            'compliance_index': compliance_index, 
            'preference_vector': preference_vector
        }
    
    def calculate_rfm(self, user_data):
        """计算RFM评分"""
        recency = self.get_recency_score(user_data)
        frequency = self.get_frequency_score(user_data)
        monetary = self.get_monetary_score(user_data)
        
        return (recency * 0.3 + frequency * 0.4 + monetary * 0.3)
\`\`\`

### 处理流程

\`\`\`flow
- 数据采集：从多个数据源收集用户行为数据
- 特征提取：使用AI模型提取关键特征
- 特征工程：对原始特征进行变换和组合
- 模型训练：训练机器学习模型
- 结果输出：生成最终的特征向量
\`\`\`

### Mermaid流程图

\`\`\`mermaid
graph LR
    A[数据采集] --> B[特征提取]
    B --> C[特征工程]
    C --> D[模型训练]
    D --> E[结果输出]
    
    F[用户行为] --> A
    G[内容数据] --> A
    H[交互数据] --> A
    
    E --> I[推荐系统]
    E --> J[风控系统]
    E --> K[个性化服务]
    
    style A fill:#667eea,stroke:#333,stroke-width:2px,color:#fff
    style E fill:#48bb78,stroke:#333,stroke-width:2px,color:#fff
\`\`\`

### 技术栈说明

- **数据处理**: Python + Pandas + NumPy
- **机器学习**: TensorFlow + PyTorch + Scikit-learn
- **特征存储**: Redis + Elasticsearch + MongoDB
- **API服务**: FastAPI + Uvicorn
- **监控告警**: Prometheus + Grafana

### 性能指标

- 处理速度：10,000 QPS
- 响应时间：< 100ms
- 准确率：> 95%
- 可用性：99.9%
`
    }),
    output_content_en: JSON.stringify({
      content: `# AI Feature Engineering System

## System Architecture Overview

This system uses advanced AI technology stack to implement intelligent feature engineering processing.

### Feature Type Comparison

| Feature Type | Calculation Logic | Storage Format |
|------------------|--------------------------------------------|-------------------|
| Advertiser Value Level | RFM Model: Recent Activity, Generation Volume, Average Price | Elasticsearch Doc |
| Creator Compliance Index | Copyright Agreement Completeness × Material Infringement Risk Prediction | MongoDB JSON |
| Content Preference Vector | BERT Multilingual Embedding (sentence-transformers 2.2)| 768-dim Float Array |

### Core Algorithm Implementation

\`\`\`javascript
// AI Feature Engineering Example
class FeatureEngine {
    constructor(config) {
        this.config = config;
        this.features = new Map();
    }
    
    async processUserBehavior(userData) {
        const rfmScore = this.calculateRFM(userData);
        const complianceIndex = await this.assessCompliance(userData);
        const preferenceVector = this.generatePreferenceVector(userData);
        
        return {
            rfmScore,
            complianceIndex, 
            preferenceVector
        };
    }
}
\`\`\`

### Processing Flow

\`\`\`flow
- Data Collection: Collect user behavior data from multiple sources
- Feature Extraction: Extract key features using AI models
- Feature Engineering: Transform and combine raw features
- Model Training: Train machine learning models
- Result Output: Generate final feature vectors
\`\`\`
`
    }),
    templates: {
      name_zh: 'AI特征工程模板',
      name_en: 'AI Feature Engineering Template'
    },
    user_projects: {
      name_zh: '智能推荐系统',
      name_en: 'Intelligent Recommendation System',
      description_zh: '基于AI的个性化内容推荐系统，支持多维度特征工程和实时推荐',
      description_en: 'AI-based personalized content recommendation system with multi-dimensional feature engineering and real-time recommendations'
    },
    created_at: new Date().toISOString()
  };

  // 测试中文版本
  console.log('📝 测试中文版本生成...');
  const zhHtml = HtmlTemplateGenerator.generateTemplate(testData, 'zh');
  
  // 测试英文版本
  console.log('📝 测试英文版本生成...');
  const enHtml = HtmlTemplateGenerator.generateTemplate(testData, 'en');
  
  // 创建测试输出目录
  const testOutputDir = path.join(__dirname, 'test-output');
  if (!fs.existsSync(testOutputDir)) {
    fs.mkdirSync(testOutputDir, { recursive: true });
  }
  
  // 保存测试文件
  const zhFile = path.join(testOutputDir, 'test-enhanced-zh.html');
  const enFile = path.join(testOutputDir, 'test-enhanced-en.html');
  
  fs.writeFileSync(zhFile, zhHtml, 'utf8');
  fs.writeFileSync(enFile, enHtml, 'utf8');
  
  console.log('✅ 测试完成！');
  console.log(`📄 中文版本已保存到: ${zhFile}`);
  console.log(`📄 英文版本已保存到: ${enFile}`);
  
  // 测试Markdown转换功能
  console.log('\n🧪 测试Markdown转换功能...');
  
  const testMarkdown = `
# 测试标题

## 表格测试
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 数据1 | 数据2 | 数据3 |
| 数据4 | 数据5 | 数据6 |

## 代码测试
\`\`\`javascript
function test() {
    console.log('Hello World');
    return true;
}
\`\`\`

## 流程图测试
\`\`\`flow
- 步骤1：开始
- 步骤2：处理
- 步骤3：结束
\`\`\`

## Mermaid图测试
\`\`\`mermaid
graph TD;
    A-->B;
    A-->C;
    B-->D;
    C-->D;
\`\`\`
`;

  const convertedHtml = MarkdownToHtml.convert(testMarkdown);
  const testConvertFile = path.join(testOutputDir, 'markdown-conversion-test.html');
  
  const fullTestHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Markdown转换测试</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        ${HtmlTemplateGenerator.getCSS()}
    </style>
</head>
<body>
    <div class="container">
        <h1>Markdown转换测试结果</h1>
        ${convertedHtml}
    </div>
    <script>
        ${HtmlTemplateGenerator.getJavaScript(false)}
    </script>
</body>
</html>
`;
  
  fs.writeFileSync(testConvertFile, fullTestHtml, 'utf8');
  console.log(`📄 Markdown转换测试已保存到: ${testConvertFile}`);
  
  // 输出功能总结
  console.log('\n🎯 增强功能总结:');
  console.log('   ✅ 智能表格渲染 - 支持排序和悬停效果');
  console.log('   ✅ 增强代码块 - 语言标识、复制、展开功能');
  console.log('   ✅ 流程图支持 - 简化流程图和Mermaid图表');
  console.log('   ✅ 响应式设计 - 移动端完美适配');
  console.log('   ✅ 交互动画 - Toast通知、悬停效果');
  console.log('   ✅ SEO优化 - Meta标签、语义化结构');
  
  console.log('\n🚀 可以在浏览器中打开测试文件查看效果！');

}).catch(error => {
  console.error('❌ 测试失败:', error);
}); 