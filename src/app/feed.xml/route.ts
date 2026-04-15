import { getAllArticles } from '@/lib/content';

export const dynamic = 'force-static';

const SITE_URL = 'https://xiaoxiaoyi12.github.io';

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function GET() {
  const articles = getAllArticles().slice(0, 50);

  const items = articles.map(a => `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${SITE_URL}/${a.type}/${a.slug}/</link>
      <guid>${SITE_URL}/${a.type}/${a.slug}/</guid>
      <pubDate>${new Date(a.date).toUTCString()}</pubDate>
      <description>${escapeXml(a.excerpt)}</description>
    </item>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>小小驿 Blog</title>
    <link>${SITE_URL}</link>
    <description>小小驿的博客 — 文章、笔记、阅读与感想</description>
    <language>zh-CN</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
