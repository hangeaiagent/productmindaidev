import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PROJECT_TRANSLATION_PORT || 3002;

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
    console.log(`🔄 翻译中: ${chineseText.substring(0, 50)}...`);
    
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
            content: '你是一个专业的中英文翻译专家。请将提供的中文文本翻译成准确、简洁的英文。保持原意和专业性。只返回翻译结果，不要添加任何解释或其他内容。'
          },
          {
            role: 'user',
            content: `请将以下中文翻译成英文：${chineseText}`
          }
        ],
        max_tokens: 500,
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

    console.log(`✅ 翻译完成: ${chineseText.substring(0, 30)}... -> ${translatedText.substring(0, 30)}...`);
    return translatedText;
  } catch (error) {
    console.error(`❌ 翻译失败 "${chineseText.substring(0, 30)}...":`, error.message);
    // 如果翻译失败，返回原文
    return chineseText;
  }
}

/**
 * 检查文本是否包含中文字符
 */
function containsChinese(text) {
  if (!text) return false;
  const chineseRegex = /[\u4e00-\u9fff]/;
  return chineseRegex.test(text);
}

/**
 * 批量翻译并更新项目数据
 */
async function translateAndUpdateProjects() {
  const startTime = Date.now();
  console.log('🚀 开始批量翻译项目数据...');

  try {
    // 查询所有primary_category不为空的记录
    const { data: projects, error: fetchError } = await supabase
      .from('user_projects')
      .select('id, name, description, name_zh, name_en, description_zh, description_en, primary_category, secondary_category')
      .not('primary_category', 'is', null)
      .not('primary_category', 'eq', '')
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw new Error(`查询项目数据失败: ${fetchError.message}`);
    }

    if (!projects || projects.length === 0) {
      return {
        success: true,
        message: '没有找到符合条件的项目记录',
        results: {
          total: 0,
          processed: 0,
          failed: 0,
          skipped: 0,
          details: []
        }
      };
    }

    console.log(`📊 找到 ${projects.length} 个需要处理的项目记录`);

    const results = {
      total: projects.length,
      processed: 0,
      failed: 0,
      skipped: 0,
      details: []
    };

    // 逐个处理翻译
    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      const { id, name, description } = project;
      
      console.log(`📝 处理进度: ${i + 1}/${projects.length} - ${name}`);

      try {
        // 准备更新数据
        const updateData = {};
        let needsUpdate = false;
        let operationLog = [];

        // 1. 复制name到name_zh
        if (name && !project.name_zh) {
          updateData.name_zh = name;
          operationLog.push('复制name到name_zh');
          needsUpdate = true;
        }

        // 2. 复制description到description_zh
        if (description && !project.description_zh) {
          updateData.description_zh = description;
          operationLog.push('复制description到description_zh');
          needsUpdate = true;
        }

        // 3. 翻译name到name_en（如果name包含中文且name_en为空）
        if (name && containsChinese(name) && !project.name_en) {
          const translatedName = await translateToEnglish(name);
          updateData.name_en = translatedName;
          operationLog.push(`翻译name到name_en: ${name} -> ${translatedName}`);
          needsUpdate = true;
          
          // 添加延迟避免API频率限制
          await new Promise(resolve => setTimeout(resolve, 800));
        }

        // 4. 翻译description到description_en（如果description包含中文且description_en为空）
        if (description && containsChinese(description) && !project.description_en) {
          const translatedDescription = await translateToEnglish(description);
          updateData.description_en = translatedDescription;
          operationLog.push(`翻译description到description_en`);
          needsUpdate = true;
          
          // 添加延迟避免API频率限制
          await new Promise(resolve => setTimeout(resolve, 800));
        }

        // 5. 设置source_language（如果还没有设置）
        if (!project.source_language) {
          updateData.source_language = containsChinese(name) || containsChinese(description) ? 'zh' : 'en';
          operationLog.push(`设置source_language: ${updateData.source_language}`);
          needsUpdate = true;
        }

        if (needsUpdate) {
          // 更新数据库
          const { error: updateError } = await supabase
            .from('user_projects')
            .update(updateData)
            .eq('id', id);

          if (updateError) {
            console.error(`❌ 更新项目 ${id} 失败:`, updateError.message);
            results.failed++;
            results.details.push({
              id,
              name,
              status: 'failed',
              reason: updateError.message,
              operations: operationLog
            });
          } else {
            console.log(`✅ 项目更新成功: ${name}`);
            console.log(`   操作: ${operationLog.join(', ')}`);
            results.processed++;
            results.details.push({
              id,
              name,
              status: 'success',
              operations: operationLog,
              updateData
            });
          }
        } else {
          console.log(`⏭️ 跳过项目: ${name} (已有完整的多语言数据)`);
          results.skipped++;
          results.details.push({
            id,
            name,
            status: 'skipped',
            reason: '已有完整的多语言数据',
            operations: []
          });
        }

      } catch (error) {
        console.error(`❌ 处理项目 ${id} 时出错:`, error.message);
        results.failed++;
        results.details.push({
          id,
          name,
          status: 'failed',
          reason: error.message,
          operations: []
        });
      }
    }

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log(`🎉 项目翻译任务完成！耗时: ${duration}秒`);
    console.log(`📊 统计: 总数 ${results.total}, 处理 ${results.processed}, 失败 ${results.failed}, 跳过 ${results.skipped}`);

    return {
      success: true,
      message: '项目数据翻译任务完成',
      duration: `${duration}秒`,
      results
    };

  } catch (error) {
    console.error('❌ 项目翻译任务执行失败:', error.message);
    return {
      success: false,
      error: '项目翻译服务执行失败',
      message: error.message
    };
  }
}

/**
 * 检查项目翻译状态
 */
async function checkProjectTranslationStatus() {
  try {
    // 查询所有primary_category不为空的项目
    const { data: projects, error } = await supabase
      .from('user_projects')
      .select('id, name, description, name_zh, name_en, description_zh, description_en, primary_category, source_language')
      .not('primary_category', 'is', null)
      .not('primary_category', 'eq', '')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`查询项目数据失败: ${error.message}`);
    }

    const stats = {
      total: projects?.length || 0,
      hasChineseFields: 0,
      hasEnglishFields: 0,
      needsTranslation: 0,
      complete: 0
    };

    const needsTranslation = [];
    const chineseRegex = /[\u4e00-\u9fff]/;

    projects?.forEach(project => {
      const hasNameZh = project.name_zh && project.name_zh.trim() !== '';
      const hasDescZh = project.description_zh && project.description_zh.trim() !== '';
      const hasNameEn = project.name_en && project.name_en.trim() !== '';
      const hasDescEn = project.description_en && project.description_en.trim() !== '';

      // 统计字段完整性
      if (hasNameZh || hasDescZh) stats.hasChineseFields++;
      if (hasNameEn || hasDescEn) stats.hasEnglishFields++;

      // 检查是否需要处理
      const needsProcessing = (
        !hasNameZh ||  // 缺少中文name
        !hasDescZh ||  // 缺少中文description
        (!hasNameEn && chineseRegex.test(project.name)) ||  // name有中文但缺少英文翻译
        (!hasDescEn && chineseRegex.test(project.description))  // description有中文但缺少英文翻译
      );

      if (needsProcessing) {
        stats.needsTranslation++;
        needsTranslation.push({
          id: project.id,
          name: project.name,
          needsNameZh: !hasNameZh,
          needsDescZh: !hasDescZh,
          needsNameEn: !hasNameEn && chineseRegex.test(project.name),
          needsDescEn: !hasDescEn && chineseRegex.test(project.description),
          source_language: project.source_language
        });
      } else {
        stats.complete++;
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
    service: '项目数据翻译服务',
    version: '1.0.0',
    status: 'running',
    target: 'user_projects表',
    condition: 'primary_category不为空',
    operations: [
      'name → name_zh（复制）',
      'description → description_zh（复制）',
      'name → name_en（翻译）',
      'description → description_en（翻译）'
    ],
    endpoints: {
      'GET /status': '检查项目翻译状态',
      'POST /translate': '执行项目翻译任务',
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
    const result = await checkProjectTranslationStatus();
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
    console.log('🎯 收到项目翻译请求');
    const result = await translateAndUpdateProjects();
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
  console.log(`🚀 项目翻译服务启动成功！`);
  console.log(`📡 服务地址: http://localhost:${PORT}`);
  console.log(`🎯 目标表: user_projects (primary_category不为空)`);
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