// Types and helpers for the /past-papers page that reads from the
// `pastPapers` Firestore collection populated by scripts/pastpapers/sync_doenets.py.
//
// Keep this tight — UI-side query + grouping logic only. Schema is mirrored from
// the PaperRecord dataclass in sync_doenets.py.

export type PaperLevel = 'ol' | 'al' | 'grade5';
export type PaperLanguage = 'en' | 'si' | 'ta';

export interface PastPaper {
  id: string;
  source: string;
  sourceResourceId: number;
  level: PaperLevel;
  year: number | null;
  subject: string | null;
  language: PaperLanguage;
  titleEn: string;
  titleSi: string;
  titleTa: string;
  descriptionEn: string;
  descriptionSi: string;
  descriptionTa: string;
  sourceUrl: string;
  fileUrl: string;
  relPath: string;
  sha256?: string;
  sizeBytes?: number;
  createdDate?: string;
  fetchedAt?: string;
}

/** A paper grouped with its language siblings (same sourceResourceId). */
export interface PaperGroup {
  /** sourceResourceId, used as the React key. */
  resourceId: number;
  /** Representative paper (whichever variant we encounter first). */
  primary: PastPaper;
  /** All language variants, sorted en → si → ta. */
  variants: PastPaper[];
  year: number | null;
  subject: string | null;
  level: PaperLevel;
}

const LANG_ORDER: Record<PaperLanguage, number> = { en: 0, si: 1, ta: 2 };

/** Pick the best title for the current UI language, falling back gracefully. */
export function pickTitle(p: PastPaper, lang: PaperLanguage): string {
  const map: Record<PaperLanguage, string> = {
    en: p.titleEn,
    si: p.titleSi,
    ta: p.titleTa,
  };
  return (
    map[lang] ||
    p.titleEn ||
    p.titleSi ||
    p.titleTa ||
    `Paper ${p.sourceResourceId}`
  );
}

/**
 * Group per-language documents into one row per source paper.
 * Documents with the same `sourceResourceId` are language variants of the same paper.
 */
export function groupBySourceResource(papers: PastPaper[]): PaperGroup[] {
  const byId = new Map<number, PaperGroup>();
  for (const p of papers) {
    const key = p.sourceResourceId;
    const existing = byId.get(key);
    if (existing) {
      existing.variants.push(p);
      // Prefer a variant with a non-null subject / year if the primary is missing those.
      if (!existing.primary.subject && p.subject) existing.primary = p;
      else if (!existing.primary.year && p.year) existing.primary = p;
    } else {
      byId.set(key, {
        resourceId: key,
        primary: p,
        variants: [p],
        year: p.year,
        subject: p.subject,
        level: p.level,
      });
    }
  }
  // Sort variants en → si → ta inside every group, and refresh year/subject from primary.
  const groups = Array.from(byId.values());
  for (const g of groups) {
    g.variants.sort((a, b) => LANG_ORDER[a.language] - LANG_ORDER[b.language]);
    g.year = g.primary.year;
    g.subject = g.primary.subject;
  }
  return groups;
}

/** Sort groups by year desc, then subject asc, then title asc — for in-year ordering. */
export function sortGroupsForDisplay(
  groups: PaperGroup[],
  lang: PaperLanguage
): PaperGroup[] {
  const copy = [...groups];
  copy.sort((a, b) => {
    const ay = a.year ?? -Infinity;
    const by = b.year ?? -Infinity;
    if (ay !== by) return by - ay;
    const as = (a.subject ?? '').toLowerCase();
    const bs = (b.subject ?? '').toLowerCase();
    if (as !== bs) return as.localeCompare(bs);
    return pickTitle(a.primary, lang).localeCompare(pickTitle(b.primary, lang));
  });
  return copy;
}

/**
 * Bucket groups by year. Returns ordered entries (newest year first; null year at the end).
 */
export function bucketByYear(groups: PaperGroup[]): Array<[number | 'unknown', PaperGroup[]]> {
  const buckets = new Map<number | 'unknown', PaperGroup[]>();
  for (const g of groups) {
    const key: number | 'unknown' = g.year ?? 'unknown';
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(g);
  }
  const entries = Array.from(buckets.entries());
  entries.sort(([a], [b]) => {
    if (a === 'unknown') return 1;
    if (b === 'unknown') return -1;
    return (b as number) - (a as number);
  });
  return entries;
}
