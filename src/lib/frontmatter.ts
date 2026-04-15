import yaml from 'js-yaml';

interface ParsedFrontMatter {
  fm: Record<string, unknown>;
  body: string;
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

export function escapeYamlString(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function formatTags(tags: string[]): string {
  return tags.map(t => `"${escapeYamlString(t)}"`).join(', ');
}

export function buildFrontMatter(meta: { title: string; date: string; tags: string[]; category?: string }): string {
  const lines = ['---'];
  lines.push(`title: "${escapeYamlString(meta.title)}"`);
  lines.push(`date: ${meta.date}`);
  if (meta.category) lines.push(`category: "${escapeYamlString(meta.category)}"`);
  lines.push(`tags: [${formatTags(meta.tags)}]`);
  lines.push('---');
  return lines.join('\n');
}

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
