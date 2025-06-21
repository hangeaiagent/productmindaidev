import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 导入HTML生成器
import('./template-html-generator.mjs').then(({ HtmlTemplateGenerator, MarkdownToHtml }) => {
  
  console.log('🧪 开始测试样式修复...\n');

  // 测试数据
  const testData = {
    id: 'test-style-fixes-001',
    output_content_zh: JSON.stringify({
      content: `# 样式测试页面

## 📊 表格展示测试

| 特征类型 | 计算逻辑 | 存储形式 |
|------------------|--------------------------------------------|-------------------|
| 广告主价值等级 | RFM模型：最近活动、生成量、平均单价 | Elasticsearch Doc |
| 创作者合规指数 | 版权协议完备性 × 素材侵权风险预测 | MongoDB JSON |
| 内容偏好向量 | BERT多语言嵌入（sentence-transformers 2.2）| 768维Float数组 |

## 💻 代码块展示测试

\`\`\`javascript
// AI特征工程核心算法
class FeatureEngine {
    constructor(config) {
        this.config = config;
        this.features = new Map();
    }
    
    async processUserBehavior(userData) {
        const rfmScore = await this.calculateRFM(userData);
        const complianceIndex = await this.assessCompliance(userData);
        
        return {
            rfmScore,
            complianceIndex,
            timestamp: Date.now()
        };
    }
}
\`\`\`

## 🔄 流程图展示测试

### 简化流程图

\`\`\`flow
- 数据收集：从多个数据源收集用户行为数据
- 特征提取：使用AI模型提取关键特征
- 特征工程：对原始特征进行变换和组合
- 模型训练：训练机器学习模型
- 结果输出：生成最终的特征向量
\`\`\`

### Mermaid流程图测试

#### 基础流程图
\`\`\`mermaid
flowchart TD
    A[数据采集] --> B[特征提取]
    B --> C[特征工程]
    C --> D[模型训练]
    D --> E[结果输出]
    
    style A fill:#667eea,stroke:#333,stroke-width:2px,color:#fff
    style E fill:#48bb78,stroke:#333,stroke-width:2px,color:#fff
\`\`\`

#### 复杂决策流程图
\`\`\`mermaid
flowchart TD
    Start[开始] --> Input[输入数据]
    Input --> Validate{数据验证}
    Validate -->|通过| Process[数据处理]
    Validate -->|失败| Error[错误处理]
    Process --> AI[AI分析]
    AI --> Decision{结果判断}
    Decision -->|满意| Output[输出结果]
    Decision -->|不满意| Retry[重新处理]
    Retry --> Process
    Output --> End[结束]
    Error --> End
    
    style Start fill:#e1f5fe
    style End fill:#f3e5f5
    style Decision fill:#fff3e0
    style Error fill:#ffebee
\`\`\`

#### 系统架构图
\`\`\`mermaid
graph LR
    User[用户] --> Frontend[前端应用]
    Frontend --> API[API网关]
    API --> Auth[认证服务]
    API --> Business[业务逻辑]
    Business --> Database[(数据库)]
    Business --> Cache[(缓存)]
    Business --> AI[AI服务]
\`\`\`

## 📝 行内代码测试

这里有一些行内代码：\`const result = await api.getData()\`，还有 \`SELECT * FROM users\`。
`
    }),
    templates: {
      name_zh: '样式测试模板',
      name_en: 'Style Test Template'
    },
    user_projects: {
      name_zh: '样式修复测试项目',
      name_en: 'Style Fix Test Project',
      description_zh: '测试表格、代码块和流程图的样式修复效果'
    },
    created_at: new Date().toISOString()
  };

  // 生成测试页面
  console.log('📝 生成测试页面...');
  const zhHtml = HtmlTemplateGenerator.generateTemplate(testData, 'zh');
  
  // 创建测试输出目录
  const testOutputDir = path.join(__dirname, 'style-test-output');
  if (!fs.existsSync(testOutputDir)) {
    fs.mkdirSync(testOutputDir, { recursive: true });
  }
  
  // 保存测试文件
  const zhFile = path.join(testOutputDir, 'style-test-zh.html');
  fs.writeFileSync(zhFile, zhHtml, 'utf8');
  
  console.log('✅ 样式测试页面生成完成！');
  console.log(`📄 文件路径: ${zhFile}`);
  console.log(`🔗 文件链接: file://${zhFile}`);
  
  console.log('\n🎯 修复内容总结:');
  console.log('   ✅ 修复Mermaid流程图语法错误');
  console.log('   ✅ 代码块改为灰色背景、黑色边框和字体');
  console.log('   ✅ 增强错误处理和兼容性');

}).catch(error => {
  console.error('❌ 测试失败:', error);
}); 