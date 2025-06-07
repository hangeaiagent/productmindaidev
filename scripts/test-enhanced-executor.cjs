#!/usr/bin/env node

/**
 * 测试增强的生产环境执行器
 * 验证单语言模式和详细错误处理
 */

const { runEnhancedProductionBatch } = require('./enhanced-production-executor.cjs');

async function testEnhancedExecutor() {
  console.log('🧪 开始测试增强的生产环境执行器...\n');
  
  try {
    // 测试单语言模式（中文）
    console.log('=== 测试1: 单语言模式（中文）===');
    await runEnhancedProductionBatch({
      languages: 'zh',
      limit: 2,
      start_offset: 0,
      template_offset: 0
    });
    
    console.log('\n等待5秒后进行下一个测试...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 测试单语言模式（英文）
    console.log('=== 测试2: 单语言模式（英文）===');
    await runEnhancedProductionBatch({
      languages: 'en',
      limit: 2,
      start_offset: 0,
      template_offset: 0
    });
    
    console.log('\n✅ 所有测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testEnhancedExecutor();
} 