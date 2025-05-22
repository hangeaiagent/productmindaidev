// @deno-types="https://deno.land/x/servest@v1.3.1/types/mod.d.ts"
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 验证请求方法
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // 获取请求体
    const requestData = await req.json();
    
    // 验证必需的参数
    const { projectId, templateId, userId } = requestData;
    if (!projectId || !templateId || !userId) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters',
          details: {
            projectId: !projectId ? 'missing' : 'ok',
            templateId: !templateId ? 'missing' : 'ok',
            userId: !userId ? 'missing' : 'ok'
          }
        }),
        { 
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // ... 原有的生成逻辑 ...

    // 返回响应时添加CORS头
    return new Response(
      JSON.stringify({ result: '生成成功' }),
      { 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    // 错误响应也需要添加CORS头
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred',
        details: error.stack || null
      }),
      { 
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
}); 