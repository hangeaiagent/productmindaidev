import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from '@netlify/functions';

/**
 * Netlify 定时批量生成函数
 * 可以通过 Netlify 的 Scheduled Functions 功能定时执行
 * 或者通过外部 cron 服务调用
 */

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
  try {
    console.log('🚀 开始定时批量生成任务...');
    
    // 获取参数
    const params = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};
    const allParams = { ...params, ...body };
    
    const languages = allParams.languages || 'zh,en';
    const batchSize = parseInt(allParams.batch_size || '1');
    const templateBatchSize = parseInt(allParams.template_batch_size || '1');
    const maxTime = parseInt(allParams.max_time || '25000');
    const startOffset = parseInt(allParams.start_offset || '0');
    const templateOffset = parseInt(allParams.template_offset || '0');
    const limit = parseInt(allParams.limit || '5'); // 定时任务使用较小的批次
    
    // 调用主批量生成函数
    const batchUrl = `${event.headers.host}/.netlify/functions/batch-generate-templates`;
    const queryParams = new URLSearchParams({
      languages,
      user_id: 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1',
      table: 'user_projects',
      batch_size: batchSize.toString(),
      template_batch_size: templateBatchSize.toString(),
      max_time: maxTime.toString(),
      start_offset: startOffset.toString(),
      template_offset: templateOffset.toString(),
      limit: limit.toString()
    });
    
    const fullUrl = `https://${batchUrl}?${queryParams.toString()}`;
    
    console.log(`📞 调用批量生成函数: ${fullUrl}`);
    
    // 内部调用批量生成函数
    const response = await fetch(fullUrl);
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || '批量生成失败');
    }
    
    console.log(`✅ 定时任务完成: 生成=${result.generated}, 跳过=${result.skipped}, 错误=${result.errors}`);
    
    // 如果还有更多数据，返回下一批的信息
    const batchInfo = result.batch_info || {};
    const hasMoreData = batchInfo.has_more_projects || batchInfo.has_more_templates;
    
    const response_data = {
      success: true,
      message: `定时批量生成完成: 生成=${result.generated}, 跳过=${result.skipped}, 错误=${result.errors}`,
      current_batch: {
        generated: result.generated,
        skipped: result.skipped,
        errors: result.errors,
        execution_time: result.execution_time
      },
      has_more_data: hasMoreData,
      next_batch_params: hasMoreData ? {
        start_offset: batchInfo.next_project_offset || startOffset,
        template_offset: batchInfo.next_template_offset || 0,
        languages,
        limit
      } : null,
      next_batch_url: hasMoreData ? 
        `https://${event.headers.host}/.netlify/functions/scheduled-batch-generator?${new URLSearchParams({
          languages,
          start_offset: (batchInfo.next_project_offset || startOffset).toString(),
          template_offset: (batchInfo.next_template_offset || 0).toString(),
          limit: limit.toString()
        }).toString()}` : null
    };
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(response_data)
    };
    
  } catch (error) {
    console.error('❌ 定时批量生成失败:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        message: '定时批量生成失败'
      })
    };
  }
}; 