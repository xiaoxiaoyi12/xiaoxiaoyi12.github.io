export type ContentType = 'posts' | 'notes' | 'readings' | 'thoughts';

export interface ArticleMeta {
  slug: string;
  type: ContentType;
  title: string;
  date: string;
  tags: string[];
  category?: string;
  excerpt: string;
  filename: string;
}

export interface Article extends ArticleMeta {
  content: string; // rendered HTML
}

export const TYPE_LABELS: Record<ContentType, string> = {
  posts: '文章',
  notes: '笔记',
  readings: '阅读',
  thoughts: '感想',
};

export const ALL_TYPES: ContentType[] = ['posts', 'notes', 'readings', 'thoughts'];
