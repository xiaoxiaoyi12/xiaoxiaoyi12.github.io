import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { renderMarkdown } from './markdown';
import type { ArticleMeta, Article, ContentType } from './types';

const CONTENT_DIR = path.join(process.cwd(), 'content');
const SHOULD_CACHE = process.env.NODE_ENV === 'production';
const TYPE_CACHE = new Map<ContentType, ArticleMeta[]>();
const SLUG_CACHE = new Map<ContentType, string[]>();
const ARTICLE_CACHE = new Map<string, Promise<Article | null>>();
let ALL_CACHE: ArticleMeta[] | null = null;

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

function calculateReadingTime(markdown: string): number {
  // Remove code blocks and front matter
  const cleaned = markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^---[\s\S]*?---/m, '');

  const chineseChars = (cleaned.match(/[\u4e00-\u9fff]/g) || []).length;
  const englishWords = (cleaned.match(/[a-zA-Z]+/g) || []).length;

  const minutes = chineseChars / 400 + englishWords / 200;
  return Math.max(1, Math.ceil(minutes));
}

export function getArticlesByType(type: ContentType): ArticleMeta[] {
  if (SHOULD_CACHE && TYPE_CACHE.has(type)) {
    return TYPE_CACHE.get(type)!;
  }

  const dir = path.join(CONTENT_DIR, type);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

  const items = files.map(filename => {
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

  if (SHOULD_CACHE) {
    TYPE_CACHE.set(type, items);
    SLUG_CACHE.set(type, items.map(a => a.slug));
  }

  return items;
}

export function getAllArticles(): ArticleMeta[] {
  if (SHOULD_CACHE && ALL_CACHE) return ALL_CACHE;

  const all: ArticleMeta[] = [];
  for (const type of ['posts', 'notes', 'readings', 'thoughts'] as ContentType[]) {
    all.push(...getArticlesByType(type));
  }
  const sorted = all.sort((a, b) => b.date.localeCompare(a.date));
  if (SHOULD_CACHE) ALL_CACHE = sorted;
  return sorted;
}

async function loadArticle(type: ContentType, slug: string): Promise<Article | null> {
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
    readingTime: calculateReadingTime(body),
  };
}

export function getSlugs(type: ContentType): string[] {
  if (SHOULD_CACHE && SLUG_CACHE.has(type)) {
    return SLUG_CACHE.get(type)!;
  }
  const slugs = getArticlesByType(type).map(a => a.slug);
  if (SHOULD_CACHE) SLUG_CACHE.set(type, slugs);
  return slugs;
}

export async function getArticle(type: ContentType, slug: string): Promise<Article | null> {
  if (!SHOULD_CACHE) return loadArticle(type, slug);
  const key = `${type}/${slug}`;
  if (!ARTICLE_CACHE.has(key)) {
    ARTICLE_CACHE.set(key, loadArticle(type, slug));
  }
  return ARTICLE_CACHE.get(key)!;
}
