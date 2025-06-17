import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const NETLIFY_SITE_URL = process.env.NETLIFY_SITE_URL || 'https://productmindai.netlify.app';
const FUNCTION_URL = `${NETLIFY_SITE_URL}/.netlify/functions/translate-category-names`;

async function runTranslation() {
  console.log('🚀 开始执行分类名称翻译任务...');
  console.log(`🔗 调用函数: ${FUNCTION_URL}\n`);

  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API调用失败:', response.status, response.statusText);
      console.error('错误详情:', errorText);
      return;
    }

    const result = await response.json();

    if (result.success) {
      console.log('✅ 翻译任务执行成功!\n');
      
      console.log('📊 执行结果统计:');
      console.log('=====================================');
      console.log(`总记录数: ${result.results.total}`);
      console.log(`成功翻译: ${result.results.translated}`);
      console.log(`跳过处理: ${result.results.skipped}`);
      console.log(`失败记录: ${result.results.failed}`);

      if (result.results.details && result.results.details.length > 0) {
        console.log('\n📝 详细结果:');
        console.log('=====================================');

        // 显示成功的翻译
        const successResults = result.results.details.filter(d => d.status === 'success');
        if (successResults.length > 0) {
          console.log('\n✅ 成功翻译的记录:');
          successResults.forEach((detail, index) => {
            console.log(`${index + 1}. ${detail.category_name} -> ${detail.category_name_en}`);
          });
        }

        // 显示跳过的记录
        const skippedResults = result.results.details.filter(d => d.status === 'skipped');
        if (skippedResults.length > 0) {
          console.log('\n⏭️ 跳过的记录:');
          skippedResults.forEach((detail, index) => {
            console.log(`${index + 1}. ${detail.category_name} (原因: ${detail.reason})`);
          });
        }

        // 显示失败的记录
        const failedResults = result.results.details.filter(d => d.status === 'failed');
        if (failedResults.length > 0) {
          console.log('\n❌ 失败的记录:');
          failedResults.forEach((detail, index) => {
            console.log(`${index + 1}. ${detail.category_name} (原因: ${detail.reason})`);
          });
        }
      }

    } else {
      console.error('❌ 翻译任务执行失败:', result.error);
      console.error('错误信息:', result.message);
    }

  } catch (error) {
    console.error('❌ 执行翻译任务时发生错误:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 请确保Netlify函数已部署并可访问');
    } else if (error.code === 'ENOTFOUND') {
      console.error('💡 请检查Netlify站点URL是否正确');
    }
  }
}

// 主函数
async function main() {
  console.log('🔧 环境配置:');
  console.log(`Netlify站点URL: ${NETLIFY_SITE_URL}`);
  console.log(`函数URL: ${FUNCTION_URL}\n`);

  await runTranslation();
}

main().catch(console.error); 