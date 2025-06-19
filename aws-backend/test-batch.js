import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// 设置 __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: resolve(__dirname, '.env') });

console.log('🚀 批量生产模板内容测试脚本');
console.log('📦 环境变量配置：');
console.log('  SUPABASE_URL:', process.env.SUPABASE_URL ? '已配置' : '未配置');
console.log('  DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY ? '已配置' : '未配置');
console.log('  OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '已配置' : '未配置');

// 模拟批量生产结果
const mockBatchResult = {
  success: true,
  stats: {
    total: 10,
    generated: 8,
    skipped: 1,
    failed: 1
  },
  details: [
    {
      projectId: '1',
      projectName: 'AI智能助手',
      templateId: '1',
      templateName: '产品需求文档',
      status: 'generated',
      versionId: 'v1',
      contentLengths: {
        outputContentEn: 1500,
        outputContentZh: 1800
      }
    },
    {
      projectId: '2',
      projectName: '区块链钱包',
      templateId: '1', 
      templateName: '产品需求文档',
      status: 'skipped',
      error: '已存在版本'
    }
  ],
  execution: {
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    duration: '5.2s'
  }
};

console.log('📋 模拟批量生产结果：');
console.log(JSON.stringify(mockBatchResult, null, 2));

export default mockBatchResult; 