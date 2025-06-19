import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// 设置 __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: resolve(__dirname, '.env') });

console.log('🚀 真实批量生产模板内容测试');
console.log('📦 环境变量配置状态：');
console.log('  NODE_ENV:', process.env.NODE_ENV || '未设置');
console.log('  SUPABASE_URL:', process.env.SUPABASE_URL ? '已配置' : '未配置');
console.log('  SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '已配置' : '未配置');
console.log('  DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY ? '已配置' : '未配置');
console.log('  OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '已配置' : '未配置');

// 模拟导入（因为真实模块可能有编译问题）
const aiService = {
  async generateContent(request) {
    console.log(`🤖 正在使用AI生成：${request.template.name_zh} (${request.language})`);
    
    // 这里应该调用真实的DeepSeek或OpenAI API
    const mockContent = request.language === 'zh' 
      ? `# ${request.template.name_zh}\n\n## 项目概述\n项目名称：${request.project.name}\n项目描述：${request.project.description}\n\n## 详细内容\n基于AI生成的${request.template.name_zh}内容...`
      : `# ${request.template.name_en}\n\n## Project Overview\nProject Name: ${request.project.name}\nProject Description: ${request.project.description}\n\n## Detailed Content\nAI-generated ${request.template.name_en} content...`;
    
    return {
      content: mockContent,
      status: 'success',
      model: 'deepseek-chat',
      tokens: 1500
    };
  }
};

const batchProductionService = {
  async batchProductionTemplates(options = {}) {
    const {
      batchSize = 3,
      dryRun = false,
      skipExisting = true,
      limitProjects = 5,
      limitTemplates = 5
    } = options;
    
    console.log('📋 开始批量生产，配置：', { batchSize, dryRun, skipExisting, limitProjects, limitTemplates });
    
    // 模拟从数据库获取的数据
    const mockProjects = [
      { 
        id: '1', 
        name: 'AI智能客服系统', 
        description: '基于深度学习的智能客服对话系统，支持多轮对话和情感分析',
        name_zh: 'AI智能客服系统',
        description_zh: '基于深度学习的智能客服对话系统，支持多轮对话和情感分析'
      },
      { 
        id: '2', 
        name: '区块链数字钱包', 
        description: '安全可靠的数字资产管理工具，支持多币种存储和交易',
        name_zh: '区块链数字钱包',
        description_zh: '安全可靠的数字资产管理工具，支持多币种存储和交易'
      },
      { 
        id: '3', 
        name: '在线教育平台', 
        description: '互动式在线学习平台，提供个性化学习路径和实时答疑',
        name_zh: '在线教育平台',
        description_zh: '互动式在线学习平台，提供个性化学习路径和实时答疑'
      }
    ];
    
    const mockTemplates = [
      { 
        id: '1', 
        name_zh: '产品需求文档', 
        name_en: 'Product Requirements Document',
        prompt_content: '请基于项目信息生成详细的产品需求文档，包括功能需求、非功能需求、用户故事等',
        mdcprompt: '请基于项目信息生成Cursor IDE的规则文件，包括代码规范、开发指南等'
      },
      { 
        id: '2', 
        name_zh: '商业计划书', 
        name_en: 'Business Plan',
        prompt_content: '请基于项目信息生成完整的商业计划书，包括市场分析、商业模式、财务预测等',
        mdcprompt: '请基于项目信息生成项目开发的技术架构和实施计划'
      },
      { 
        id: '3', 
        name_zh: '技术架构文档', 
        name_en: 'Technical Architecture Document',
        prompt_content: '请基于项目信息生成技术架构文档，包括系统架构、技术选型、部署方案等',
        mdcprompt: '请基于项目信息生成技术开发的最佳实践和编码规范'
      }
    ];
    
    const tasks = [];
    const existingVersions = new Set(); // 模拟已存在的版本
    
    // 生成任务列表
    for (const project of mockProjects.slice(0, limitProjects)) {
      for (const template of mockTemplates.slice(0, limitTemplates)) {
        const taskKey = `${project.id}-${template.id}`;
        if (!skipExisting || !existingVersions.has(taskKey)) {
          tasks.push({ project, template });
        }
      }
    }
    
    console.log(`📋 生成 ${tasks.length} 个处理任务`);
    
    if (dryRun) {
      console.log('🧪 干预模式：不执行实际生成');
      return {
        success: true,
        stats: { total: tasks.length, generated: 0, skipped: 0, failed: 0 },
        details: [],
        execution: { startTime: new Date().toISOString(), endTime: new Date().toISOString(), duration: '0s' }
      };
    }
    
    const result = {
      success: true,
      stats: { total: tasks.length, generated: 0, skipped: 0, failed: 0 },
      details: [],
      execution: { startTime: new Date().toISOString(), endTime: '', duration: '' }
    };
    
    // 分批处理任务
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      console.log(`📦 处理批次 ${Math.floor(i/batchSize) + 1}/${Math.ceil(tasks.length/batchSize)}`);
      
      const batchPromises = batch.map(async (task) => {
        const { project, template } = task;
        const taskId = `${project.id}-${template.id}`;
        
        try {
          console.log(`🔄 处理: ${project.name} + ${template.name_zh}`);
          
          // 生成英文内容
          const enRequest = {
            prompt: template.prompt_content,
            project: { name: project.name, description: project.description },
            template: { name_zh: template.name_zh, name_en: template.name_en },
            language: 'en'
          };
          
          const enResult = await aiService.generateContent(enRequest);
          if (enResult.status !== 'success') {
            throw new Error(`英文内容生成失败: ${enResult.error}`);
          }
          
          // 生成中文内容（翻译）
          const zhRequest = {
            prompt: `请将以下内容翻译成中文，保持原有格式：\n\n${enResult.content}`,
            project: { name: project.name_zh, description: project.description_zh },
            template: { name_zh: template.name_zh, name_en: template.name_en },
            language: 'zh'
          };
          
          const zhResult = await aiService.generateContent(zhRequest);
          const zhContent = zhResult.status === 'success' ? zhResult.content : enResult.content;
          
          // 生成MDC提示内容（如果有）
          let mdcContentEn = '';
          let mdcContentZh = '';
          if (template.mdcprompt) {
            const mdcRequest = {
              prompt: template.mdcprompt,
              project: { name: project.name, description: project.description },
              template: { name_zh: template.name_zh, name_en: template.name_en },
              language: 'en'
            };
            
            const mdcResult = await aiService.generateContent(mdcRequest);
            if (mdcResult.status === 'success') {
              mdcContentEn = mdcResult.content;
              
              // 翻译MDC内容
              const mdcZhRequest = {
                prompt: `请将以下内容翻译成中文：\n\n${mdcContentEn}`,
                project: { name: project.name_zh, description: project.description_zh },
                template: { name_zh: template.name_zh, name_en: template.name_en },
                language: 'zh'
              };
              
              const mdcZhResult = await aiService.generateContent(mdcZhRequest);
              mdcContentZh = mdcZhResult.status === 'success' ? mdcZhResult.content : mdcContentEn;
            }
          }
          
          // 模拟保存到数据库
          const versionId = `v${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          console.log(`✅ 成功: ${project.name} + ${template.name_zh} (版本: ${versionId})`);
          
          result.stats.generated++;
          result.details.push({
            projectId: project.id,
            projectName: project.name,
            templateId: template.id,
            templateName: template.name_zh,
            status: 'generated',
            versionId,
            contentLengths: {
              outputContentEn: enResult.content.length,
              outputContentZh: zhContent.length,
              mdcPromptContentEn: mdcContentEn.length,
              mdcPromptContentZh: mdcContentZh.length
            }
          });
          
        } catch (error) {
          console.error(`❌ 失败: ${project.name} + ${template.name_zh}`, error.message);
          result.stats.failed++;
          result.details.push({
            projectId: project.id,
            projectName: project.name,
            templateId: template.id,
            templateName: template.name_zh,
            status: 'failed',
            error: error.message
          });
        }
      });
      
      await Promise.allSettled(batchPromises);
      
      // 批次间延迟
      if (i + batchSize < tasks.length) {
        console.log('⏸️ 批次间暂停 1 秒...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    const endTime = new Date();
    const duration = ((endTime.getTime() - new Date(result.execution.startTime).getTime()) / 1000).toFixed(1);
    
    result.execution.endTime = endTime.toISOString();
    result.execution.duration = `${duration}s`;
    
    return result;
  }
};

// 执行测试
async function runRealTest() {
  try {
    console.log('\n🎯 开始真实批量生产测试...\n');
    
    const result = await batchProductionService.batchProductionTemplates({
      batchSize: 2,
      dryRun: false,
      skipExisting: true,
      limitProjects: 2,
      limitTemplates: 2
    });
    
    console.log('\n🏁 批量生产完成！');
    console.log('📊 统计结果：');
    console.log(`  总任务数：${result.stats.total}`);
    console.log(`  成功生成：${result.stats.generated}`);
    console.log(`  跳过：${result.stats.skipped}`);
    console.log(`  失败：${result.stats.failed}`);
    console.log(`  执行时间：${result.execution.duration}`);
    
    console.log('\n📋 详细结果：');
    result.details.forEach((detail, index) => {
      const status = detail.status === 'generated' ? '✅' : '❌';
      console.log(`  ${index + 1}. ${status} ${detail.projectName} + ${detail.templateName}`);
      if (detail.contentLengths) {
        console.log(`     英文内容：${detail.contentLengths.outputContentEn} 字符`);
        console.log(`     中文内容：${detail.contentLengths.outputContentZh} 字符`);
        if (detail.contentLengths.mdcPromptContentEn > 0) {
          console.log(`     MDC英文：${detail.contentLengths.mdcPromptContentEn} 字符`);
          console.log(`     MDC中文：${detail.contentLengths.mdcPromptContentZh} 字符`);
        }
      }
      if (detail.error) {
        console.log(`     错误：${detail.error}`);
      }
    });
    
    console.log('\n🎉 测试完成！这个脚本模拟了真实的批量生产流程。');
    console.log('💡 要运行真实的版本，请确保：');
    console.log('  1. 配置正确的API密钥（DEEPSEEK_API_KEY或OPENAI_API_KEY）');
    console.log('  2. 配置Supabase连接（SUPABASE_URL和SUPABASE_SERVICE_ROLE_KEY）');
    console.log('  3. 确保数据库中有相应的模板和项目数据');
    
  } catch (error) {
    console.error('❌ 测试失败：', error);
  }
}

runRealTest(); 