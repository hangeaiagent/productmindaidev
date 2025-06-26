const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from aws-backend/.env file (按照项目标准)
dotenv.config({ path: path.resolve(__dirname, '../../../aws-backend/.env') });

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { generateProjectPage } = require('./generate-seo-pages.cjs');

// Supabase配置 - 从环境变量获取
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// 验证必需的环境变量
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 错误: 缺少必需的环境变量');
  console.error('请设置以下环境变量:');
  console.error('- VITE_SUPABASE_URL');
  console.error('- VITE_SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n请检查环境变量文件: aws-backend/.env');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// 配置
const OUTPUT_DIR = './static-pages';
const MAX_CONCURRENT = 3; // 并发处理数量

/**
 * 获取所有符合条件的项目（支持分页循环查询）
 */
async function getEligibleProjects() {
  try {
    console.log('🔍 查询符合条件的项目（支持分页循环）...');
    
    let allProjects = [];
    let currentPage = 0;
    const pageSize = 1000; // 每页1000条记录
    
    while (true) {
      console.log(`📄 正在查询第 ${currentPage + 1} 页数据 (每页${pageSize}条)...`);
      
      const { data: projects, error } = await supabase
        .from('user_projects')
        .select('*')
        .not('primary_category', 'is', null)
        .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`查询项目失败: ${error.message}`);
      }

      // 如果没有数据了，退出循环
      if (!projects || projects.length === 0) {
        console.log(`✅ 第 ${currentPage + 1} 页无数据，查询完成`);
        break;
      }

      console.log(`📊 第 ${currentPage + 1} 页查询到 ${projects.length} 个项目`);
      allProjects = allProjects.concat(projects);

      // 如果返回的记录数少于pageSize，说明已经是最后一页
      if (projects.length < pageSize) {
        console.log(`✅ 已到达最后一页，查询完成`);
        break;
      }

      currentPage++;
    }

    console.log(`\n📊 分页查询完成统计:`);
    console.log(`  总页数: ${currentPage + 1} 页`);
    console.log(`  总项目数: ${allProjects.length} 个`);
    
    return allProjects;
  } catch (error) {
    console.error('❌ 获取项目列表失败:', error);
    return [];
  }
}

/**
 * 检查项目是否有模板内容
 * 注意：此函数不屏蔽cnhtmlpath为空的数据，只检查是否有output_content_zh内容
 */
async function hasTemplateContent(projectId) {
  try {
    const { data: templates, error } = await supabase
      .from('template_versions')
      .select('id')
      .eq('project_id', projectId)
      .not('output_content_zh', 'is', null)
      .limit(1);

    return !error && templates && templates.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * 并发处理项目生成
 */
async function processBatch(projects, startIndex, batchSize) {
  const batch = projects.slice(startIndex, startIndex + batchSize);
  const promises = batch.map(async (project) => {
    try {
      const hasContent = await hasTemplateContent(project.id);
      if (!hasContent) {
        return {
          projectId: project.id,
          name: project.name || project.name_zh || '未命名',
          status: 'skipped',
          reason: '无模板内容'
        };
      }

      const result = await generateProjectPage(project.id, false);
      return {
        projectId: project.id,
        name: result.project.name || result.project.name_zh || '未命名',
        status: 'success',
        templateCount: result.templates.length,
        filePath: result.filePath
      };
    } catch (error) {
      return {
        projectId: project.id,
        name: project.name || project.name_zh || '未命名',
        status: 'error',
        error: error.message
      };
    }
  });

  return Promise.all(promises);
}

/**
 * 生成统计报告
 */
function generateReport(results) {
  const summary = {
    total: results.length,
    success: results.filter(r => r.status === 'success').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    error: results.filter(r => r.status === 'error').length,
    totalTemplates: results.filter(r => r.status === 'success').reduce((sum, r) => sum + (r.templateCount || 0), 0)
  };

  return {
    summary,
    details: results
  };
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始批量生成SEO页面');
  console.log('版本: v2.0.0 | 新增: 分页循环查询 + 不屏蔽cnhtmlpath为空的数据\n');

  // 创建输出目录
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 创建输出目录: ${OUTPUT_DIR}`);
  }

  // 获取项目列表
  const projects = await getEligibleProjects();
  if (projects.length === 0) {
    console.log('❌ 未找到符合条件的项目');
    return;
  }

  console.log(`📊 找到 ${projects.length} 个项目\n`);

  // 批量处理
  const allResults = [];
  for (let i = 0; i < projects.length; i += MAX_CONCURRENT) {
    const batchNum = Math.floor(i / MAX_CONCURRENT) + 1;
    const totalBatches = Math.ceil(projects.length / MAX_CONCURRENT);
    
    console.log(`🔄 处理批次 ${batchNum}/${totalBatches} (项目 ${i + 1}-${Math.min(i + MAX_CONCURRENT, projects.length)})`);
    
    const batchResults = await processBatch(projects, i, MAX_CONCURRENT);
    allResults.push(...batchResults);
    
    // 显示批次结果
    batchResults.forEach(result => {
      const icon = result.status === 'success' ? '✅' : result.status === 'skipped' ? '⏭️' : '❌';
      const info = result.status === 'success' ? `(${result.templateCount}个模板)` :
                   result.status === 'skipped' ? `(${result.reason})` :
                   `(${result.error})`;
      console.log(`  ${icon} ${result.name} ${info}`);
    });
    
    console.log('');
  }

  // 生成报告
  const report = generateReport(allResults);
  
  console.log('📈 生成统计报告:');
  console.log(`  总项目数: ${report.summary.total}`);
  console.log(`  成功生成: ${report.summary.success}`);
  console.log(`  跳过项目: ${report.summary.skipped}`);
  console.log(`  失败项目: ${report.summary.error}`);
  console.log(`  总模板数: ${report.summary.totalTemplates}`);

  // 保存详细报告
  const reportPath = path.join(OUTPUT_DIR, 'generation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n📄 详细报告已保存: ${reportPath}`);

  // 显示访问地址
  if (report.summary.success > 0) {
    console.log('\n🎯 生成的页面可以通过以下方式访问:');
    console.log('  • 启动服务器: node serve-static.js');
    console.log('  • 访问地址: http://localhost:3030');
    console.log('  • 演示页面: http://localhost:3030/preview/08b129eb-d758-461e-b550-2ba224a91aef');
  }

  console.log('\n🎉 批量生成完成!');
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 批量生成失败:', error);
    process.exit(1);
  });
}

module.exports = {
  main,
  getEligibleProjects,
  processBatch
}; 