#!/usr/bin/env node

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8888/.netlify/functions/aibase-quick-category-crawler';

// 34个分类ID列表
const CATEGORY_IDS = [
  // 图像处理 (9个)
  '37-49', '37-50', '37-51', '37-52', '37-53', '37-54', '37-55', '37-83', '37-86',
  // 视频创作 (4个)
  '38-56', '38-57', '38-58', '38-84',
  // 效率助手 (5个)
  '39-59', '39-60', '39-61', '39-62', '39-63',
  // 写作灵感 (2个)
  '40-64', '40-88',
  // 艺术灵感 (3个)
  '41-65', '41-66', '41-67',
  // 趣味 (3个)
  '42-68', '42-71', '42-72',
  // 开发编程 (3个)
  '43-73', '43-74', '43-75',
  // 聊天机器人 (2个)
  '44-76', '44-77',
  // 翻译 (1个)
  '46-79',
  // 教育学习 (1个)
  '47-80',
  // 智能营销 (1个)
  '48-81'
];

// 分类名称映射
const CATEGORY_NAMES = {
  '37-49': '图片背景移除', '37-50': '图片无损放大', '37-51': '图片AI修复', 
  '37-52': '图像生成', '37-53': 'Ai图片拓展', '37-54': 'Ai漫画生成',
  '37-55': 'Ai生成写真', '37-83': '电商图片制作', '37-86': 'Ai图像转视频',
  '38-56': '视频剪辑', '38-57': '生成视频', '38-58': 'Ai动画制作', '38-84': '字幕生成',
  '39-59': 'AI文档工具', '39-60': 'PPT', '39-61': '思维导图', 
  '39-62': '表格处理', '39-63': 'Ai办公助手',
  '40-64': '文案写作', '40-88': '论文写作',
  '41-65': '语音克隆', '41-66': '设计创作', '41-67': 'Ai图标生成',
  '42-68': 'Ai名字生成器', '42-71': '游戏娱乐', '42-72': '其他',
  '43-73': '开发编程', '43-74': 'Ai开放平台', '43-75': 'Ai算力平台',
  '44-76': '智能聊天', '44-77': '智能客服',
  '46-79': '翻译',
  '47-80': '教育学习',
  '48-81': '智能营销'
};

async function crawlCategory(categoryId, maxProducts = 15) {
  try {
    console.log(`🔍 开始采集分类: ${CATEGORY_NAMES[categoryId]} (${categoryId})`);
    
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        categoryId,
        maxProducts
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ 分类 ${result.category} 采集完成:`);
      console.log(`   📊 找到产品: ${result.totalFound}`);
      console.log(`   💾 保存产品: ${result.totalSaved}`);
      
      if (result.products && result.products.length > 0) {
        console.log(`   📝 产品样例:`);
        result.products.slice(0, 3).forEach((product, index) => {
          console.log(`      ${index + 1}. ${product.name.substring(0, 50)}...`);
        });
        if (result.products.length > 3) {
          console.log(`      ... 还有 ${result.products.length - 3} 个产品`);
        }
      }
      
      return {
        success: true,
        categoryId,
        category: result.category,
        totalFound: result.totalFound,
        totalSaved: result.totalSaved,
        products: result.products || []
      };
    } else {
      console.log(`❌ 分类 ${categoryId} 采集失败: ${result.error}`);
      return {
        success: false,
        categoryId,
        error: result.error,
        products: []
      };
    }
  } catch (error) {
    console.log(`❌ 分类 ${categoryId} 采集异常: ${error.message}`);
    return {
      success: false,
      categoryId,
      error: error.message,
      products: []
    };
  }
}

async function runFullCrawl() {
  console.log('🚀 开始AIbase全面数据抓取...');
  console.log(`📊 预计采集 ${CATEGORY_IDS.length} 个分类，每个分类最多15个产品`);
  console.log(`🎯 目标：获取全部开发需求实现的AIbase数据`);
  
  const results = [];
  let totalFound = 0;
  let totalSaved = 0;
  let successCount = 0;
  let failCount = 0;
  const allProducts = [];
  
  // 分阶段处理，避免超时
  const batchSize = 5; // 每批处理5个分类
  const batches = [];
  
  for (let i = 0; i < CATEGORY_IDS.length; i += batchSize) {
    batches.push(CATEGORY_IDS.slice(i, i + batchSize));
  }
  
  console.log(`📦 分为 ${batches.length} 批次处理，每批 ${batchSize} 个分类`);
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`\n🔄 处理第 ${batchIndex + 1}/${batches.length} 批次...`);
    
    for (let i = 0; i < batch.length; i++) {
      const categoryId = batch[i];
      const globalIndex = batchIndex * batchSize + i + 1;
      
      console.log(`\n📂 [${globalIndex}/${CATEGORY_IDS.length}] 处理分类: ${categoryId}`);
      
      const result = await crawlCategory(categoryId, 15); // 每个分类最多15个产品
      results.push(result);
      
      if (result.success) {
        successCount++;
        totalFound += result.totalFound || 0;
        totalSaved += result.totalSaved || 0;
        allProducts.push(...result.products);
      } else {
        failCount++;
      }
      
      // 分类间延迟，避免请求过快
      if (i < batch.length - 1) {
        console.log('⏳ 等待 1.5 秒...');
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    
    // 批次间延迟
    if (batchIndex < batches.length - 1) {
      console.log(`\n🔄 第 ${batchIndex + 1} 批次完成，等待 3 秒后继续...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // 输出最终统计
  console.log('\n🎉 AIbase全面数据抓取完成!');
  console.log('📊 最终统计:');
  console.log(`   ✅ 成功分类: ${successCount}/${CATEGORY_IDS.length}`);
  console.log(`   ❌ 失败分类: ${failCount}/${CATEGORY_IDS.length}`);
  console.log(`   📊 总计发现产品: ${totalFound}`);
  console.log(`   💾 总计保存产品: ${totalSaved}`);
  console.log(`   📈 成功率: ${((successCount / CATEGORY_IDS.length) * 100).toFixed(1)}%`);
  console.log(`   🗂️ 产品数据库大小: ${allProducts.length} 个产品`);
  
  // 分类统计
  console.log('\n📈 分类产品分布:');
  const categoryStats = {};
  results.forEach(result => {
    if (result.success) {
      const primaryCategory = getPrimaryCategoryFromId(result.categoryId);
      categoryStats[primaryCategory] = (categoryStats[primaryCategory] || 0) + (result.totalSaved || 0);
    }
  });
  
  Object.entries(categoryStats).forEach(([category, count]) => {
    console.log(`   ${category}: ${count} 个产品`);
  });
  
  // 输出失败的分类
  const failedCategories = results.filter(r => !r.success);
  if (failedCategories.length > 0) {
    console.log('\n❌ 失败的分类:');
    failedCategories.forEach(result => {
      console.log(`   ${CATEGORY_NAMES[result.categoryId]} (${result.categoryId}): ${result.error}`);
    });
  }
  
  // 输出热门分类
  const topCategories = results
    .filter(r => r.success)
    .sort((a, b) => (b.totalSaved || 0) - (a.totalSaved || 0))
    .slice(0, 10);
    
  if (topCategories.length > 0) {
    console.log('\n🔥 产品数量最多的分类 (Top 10):');
    topCategories.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.category}: ${result.totalSaved} 个产品`);
    });
  }
  
  // 数据质量报告
  console.log('\n📋 数据质量报告:');
  console.log(`   🎯 开发需求覆盖度: ${successCount >= 30 ? '优秀' : successCount >= 25 ? '良好' : '需改进'}`);
  console.log(`   📊 数据丰富度: ${totalSaved >= 400 ? '丰富' : totalSaved >= 200 ? '适中' : '偏少'}`);
  console.log(`   🔄 采集稳定性: ${((successCount / CATEGORY_IDS.length) * 100).toFixed(1)}%`);
  
  return {
    totalCategories: CATEGORY_IDS.length,
    successCount,
    failCount,
    totalFound,
    totalSaved,
    allProducts,
    results
  };
}

// 根据分类ID获取一级分类
function getPrimaryCategoryFromId(categoryId) {
  const primaryId = categoryId.split('-')[0];
  const categoryMap = {
    '37': '图像处理',
    '38': '视频创作', 
    '39': '效率助手',
    '40': '写作灵感',
    '41': '艺术灵感',
    '42': '趣味',
    '43': '开发编程',
    '44': '聊天机器人',
    '46': '翻译',
    '47': '教育学习',
    '48': '智能营销'
  };
  
  return categoryMap[primaryId] || '未知分类';
}

// 运行采集
console.log('🎯 启动AIbase全面数据抓取系统...');
console.log('📋 任务目标：获取全部开发需求实现的AIbase数据');

runFullCrawl().then(summary => {
  console.log('\n🏆 数据抓取任务完成！');
  console.log(`📊 最终数据库包含 ${summary.totalSaved} 个AI工具产品`);
  console.log(`🎯 覆盖 ${summary.successCount} 个AI工具分类`);
  console.log('✅ 开发需求数据准备就绪！');
}).catch(error => {
  console.error('❌ 数据抓取失败:', error);
  process.exit(1);
}); 