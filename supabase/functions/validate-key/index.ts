import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

async function validateOpenAIKey(apiKey: string) {
  try {
    console.log('Validating OpenAI key...');
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI validation failed:', error);
      return false;
    }
    
    console.log('OpenAI key validation successful');
    return true;
  } catch (error) {
    console.error('OpenAI validation error:', error);
    return false;
  }
}

async function validateDeepseekKey(apiKey: string) {
  try {
    console.log('Validating Deepseek key...');
    const response = await fetch('https://api.deepseek.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Deepseek validation failed:', error);
      return false;
    }
    
    console.log('Deepseek key validation successful');
    return true;
  } catch (error) {
    console.error('Deepseek validation error:', error);
    return false;
  }
}

async function validateClaudeKey(apiKey: string) {
  try {
    console.log('Validating Claude key...');
    const response = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Claude validation failed:', error);
      return false;
    }
    
    console.log('Claude key validation successful');
    return true;
  } catch (error) {
    console.error('Claude validation error:', error);
    return false;
  }
}

async function validateGoogleKey(apiKey: string) {
  try {
    console.log('Validating Google key...');
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1/models?key=' + apiKey
    );
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Google validation failed:', error);
      return false;
    }
    
    console.log('Google key validation successful');
    return true;
  } catch (error) {
    console.error('Google validation error:', error);
    return false;
  }
}

serve(async (req) => {
  console.log('Received validation request');
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { model, apiKey } = await req.json();
    console.log('Validating key for model:', model);

    if (!model || !apiKey) {
      throw new Error("缺少必要参数");
    }

    let isValid = false;

    switch (model) {
      case 'openai':
        isValid = await validateOpenAIKey(apiKey);
        break;
      case 'deepseek':
        isValid = await validateDeepseekKey(apiKey);
        break;
      case 'claude':
        isValid = await validateClaudeKey(apiKey);
        break;
      case 'google':
        isValid = await validateGoogleKey(apiKey);
        break;
      default:
        throw new Error("不支持的模型类型");
    }

    if (!isValid) {
      throw new Error("API Key 验证失败");
    }

    console.log('Validation successful');
    return new Response(
      JSON.stringify({ valid: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Validation error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "验证失败",
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});