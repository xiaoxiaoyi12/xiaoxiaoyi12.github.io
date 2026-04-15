import yaml from 'js-yaml';

interface ParsedFrontMatter {
  fm: Record<string, unknown>;
  body: string;
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

export function parseFrontMatter(content: string): ParsedFrontMatter {
  const match = content.match(FRONTMATTER_RE);
  if (!match) return { fm: {}, body: content };

  try {
    const loaded = yaml.load(match[1], { schema: yaml.FAILSAFE_SCHEMA });
    const fm = loaded && typeof loaded === 'object' ? (loaded as Record<string, unknown>) : {};
    return { fm, body: match[2] };
  } catch {
    return { fm: {}, body: match[2] ?? content };
  }
}
