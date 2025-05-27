import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
  try {
    const { data: projects, error } = await supabase
      .from('user_projects')
      .select('id, name, created_at, primary_category')
      .not('name', 'is', null)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`获取项目数据失败: ${error.message}`);
    }
    
    const baseUrl = 'https://ai-products.netlify.app';
    const currentDate = new Date().toISOString().split('T')[0];
    
    // 生成中文版URL
    const zhUrls = projects?.map(project => `
    <url>
        <loc>${baseUrl}/products/${project.id}</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`).join('') || '';
    
    // 生成英文版URL
    const enUrls = projects?.map(project => `
    <url>
        <loc>${baseUrl}/en/products/${project.id}</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`).join('') || '';
    
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
    <url>
        <loc>${baseUrl}/</loc>
        <xhtml:link rel="alternate" hreflang="zh-CN" href="${baseUrl}/"/>
        <xhtml:link rel="alternate" hreflang="en-US" href="${baseUrl}/en/"/>
        <lastmod>${currentDate}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>${baseUrl}/en/</loc>
        <xhtml:link rel="alternate" hreflang="zh-CN" href="${baseUrl}/"/>
        <xhtml:link rel="alternate" hreflang="en-US" href="${baseUrl}/en/"/>
        <lastmod>${currentDate}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    ${zhUrls}
    ${enUrls}
</urlset>`;
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=86400'
      },
      body: sitemap
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: '站点地图生成失败',
        details: error instanceof Error ? error.message : String(error)
      })
    };
  }
};
