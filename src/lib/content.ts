import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { renderMarkdown } from './markdown';
import type { ArticleMeta, Article, ContentType } from './types';

const CONTENT_DIR = path.join(process.cwd(), 'content');

function slugFromFilename(filename: string): string {
  // Keep full filename as slug (minus .md) to avoid collisions
  // e.g. "2026-03-19-daily-log.md" → "2026-03-19-daily-log"
  return filename.replace(/\.md$/, '');
}

function excerptFromBody(body: string, maxLen = 200): string {
  const plain = body
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*|__/g, '')
    .replace(/\*|_/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^>\s*/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/\n+/g, ' ')
    .trim();
  return plain.length > maxLen ? plain.slice(0, maxLen) + '...' : plain;
}

export function getArticlesByType(type: ContentType): ArticleMeta[] {
  const dir = path.join(CONTENT_DIR, type);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

  return files.map(filename => {
    const raw = fs.readFileSync(path.join(dir, filename), 'utf-8');
    const { data, content: body } = matter(raw);
    const slug = slugFromFilename(filename);

    return {
      slug,
      type,
      title: data.title || slug,
      date: data.date ? new Date(data.date).toISOString().slice(0, 10) : '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      category: data.category || undefined,
      excerpt: excerptFromBody(body),
      filename,
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
}

export function getAllArticles(): ArticleMeta[] {
  const all: ArticleMeta[] = [];
  for (const type of ['posts', 'notes', 'readings', 'thoughts'] as ContentType[]) {
    all.push(...getArticlesByType(type));
  }
  return all.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getArticle(type: ContentType, slug: string): Promise<Article | null> {
  const dir = path.join(CONTENT_DIR, type);
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
  const filename = files.find(f => slugFromFilename(f) === slug);
  if (!filename) return null;

  const raw = fs.readFileSync(path.join(dir, filename), 'utf-8');
  const { data, content: body } = matter(raw);

  const html = await renderMarkdown(body);

  return {
    slug,
    type,
    title: data.title || slug,
    date: data.date ? new Date(data.date).toISOString().slice(0, 10) : '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    category: data.category || undefined,
    excerpt: excerptFromBody(body),
    filename,
    content: html,
  };
}

export function getSlugs(type: ContentType): string[] {
  const dir = path.join(CONTENT_DIR, type);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(slugFromFilename);
}
