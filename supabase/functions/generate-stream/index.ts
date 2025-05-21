serve(async (req) => {
  console.log('收到生成请求');
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { model, config, prompt } = await req.json();
    console.log('请求参数:', { 
      model, 
      version: config.version,
      promptLength: prompt.length 
    });
    
    if (!model || !config || !prompt) {
      throw new Error("缺少必要参数");
    }

    console.log('构建消息:', {
      model,
      version: config.version
    });

    const messages = [
      { role: 'system', content: '你是一个专业的产品经理AI助手。请用markdown格式输出分析结果。' },
      { role: 'user', content: prompt }
    ];

    let streamGenerator;
    console.log('选择模型处理器:', model);
    
    switch (model) {
      case 'openai':
        streamGenerator = await streamOpenAI(config.apiKey, messages);
        break;
      case 'deepseek':
        streamGenerator = await streamDeepseek(config.apiKey, messages);
        break;
      default:
        throw new Error("不支持的模型类型");
    }

    console.log('创建响应流...');
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    (async () => {
      try {
        console.log('开始处理流式输出...');
        let totalChunks = 0;
        let totalBytes = 0;
        
        for await (const chunk of streamGenerator) {
          totalChunks++;
          totalBytes += chunk.length;
          await writer.write(new TextEncoder().encode(chunk));
        }
        
        console.log('流式输出完成:', {
          chunks: totalChunks,
          bytes: totalBytes
        });
      } catch (error) {
        console.error('流式输出错误:', error);
      } finally {
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });

  } catch (error) {
    console.error('生成错误:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "生成过程中发生错误",
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400
      }
    );
  }
});