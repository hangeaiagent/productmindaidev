import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from '@netlify/functions';

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
  const robotsContent = `User-agent: *
Allow: /

# 站点地图
Sitemap: https://ai-products.netlify.app/sitemap.xml

# 禁止爬取敏感目录
Disallow: /admin/
Disallow: /.netlify/
Disallow: /api/
Disallow: /*?*

# 语言特定页面
Allow: /en/
Allow: /products/
Allow: /en/products/

# 缓存友好
Crawl-delay: 1
`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400'
    },
    body: robotsContent
  };
}; 