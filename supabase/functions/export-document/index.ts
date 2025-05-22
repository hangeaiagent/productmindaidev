import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Document, Paragraph, TextRun, Packer } from "npm:docx@8.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, format } = await req.json();
    
    if (!content) {
      throw new Error("缺少必要的内容参数");
    }

    // 将 Markdown 内容转换为文档段落
    const paragraphs = content.split('\n').map(line => {
      // 处理标题
      if (line.startsWith('#')) {
        const level = line.match(/^#+/)[0].length;
        const text = line.replace(/^#+\s+/, '');
        return new Paragraph({
          text,
          heading: `Heading${level}`,
          spacing: { before: 200, after: 100 }
        });
      }
      
      // 处理列表项
      if (line.startsWith('- ')) {
        return new Paragraph({
          text: line.substring(2),
          bullet: { level: 0 }
        });
      }
      
      // 普通段落
      return new Paragraph({
        children: [new TextRun(line)],
        spacing: { before: 100, after: 100 }
      });
    });

    // 创建文档
    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs
      }]
    });

    // 生成文档
    const buffer = await Packer.toBuffer(doc);

    return new Response(buffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="analysis.docx"'
      }
    });

  } catch (error) {
    console.error('导出文档失败:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "导出文档失败",
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400
      }
    );
  }
});