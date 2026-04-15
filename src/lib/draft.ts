export interface DraftData {
  title: string;
  body: string;
  date: string;
  tags: string[];
  category: string;
  slug: string;
  type: string;
  savedAt: number;
}

export function getDraftKey(mode: 'new' | 'edit', filename?: string): string {
  return mode === 'new' ? 'draft-new' : `draft-edit-${filename}`;
}

export function saveDraft(key: string, data: DraftData): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Storage full or unavailable
  }
}

export function loadDraft(key: string): DraftData | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw) as DraftData;
    // Expire drafts older than 7 days
    if (Date.now() - data.savedAt > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}
