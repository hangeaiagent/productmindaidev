const API_BASE = 'http://localhost:8888';

async function testAPI(url, description) {
  try {
    console.log(`\n🧪 测试: ${description}`);
    console.log(`📡 请求: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ 成功: ${data.message}`);
      if (data.categories) {
        console.log(`📊 分类数量: ${data.categories.length}`);
      }
      if (data.projects) {
        console.log(`📊 项目数量: ${data.projects.length}`);
        if (data.projects.length > 0) {
          console.log(`📋 示例项目: ${data.projects[0].name}`);
        }
      }
      return data;
    } else {
      console.log(`❌ 失败: ${data.error}`);
      return null;
    }
  } catch (error) {
    console.log(`💥 错误: ${error.message}`);
    return null;
  }
}

async function testNavigationSystem() {
  console.log('🚀 开始测试AI产品管理导航系统\n');
  
  // 1. 测试分类API
  const categories = await testAPI(
    `${API_BASE}/.netlify/functions/get-categories`,
    '获取所有分类数据'
  );
  
  // 2. 测试全部项目API
  const allProjects = await testAPI(
    `${API_BASE}/.netlify/functions/get-projects-by-category?limit=5`,
    '获取全部项目（前5个）'
  );
  
  // 3. 测试分类筛选API
  const categoryProjects = await testAPI(
    `${API_BASE}/.netlify/functions/get-projects-by-category?category=1010&limit=3`,
    '图片背景移除分类项目'
  );
  
  // 4. 测试搜索功能
  const searchResults = await testAPI(
    `${API_BASE}/.netlify/functions/get-projects-by-category?search=堆友&limit=3`,
    '搜索"堆友"相关项目'
  );
  
  // 5. 生成导航系统演示数据
  if (categories && allProjects) {
    console.log('\n📈 系统统计信息:');
    console.log(`- 一级分类: ${categories.statistics?.primaryCategories || 0} 个`);
    console.log(`- 二级分类: ${categories.statistics?.secondaryCategories || 0} 个`);
    console.log(`- 总项目数: ${categories.statistics?.totalProjects || 0} 个`);
    
    console.log('\n🎯 主要分类分布:');
    categories.categories
      ?.filter(cat => cat.category_level === 1)
      ?.slice(0, 5)
      ?.forEach(cat => {
        console.log(`- ${cat.category_name}: ${cat.project_count || 0} 个项目`);
      });
    
    console.log('\n🔗 导航路径示例:');
    console.log('- 首页: /');
    console.log('- AI产品参考: /ai-products');
    console.log('- 图像处理分类: /ai-products/10');
    console.log('- 图片背景移除: /ai-products/1010');
    
    if (allProjects.projects && allProjects.projects.length > 0) {
      const firstProject = allProjects.projects[0];
      console.log(`- 产品详情页: /products/${firstProject.id}`);
    }
  }
  
  console.log('\n🎉 导航系统测试完成！');
}

// 运行测试
testNavigationSystem().catch(console.error); 