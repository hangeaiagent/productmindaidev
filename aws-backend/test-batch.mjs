import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// 设置 __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: resolve(__dirname, '.env') });

console.log('🚀 批量生产模板内容测试脚本');
console.log('📦 环境变量配置状态：');
console.log('  NODE_ENV:', process.env.NODE_ENV || '未设置');
console.log('  SUPABASE_URL:', process.env.SUPABASE_URL ? '已配置' : '未配置');
console.log('  DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY ? '已配置' : '未配置');
console.log('  OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '已配置' : '未配置');

// 模拟aiService和batchProductionService的功能
const mockAiService = {
  async generateContent(request) {
    console.log('🤖 模拟AI生成内容：', request.template.name_zh);
    return {
      content: `这是为项目"${request.project.name}"生成的${request.template.name_zh}内容示例。`,
      status: 'success',
      model: 'mock-ai',
      tokens: 1000
    };
  }
};

const mockBatchProductionService = {
  async batchProductionTemplates(options = {}) {
    console.log('📋 开始批量生产模板内容，选项：', options);
    
    const mockProjects = [
      { id: '1', name: 'AI智能助手', description: '基于深度学习的智能对话系统' },
      { id: '2', name: '区块链钱包', description: '安全的数字资产管理工具' }
    ];
    
    const mockTemplates = [
      { id: '1', name_zh: '产品需求文档', name_en: 'PRD', prompt_content: '生成产品需求文档' },
      { id: '2', name_zh: '商业计划书', name_en: 'Business Plan', prompt_content: '生成商业计划书' }
    ];
    
    let generated = 0;
    const details = [];
    
    for (const project of mockProjects) {
      for (const template of mockTemplates) {
        console.log(`🔄 处理: ${project.name} + ${template.name_zh}`);
        
        // 模拟AI生成
        const result = await mockAiService.generateContent({
          prompt: template.prompt_content,
          project: { name: project.name, description: project.description },
          template: { name_zh: template.name_zh, name_en: template.name_en },
          language: 'zh'
        });
        
        if (result.status === 'success') {
          generated++;
          details.push({
            projectId: project.id,
            projectName: project.name,
            templateId: template.id,
            templateName: template.name_zh,
            status: 'generated',
            versionId: `v${Date.now()}`,
            contentLengths: {
              outputContentEn: result.content.length,
              outputContentZh: result.content.length
            }
          });
          console.log(`✅ 成功: ${project.name} + ${template.name_zh}`);
        }
        
        // 模拟延迟
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return {
      success: true,
      stats: {
        total: mockProjects.length * mockTemplates.length,
        generated,
        skipped: 0,
        failed: 0
      },
      details,
      execution: {
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        duration: '2.5s'
      }
    };
  }
};

// 执行测试
async function runTest() {
  try {
    console.log('\n🎯 开始批量生产测试...\n');
    
    const result = await mockBatchProductionService.batchProductionTemplates({
      batchSize: 2,
      dryRun: false,
      skipExisting: true,
      limitProjects: 2,
      limitTemplates: 2
    });
    
    console.log('\n🏁 批量生产完成！');
    console.log('📊 统计结果：');
    console.log('  总任务数：', result.stats.total);
    console.log('  成功生成：', result.stats.generated);
    console.log('  跳过：', result.stats.skipped);
    console.log('  失败：', result.stats.failed);
    console.log('  执行时间：', result.execution.duration);
    
    console.log('\n📋 详细结果：');
    result.details.forEach((detail, index) => {
      console.log(`  ${index + 1}. ${detail.projectName} + ${detail.templateName}: ${detail.status}`);
    });
    
  } catch (error) {
    console.error('❌ 测试失败：', error);
  }
}

runTest(); 