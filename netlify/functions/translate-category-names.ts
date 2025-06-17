import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Supabase配置
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// AI翻译服务配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-567abb67b99d4a65acaa2d9ed06c3782';

interface CategoryRecord {
  id: number;
  category_name: string;
  category_name_en: string | null;
  category_code: string;
  category_level: number;
}

/**
 * 使用DeepSeek AI翻译中文到英文
 */
async function translateToEnglish(chineseText: string): Promise<string> {
  try {
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

    return translatedText;
  } catch (error) {
    console.error(`翻译失败 "${chineseText}":`, error);
    // 如果翻译失败，返回原文
    return chineseText;
  }
}

/**
 * 检查文本是否包含中文字符
 */
function containsChinese(text: string): boolean {
  const chineseRegex = /[\u4e00-\u9fff]/;
  return chineseRegex.test(text);
}

/**
 * 批量翻译并更新分类名称
 */
async function translateAndUpdateCategories(): Promise<{
  total: number;
  translated: number;
  failed: number;
  details: Array<{
    id: number;
    category_name: string;
    category_name_en: string;
    status: 'success' | 'failed' | 'skipped';
    reason?: string;
  }>;
}> {
  console.log('🔍 开始查询需要翻译的分类记录...');

  // 查询所有category_name_en为空的记录
  const { data: categories, error: fetchError } = await supabase
    .from('user_projectscategory')
    .select('id, category_name, category_name_en, category_code, category_level')
    .or('category_name_en.is.null,category_name_en.eq.""')
    .order('category_level')
    .order('id');

  if (fetchError) {
    console.error('❌ 查询分类数据失败:', fetchError);
    throw new Error(`查询分类数据失败: ${fetchError.message}`);
  }

  if (!categories || categories.length === 0) {
    console.log('✅ 没有需要翻译的分类记录');
    return {
      total: 0,
      translated: 0,
      failed: 0,
      details: []
    };
  }

  console.log(`📊 找到 ${categories.length} 个需要翻译的分类记录`);

  const results = {
    total: categories.length,
    translated: 0,
    failed: 0,
    details: [] as Array<{
      id: number;
      category_name: string;
      category_name_en: string;
      status: 'success' | 'failed' | 'skipped';
      reason?: string;
    }>
  };

  // 逐个处理翻译
  for (const category of categories) {
    try {
      const { id, category_name } = category;

      // 检查是否包含中文
      if (!containsChinese(category_name)) {
        console.log(`⏭️ 跳过非中文分类: ${category_name}`);
        results.details.push({
          id,
          category_name,
          category_name_en: category_name,
          status: 'skipped',
          reason: '不包含中文字符'
        });
        continue;
      }

      console.log(`🔄 翻译中: ${category_name}`);

      // 调用翻译服务
      const translatedName = await translateToEnglish(category_name);

      // 更新数据库
      const { error: updateError } = await supabase
        .from('user_projectscategory')
        .update({ category_name_en: translatedName })
        .eq('id', id);

      if (updateError) {
        console.error(`❌ 更新分类 ${id} 失败:`, updateError);
        results.failed++;
        results.details.push({
          id,
          category_name,
          category_name_en: '',
          status: 'failed',
          reason: updateError.message
        });
      } else {
        console.log(`✅ 翻译成功: ${category_name} -> ${translatedName}`);
        results.translated++;
        results.details.push({
          id,
          category_name,
          category_name_en: translatedName,
          status: 'success'
        });
      }

      // 添加延迟以避免API频率限制
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`❌ 处理分类 ${category.id} 时出错:`, error);
      results.failed++;
      results.details.push({
        id: category.id,
        category_name: category.category_name,
        category_name_en: '',
        status: 'failed',
        reason: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  return results;
}

export const handler: Handler = async (event, context) => {
  // 设置CORS头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('🚀 开始分类名称翻译服务...');

    // 检查环境变量
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase环境变量未正确配置');
    }

    if (!DEEPSEEK_API_KEY) {
      throw new Error('DeepSeek API Key未配置');
    }

    console.log('🔧 环境配置检查通过');

    // 执行翻译更新
    const results = await translateAndUpdateCategories();

    console.log('📊 翻译任务完成统计:', {
      总数: results.total,
      成功: results.translated,
      失败: results.failed,
      跳过: results.details.filter(d => d.status === 'skipped').length
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '分类名称翻译任务完成',
        results: {
          total: results.total,
          translated: results.translated,
          failed: results.failed,
          skipped: results.details.filter(d => d.status === 'skipped').length,
          details: results.details
        }
      }, null, 2)
    };

  } catch (error) {
    console.error('❌ 翻译服务执行失败:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '翻译服务执行失败',
        message: error instanceof Error ? error.message : '未知错误'
      }, null, 2)
    };
  }
}; 