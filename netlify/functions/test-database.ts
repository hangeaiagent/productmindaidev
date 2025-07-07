import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('[DB TEST] Testing database connection...');
    
    // 检查环境变量
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    console.log('[DB TEST] Environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'missing',
      keyPrefix: supabaseAnonKey ? supabaseAnonKey.substring(0, 10) + '...' : 'missing'
    });
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          databaseConfigured: false,
          error: 'Missing Supabase configuration',
          details: {
            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseAnonKey
          }
        })
      };
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // 测试表是否存在
    const { data, error } = await supabase
      .from('ai_product_ideas')
      .select('count')
      .limit(1);
    
    console.log('[DB TEST] Query result:', { data, error });
    
    if (error) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          tableExists: false,
          error: error.message,
          code: error.code,
          details: error.details,
          message: 'Table ai_product_ideas does not exist or is not accessible'
        })
      };
    }
    
    // 测试user_projects表
    const { data: projectsData, error: projectsError } = await supabase
      .from('user_projects')
      .select('count')
      .limit(1);
    
    // 测试user_projectscategory表
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('user_projectscategory')
      .select('count')
      .limit(1);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        databaseConfigured: true,
        tableExists: true,
        message: 'Database connection successful',
        tables: {
          ai_product_ideas: {
            accessible: true,
            recordCount: data?.length || 0
          },
          user_projects: {
            accessible: !projectsError,
            recordCount: projectsData?.length || 0,
            error: projectsError?.message
          },
          user_projectscategory: {
            accessible: !categoriesError,
            recordCount: categoriesData?.length || 0,
            error: categoriesError?.message
          }
        }
      })
    };
    
  } catch (error) {
    console.error('[DB TEST] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Database test failed',
        details: error instanceof Error ? error.message : String(error)
      })
    };
  }
};