import { Schedule } from '@netlify/functions';
import { handler as searchHandler } from './search-ai-funding';

// 每天凌晨3点执行
export const handler: Schedule = async (event) => {
  console.log('开始执行定时AI融资项目搜索任务');
  
  try {
    // 调用搜索处理函数
    const result = await searchHandler(
      {
        httpMethod: 'POST',
        body: null,
        headers: {},
      } as any,
      {} as any,
      () => {}
    );

    console.log('定时搜索任务执行结果:', result);
    return result;
  } catch (error) {
    console.error('定时搜索任务执行失败:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '定时搜索任务执行失败' }),
    };
  }
};

// 设置定时任务为每天凌晨3点执行
export const config = {
  schedule: 'cron(0 3 * * *)'
}; 