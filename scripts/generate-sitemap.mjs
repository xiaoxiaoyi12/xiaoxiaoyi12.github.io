import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const CONTENT_DIR = path.join(process.cwd(), 'content');
const OUTPUT_PATH = path.join(process.cwd(), 'public', 'sitemap.xml');
const TYPES = ['posts', 'notes', 'readings', 'thoughts'];
const SITE_URL = 'https://xiaoxiaoyi12.github.io';

const urls = [];

urls.push({ loc: SITE_URL + '/', changefreq: 'daily', priority: '1.0' });

for (const type of TYPES) {
  const dir = path.join(CONTENT_DIR, type);
  if (!fs.existsSync(dir)) continue;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
  for (const filename of files) {
    const raw = fs.readFileSync(path.join(dir, filename), 'utf-8');
    const { data } = matter(raw);
    const slug = filename.replace(/\.md$/, '');
    const date = data.date ? new Date(data.date).toISOString().slice(0, 10) : '';

    urls.push({
      loc: `${SITE_URL}/${type}/${slug}/`,
      lastmod: date,
      changefreq: 'monthly',
      priority: '0.7',
    });
  }
}

const urlEntries = urls.map(u => {
  let entry = `  <url>\n    <loc>${u.loc}</loc>`;
  if (u.lastmod) entry += `\n    <lastmod>${u.lastmod}</lastmod>`;
  entry += `\n    <changefreq>${u.changefreq}</changefreq>`;
  entry += `\n    <priority>${u.priority}</priority>`;
  entry += `\n  </url>`;
  return entry;
}).join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, sitemap);
console.log(`Sitemap generated: ${urls.length} URLs`);
