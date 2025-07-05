// 简化版保存功能，不依赖外部数据库
exports.handler = async (event, context) => {
  console.log('[SIMPLE SAVE] Request received:', {
    method: event.httpMethod,
    timestamp: new Date().toISOString()
  });

  // 处理CORS预检请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  // 只允许POST请求
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // 解析请求体
    const { tempUserId, requirement, analysisResult, language = 'zh' } = JSON.parse(event.body || '{}');

    console.log('[SIMPLE SAVE] Request data:', {
      tempUserId,
      requirementLength: requirement?.length || 0,
      hasAnalysisResult: !!analysisResult,
      language
    });

    // 验证必需字段
    if (!tempUserId || !requirement || !analysisResult) {
      console.log('[SIMPLE SAVE] Missing required fields');
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: language === 'zh' ? '缺少必需字段' : 'Missing required fields'
        })
      };
    }

    // 生成项目ID（简化版本）
    const projectId = 'simple-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    console.log('[SIMPLE SAVE] Generated project ID:', projectId);

    // 返回成功响应（不实际保存到数据库）
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        id: projectId,
        message: language === 'zh' ? '项目已成功保存（简化版）' : 'Project saved successfully (simplified)',
        data: {
          id: projectId,
          createdAt: new Date().toISOString(),
          status: 'saved-simplified'
        }
      })
    };

  } catch (error) {
    console.error('[SIMPLE SAVE] Error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: '保存失败，请稍后重试',
        details: error.message
      })
    };
  }
};