import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const CONTENT_DIR = path.join(process.cwd(), 'content');
const OUTPUT_PATH = path.join(process.cwd(), 'public', 'search-index.json');
const TYPES = ['posts', 'notes', 'readings', 'thoughts'];
const MAX_CONTENT = 8000;

function plainFromBody(body) {
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
    .trim();
}

function excerptFromPlain(plain, maxLen = 200) {
  return plain.slice(0, maxLen);
}

const index = [];

for (const type of TYPES) {
  const dir = path.join(CONTENT_DIR, type);
  if (!fs.existsSync(dir)) continue;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
  for (const filename of files) {
    const raw = fs.readFileSync(path.join(dir, filename), 'utf-8');
    const { data, content } = matter(raw);
    const plain = plainFromBody(content);

    index.push({
      slug: filename.replace(/\.md$/, ''),
      type,
      title: data.title || filename.replace(/\.md$/, ''),
      date: data.date ? new Date(data.date).toISOString().slice(0, 10) : '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      category: data.category || '',
      excerpt: excerptFromPlain(plain),
      content: plain.slice(0, MAX_CONTENT),
    });
  }
}

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(index));
console.log(`Search index generated: ${index.length} articles`);
