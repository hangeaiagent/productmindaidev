#!/usr/bin/env node

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL = 'http://localhost:8888';

async function testSEOPages() {
  console.log('🚀 开始测试中英双语SEO页面系统...\n');
  
  const tests = [
    {
      name: '测试中文页面生成',
      url: `${BASE_URL}/.netlify/functions/generate-seo-pages?limit=3&lang=zh`,
      expectedContent: ['中文', 'AI产品管理文档', '专业模板']
    },
    {
      name: '测试英文页面生成',
      url: `${BASE_URL}/.netlify/functions/generate-seo-pages?limit=3&lang=en`,
      expectedContent: ['English', 'AI Product Management', 'Professional Templates']
    },
    {
      name: '测试站点地图生成',
      url: `${BASE_URL}/sitemap.xml`,
      expectedContent: ['<?xml', 'urlset', 'products']
    },
    {
      name: '测试robots.txt',
      url: `${BASE_URL}/robots.txt`,
      expectedContent: ['User-agent', 'Sitemap', 'Allow']
    }
  ];
  
  for (const test of tests) {
    try {
      console.log(`📋 ${test.name}...`);
      
      const response = await fetch(test.url);
      const content = await response.text();
      
      if (response.ok) {
        const allContentFound = test.expectedContent.every(expected => 
          content.includes(expected)
        );
        
        if (allContentFound) {
          console.log(`✅ ${test.name} - 成功`);
        } else {
          console.log(`⚠️  ${test.name} - 内容检查失败`);
          console.log(`   期望内容: ${test.expectedContent.join(', ')}`);
        }
      } else {
        console.log(`❌ ${test.name} - HTTP ${response.status}`);
        console.log(`   错误: ${content.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log(`❌ ${test.name} - 请求失败`);
      console.log(`   错误: ${error.message}`);
    }
    
    console.log('');
  }
  
  // 测试具体产品页面
  console.log('📋 测试具体产品页面...');
  
  try {
    // 先获取一个项目ID
    const projectsResponse = await fetch(`${BASE_URL}/.netlify/functions/generate-seo-pages?limit=1&lang=zh`);
    const projectsData = await projectsResponse.json();
    
    if (projectsData.pages && projectsData.pages.length > 0) {
      const projectId = projectsData.pages[0].id;
      
      // 测试中文产品页面
      const zhPageResponse = await fetch(`${BASE_URL}/products/${projectId}`);
      if (zhPageResponse.ok) {
        const zhPageContent = await zhPageResponse.text();
        if (zhPageContent.includes('<!DOCTYPE html') && zhPageContent.includes('产品概述')) {
          console.log(`✅ 中文产品页面 (ID: ${projectId}) - 成功`);
        } else {
          console.log(`⚠️  中文产品页面 (ID: ${projectId}) - 内容不完整`);
        }
      } else {
        console.log(`❌ 中文产品页面 (ID: ${projectId}) - HTTP ${zhPageResponse.status}`);
      }
      
      // 测试英文产品页面
      const enPageResponse = await fetch(`${BASE_URL}/en/products/${projectId}`);
      if (enPageResponse.ok) {
        const enPageContent = await enPageResponse.text();
        if (enPageContent.includes('<!DOCTYPE html') && enPageContent.includes('Product Overview')) {
          console.log(`✅ 英文产品页面 (ID: ${projectId}) - 成功`);
        } else {
          console.log(`⚠️  英文产品页面 (ID: ${projectId}) - 内容不完整`);
        }
      } else {
        console.log(`❌ 英文产品页面 (ID: ${projectId}) - HTTP ${enPageResponse.status}`);
      }
    } else {
      console.log('⚠️  没有找到可测试的项目');
    }
  } catch (error) {
    console.log(`❌ 产品页面测试失败: ${error.message}`);
  }
  
  console.log('\n🎉 测试完成！');
  console.log('\n📊 访问地址：');
  console.log(`   中文首页: ${BASE_URL}/`);
  console.log(`   英文首页: ${BASE_URL}/en/`);
  console.log(`   站点地图: ${BASE_URL}/sitemap.xml`);
  console.log(`   Robots: ${BASE_URL}/robots.txt`);
  console.log(`   API文档: ${BASE_URL}/.netlify/functions/generate-seo-pages`);
}

// 添加延迟函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServer() {
  console.log('⏳ 等待服务器启动...');
  
  for (let i = 0; i < 30; i++) {
    try {
      const response = await fetch(`${BASE_URL}/.netlify/functions/generate-seo-pages?limit=1`);
      if (response.ok || response.status === 500) {
        console.log('✅ 服务器已就绪\n');
        return true;
      }
    } catch (error) {
      // 继续等待
    }
    
    await delay(2000);
    process.stdout.write('.');
  }
  
  console.log('\n❌ 服务器启动超时');
  return false;
}

async function main() {
  const serverReady = await waitForServer();
  if (serverReady) {
    await testSEOPages();
  } else {
    console.log('请确保 Netlify Dev 服务器正在运行：');
    console.log('npx netlify dev --port 8888');
  }
}

main().catch(console.error); 