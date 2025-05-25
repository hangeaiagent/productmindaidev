import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// 环境变量
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyC3fc8-5r4SWOISs0IIduiE4TOvE8-aFC0';
const GOOGLE_CX = process.env.GOOGLE_CX || 'e264dc925d71e46e4';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface GoogleSearchResult {
  items?: Array<{
    title: string;
    snippet: string;
    link: string;
  }>;
}

const handler: Handler = async (event) => {
  try {
    // 设置最近24小时的时间范围
    const date = new Date();
    date.setDate(date.getDate() - 1);
    const dateStr = date.toISOString().split('T')[0];

    // 构建Google搜索URL
    const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
    searchUrl.searchParams.append('key', GOOGLE_API_KEY);
    searchUrl.searchParams.append('cx', GOOGLE_CX);
    searchUrl.searchParams.append('q', 'AI startup funding round -jobs');
    searchUrl.searchParams.append('dateRestrict', `d1`);
    searchUrl.searchParams.append('num', '10');

    // 执行搜索
    const response = await fetch(searchUrl.toString());
    if (!response.ok) {
      throw new Error(`Google API error: ${response.statusText}`);
    }

    const searchResults: GoogleSearchResult = await response.json();
    if (!searchResults.items) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: '没有找到新的AI融资项目', count: 0 }),
      };
    }

    // 处理搜索结果并保存到Supabase
    const processedResults = searchResults.items.map(item => ({
      project_name: item.title.split(' - ')[0].trim(),
      description: item.snippet.replace(/\\n/g, ' ').trim(),
      source_url: item.link,
      created_at: new Date().toISOString(),
    }));

    // 保存到Supabase
    const { data, error } = await supabase
      .from('ai_funding')
      .upsert(
        processedResults,
        {
          onConflict: 'project_name',
          ignoreDuplicates: true,
        }
      );

    if (error) {
      throw error;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: '成功更新AI融资项目数据',
        count: processedResults.length,
        data: processedResults,
      }),
    };
  } catch (error) {
    console.error('Error in search-ai-funding:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '搜索AI融资项目失败' }),
    };
  }
};

export { handler }; 