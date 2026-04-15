import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const CONTENT_DIR = path.join(process.cwd(), 'content');
const OUTPUT_PATH = path.join(process.cwd(), 'public', 'feed.xml');
const TYPES = ['posts', 'notes', 'readings', 'thoughts'];
const SITE_URL = 'https://xiaoxiaoyi12.github.io';
const SITE_TITLE = '依人相的月光集市';
const SITE_DESC = '只在深夜营业，售卖代码与随想';

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function excerptFromBody(body, maxLen = 200) {
  return body
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*|__/g, '')
    .replace(/\*|_/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/^>\s*/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/\|[^\n]*\|/gm, '')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

const articles = [];

for (const type of TYPES) {
  const dir = path.join(CONTENT_DIR, type);
  if (!fs.existsSync(dir)) continue;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
  for (const filename of files) {
    const raw = fs.readFileSync(path.join(dir, filename), 'utf-8');
    const { data, content } = matter(raw);
    const slug = filename.replace(/\.md$/, '');

    articles.push({
      slug,
      type,
      title: data.title || slug,
      date: data.date ? new Date(data.date).toISOString().slice(0, 10) : '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      excerpt: excerptFromBody(content),
    });
  }
}

articles.sort((a, b) => b.date.localeCompare(a.date));
const recent = articles.slice(0, 50);

const items = recent.map(a => `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${SITE_URL}/${a.type}/${a.slug}/</link>
      <guid>${SITE_URL}/${a.type}/${a.slug}/</guid>
      <description>${escapeXml(a.excerpt)}</description>
      <pubDate>${new Date(a.date).toUTCString()}</pubDate>
${a.tags.map(t => `      <category>${escapeXml(t)}</category>`).join('\n')}
    </item>`).join('\n');

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <description>${escapeXml(SITE_DESC)}</description>
    <link>${SITE_URL}</link>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, rss);
console.log(`RSS feed generated: ${recent.length} articles`);
