import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.TRANSLATION_SERVICE_PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// Supabase配置
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// AI翻译服务配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-567abb67b99d4a65acaa2d9ed06c3782';

/**
 * 使用DeepSeek AI翻译中文到英文
 */
async function translateToEnglish(chineseText) {
  try {
    console.log(`🔄 翻译中: ${chineseText}`);
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的中英文翻译专家。请将提供的中文文本翻译成准确、简洁的英文。只返回翻译结果，不要添加任何解释或其他内容。'
          },
          {
            role: 'user',
            content: `请将以下中文翻译成英文：${chineseText}`
          }
        ],
        max_tokens: 100,
        temperature: 0.3,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`翻译API调用失败: ${response.status}`);
    }

    const data = await response.json();
    const translatedText = data.choices[0]?.message?.content?.trim();
    
    if (!translatedText) {
      throw new Error('翻译结果为空');
    }

    console.log(`✅ 翻译完成: ${chineseText} -> ${translatedText}`);
    return translatedText;
  } catch (error) {
    console.error(`❌ 翻译失败 "${chineseText}":`, error.message);
    // 如果翻译失败，返回原文
    return chineseText;
  }
}

/**
 * 检查文本是否包含中文字符
 */
function containsChinese(text) {
  const chineseRegex = /[\u4e00-\u9fff]/;
  return chineseRegex.test(text);
}

/**
 * 批量翻译并更新分类名称
 */
async function translateAndUpdateCategories() {
  const startTime = Date.now();
  console.log('🚀 开始批量翻译任务...');

  try {
    // 查询所有category_name_en为空的记录
    const { data: categories, error: fetchError } = await supabase
      .from('user_projectscategory')
      .select('id, category_name, category_name_en, category_code, category_level')
      .or('category_name_en.is.null,category_name_en.eq.""')
      .order('category_level')
      .order('id');

    if (fetchError) {
      throw new Error(`查询分类数据失败: ${fetchError.message}`);
    }

    if (!categories || categories.length === 0) {
      return {
        success: true,
        message: '没有需要翻译的分类记录',
        results: {
          total: 0,
          translated: 0,
          failed: 0,
          skipped: 0,
          details: []
        }
      };
    }

    console.log(`📊 找到 ${categories.length} 个需要翻译的分类记录`);

    const results = {
      total: categories.length,
      translated: 0,
      failed: 0,
      skipped: 0,
      details: []
    };

    // 逐个处理翻译
    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      const { id, category_name } = category;
      
      console.log(`📝 处理进度: ${i + 1}/${categories.length} - ${category_name}`);

      try {
        // 检查是否包含中文
        if (!containsChinese(category_name)) {
          console.log(`⏭️ 跳过非中文分类: ${category_name}`);
          results.skipped++;
          results.details.push({
            id,
            category_name,
            category_name_en: category_name,
            status: 'skipped',
            reason: '不包含中文字符'
          });
          continue;
        }

        // 调用翻译服务
        const translatedName = await translateToEnglish(category_name);

        // 更新数据库
        const { error: updateError } = await supabase
          .from('user_projectscategory')
          .update({ category_name_en: translatedName })
          .eq('id', id);

        if (updateError) {
          console.error(`❌ 更新分类 ${id} 失败:`, updateError.message);
          results.failed++;
          results.details.push({
            id,
            category_name,
            category_name_en: '',
            status: 'failed',
            reason: updateError.message
          });
        } else {
          results.translated++;
          results.details.push({
            id,
            category_name,
            category_name_en: translatedName,
            status: 'success'
          });
        }

        // 添加延迟以避免API频率限制
        if (i < categories.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`❌ 处理分类 ${id} 时出错:`, error.message);
        results.failed++;
        results.details.push({
          id,
          category_name,
          category_name_en: '',
          status: 'failed',
          reason: error.message
        });
      }
    }

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log(`🎉 翻译任务完成！耗时: ${duration}秒`);
    console.log(`📊 统计: 总数 ${results.total}, 成功 ${results.translated}, 失败 ${results.failed}, 跳过 ${results.skipped}`);

    return {
      success: true,
      message: '分类名称翻译任务完成',
      duration: `${duration}秒`,
      results
    };

  } catch (error) {
    console.error('❌ 翻译任务执行失败:', error.message);
    return {
      success: false,
      error: '翻译服务执行失败',
      message: error.message
    };
  }
}

/**
 * 检查翻译状态
 */
async function checkTranslationStatus() {
  try {
    const { data: allCategories, error } = await supabase
      .from('user_projectscategory')
      .select('id, category_name, category_name_en, category_level')
      .order('category_level')
      .order('id');

    if (error) {
      throw new Error(`查询分类数据失败: ${error.message}`);
    }

    const stats = {
      total: allCategories?.length || 0,
      hasEnglish: 0,
      needsTranslation: 0,
      chinese: 0,
      nonChinese: 0
    };

    const needsTranslation = [];
    const chineseRegex = /[\u4e00-\u9fff]/;

    allCategories?.forEach(category => {
      if (chineseRegex.test(category.category_name)) {
        stats.chinese++;
      } else {
        stats.nonChinese++;
      }

      if (category.category_name_en && category.category_name_en.trim() !== '') {
        stats.hasEnglish++;
      } else {
        stats.needsTranslation++;
        needsTranslation.push({
          id: category.id,
          category_name: category.category_name,
          category_level: category.category_level,
          containsChinese: chineseRegex.test(category.category_name)
        });
      }
    });

    return {
      success: true,
      stats,
      needsTranslation: needsTranslation.slice(0, 20) // 只返回前20条
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// API路由
app.get('/', (req, res) => {
  res.json({
    service: '分类名称翻译服务',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      'GET /status': '检查翻译状态',
      'POST /translate': '执行翻译任务',
      'GET /health': '健康检查'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/status', async (req, res) => {
  try {
    const result = await checkTranslationStatus();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/translate', async (req, res) => {
  try {
    console.log('🎯 收到翻译请求');
    const result = await translateAndUpdateCategories();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 翻译服务启动成功！`);
  console.log(`📡 服务地址: http://localhost:${PORT}`);
  console.log(`📊 状态检查: http://localhost:${PORT}/status`);
  console.log(`🔄 执行翻译: POST http://localhost:${PORT}/translate`);
  console.log(`💚 健康检查: http://localhost:${PORT}/health`);
  
  // 检查环境变量
  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase环境变量未配置');
  }
  
  if (!DEEPSEEK_API_KEY) {
    console.warn('⚠️ DeepSeek API Key未配置');
  }
}); 