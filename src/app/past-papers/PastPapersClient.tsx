'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import AdSlot from '@/components/AdSlot';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/lib/translations';
import {
  PaperLanguage,
  PaperLevel,
  PastPaper,
  bucketByYear,
  groupBySourceResource,
  pickTitle,
  sortGroupsForDisplay,
} from '@/lib/pastPapers';

interface LevelMeta {
  id: PaperLevel;
  labelKey: TranslationKey;
  descKey: TranslationKey;
  accent: string; // tailwind utility classes for the card accent strip
  emoji: string;
}

const LEVELS: LevelMeta[] = [
  {
    id: 'ol',
    labelKey: 'pastPapersLevelOL',
    descKey: 'pastPapersLevelOLDesc',
    accent: 'from-primary-500 to-primary-600',
    emoji: '📘',
  },
  {
    id: 'al',
    labelKey: 'pastPapersLevelAL',
    descKey: 'pastPapersLevelALDesc',
    accent: 'from-accent-500 to-accent-600',
    emoji: '🎓',
  },
  {
    id: 'grade5',
    labelKey: 'pastPapersLevelScholarship',
    descKey: 'pastPapersLevelScholarshipDesc',
    accent: 'from-amber-500 to-amber-600',
    emoji: '🏅',
  },
];

const LANG_CHIP_CLASS: Record<PaperLanguage, string> = {
  en: 'bg-blue-100 text-blue-800 border-blue-200',
  si: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  ta: 'bg-purple-100 text-purple-800 border-purple-200',
};

const LANG_CHIP_KEY: Record<PaperLanguage, TranslationKey> = {
  en: 'pastPapersLanguageChipEN',
  si: 'pastPapersLanguageChipSI',
  ta: 'pastPapersLanguageChipTA',
};

const LANG_FULL_KEY: Record<PaperLanguage, TranslationKey> = {
  en: 'pastPapersLanguageEN',
  si: 'pastPapersLanguageSI',
  ta: 'pastPapersLanguageTA',
};

type LangFilter = 'all' | PaperLanguage;

export default function PastPapersPage() {
  const { t, language: uiLang } = useLanguage();
  const [level, setLevel] = useState<PaperLevel | null>(null);
  const [papers, setPapers] = useState<PastPaper[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState<string>('All');
  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [langFilter, setLangFilter] = useState<LangFilter>('all');

  const fetchLevel = useCallback(async (lvl: PaperLevel) => {
    setLoading(true);
    setError(null);
    setPapers([]);
    try {
      // Single bounded query per level — facets are derived client-side from this cache.
      // Composite index required: (level ASC, year DESC).
      const q = query(
        collection(db, 'pastPapers'),
        where('level', '==', lvl),
        orderBy('year', 'desc')
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PastPaper);
      setPapers(data);
    } catch (err) {
      console.error('Error loading past papers:', err);
      setError(err instanceof Error ? err.message : 'unknown');
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePickLevel = (lvl: PaperLevel) => {
    setLevel(lvl);
    setYearFilter('All');
    setSubjectFilter('All');
    setLangFilter('all');
    fetchLevel(lvl);
  };

  const handleBack = () => {
    setLevel(null);
    setPapers([]);
    setError(null);
  };

  // Derived facets from the cached level results — zero extra Firestore reads.
  const yearOptions = useMemo(() => {
    const s = new Set<number>();
    papers.forEach((p) => {
      if (typeof p.year === 'number') s.add(p.year);
    });
    return Array.from(s).sort((a, b) => b - a);
  }, [papers]);

  const subjectOptions = useMemo(() => {
    const s = new Set<string>();
    papers.forEach((p) => {
      if (p.subject) s.add(p.subject);
    });
    return Array.from(s).sort();
  }, [papers]);

  const filteredPapers = useMemo(() => {
    return papers.filter((p) => {
      if (yearFilter !== 'All' && String(p.year ?? '') !== yearFilter) return false;
      if (subjectFilter !== 'All' && (p.subject ?? '') !== subjectFilter) return false;
      if (langFilter !== 'all' && p.language !== langFilter) return false;
      return true;
    });
  }, [papers, yearFilter, subjectFilter, langFilter]);

  const groups = useMemo(() => {
    const grouped = groupBySourceResource(filteredPapers);
    return sortGroupsForDisplay(grouped, uiLang);
  }, [filteredPapers, uiLang]);

  const buckets = useMemo(() => bucketByYear(groups), [groups]);

  // Render landing (level picker) when no level has been chosen.
  if (!level) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              {t('pastPapersTitle')}
            </h1>
            <p className="text-gray-600 mt-2 max-w-2xl">
              {t('pastPapersSubtitle')}
            </p>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {t('pastPapersChooseLevel')}
            </h2>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              {t('pastPapersChooseLevelHint')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {LEVELS.map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => handlePickLevel(lvl.id)}
                className="card text-left group hover:-translate-y-0.5"
                aria-label={t(lvl.labelKey)}
              >
                <div
                  className={`h-1 -mx-6 -mt-6 mb-5 rounded-t-xl bg-gradient-to-r ${lvl.accent}`}
                  aria-hidden
                />
                <div className="text-3xl mb-3" aria-hidden>
                  {lvl.emoji}
                </div>
                <div className="text-xl font-semibold text-gray-900">
                  {t(lvl.labelKey)}
                </div>
                <p className="text-sm text-gray-500 mt-1">{t(lvl.descKey)}</p>
                <div className="mt-4 text-primary-600 text-sm font-medium group-hover:text-primary-700">
                  {t('pastPapersLevelPickerCta')} →
                </div>
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-500 mt-6">
            {t('pastPapersAttribution')}
          </p>

          <div className="mt-8">
            <AdSlot placement="footer" />
          </div>
        </div>
      </div>
    );
  }

  // Render the filterable list for a chosen level.
  const activeLevel = LEVELS.find((l) => l.id === level);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4">
          <button
            type="button"
            onClick={handleBack}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            ← {t('pastPapersBackToLevels')}
          </button>
        </div>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {activeLevel ? t(activeLevel.labelKey) : t('pastPapersTitle')}
            </h1>
            <p className="text-gray-600 mt-1">{t('pastPapersSubtitle')}</p>
          </div>
          {!loading && !error && (
            <p className="text-sm text-gray-500">
              {t('pastPapersResultsCount').replace('{count}', String(groups.length))}
            </p>
          )}
        </div>

        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label" htmlFor="pp-year">
                {t('pastPapersYear')}
              </label>
              <select
                id="pp-year"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="input-field"
              >
                <option value="All">{t('pastPapersAllYears')}</option>
                {yearOptions.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="pp-subject">
                {t('subject')}
              </label>
              <select
                id="pp-subject"
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="input-field"
              >
                <option value="All">{t('allSubjects')}</option>
                {subjectOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('pastPapersMedium')}</label>
              <div className="flex flex-wrap gap-2" role="group" aria-label={t('pastPapersMedium')}>
                {(['all', 'si', 'ta', 'en'] as const).map((opt) => {
                  const active = langFilter === opt;
                  const label =
                    opt === 'all'
                      ? t('pastPapersAllLanguages')
                      : t(LANG_FULL_KEY[opt]);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setLangFilter(opt)}
                      aria-pressed={active}
                      className={
                        active
                          ? 'px-3 py-1.5 rounded-full text-sm font-medium bg-primary-600 text-white border border-primary-600'
                          : 'px-3 py-1.5 rounded-full text-sm font-medium bg-white text-gray-700 border border-gray-200 hover:border-primary-400'
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <AdSlot placement="footer" />

        {loading ? (
          <div className="space-y-3 mt-4" aria-busy>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 w-1/3 bg-gray-200 rounded mb-3" />
                <div className="h-3 w-2/3 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-1/4 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="card text-center py-12">
            <p className="font-medium text-gray-900">{t('pastPapersErrorTitle')}</p>
            <p className="text-sm text-gray-500 mt-1">
              {t('pastPapersErrorMessage')}
            </p>
            <button
              type="button"
              onClick={() => fetchLevel(level)}
              className="btn-outline text-sm mt-4"
            >
              {t('pastPapersErrorRetry')}
            </button>
          </div>
        ) : groups.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500">{t('pastPapersEmpty')}</p>
            <p className="text-sm text-gray-400 mt-2">
              {t('pastPapersEmptyHint')}
            </p>
            <Link
              href="/contact"
              className="btn-outline text-sm inline-block mt-4"
            >
              {t('pastPapersRequestPaper')}
            </Link>
          </div>
        ) : (
          <div className="space-y-8 mt-2">
            {buckets.map(([year, list]) => (
              <section key={String(year)}>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  {year === 'unknown' ? t('pastPapersUndatedYear') : year}
                </h2>
                <ul className="space-y-2">
                  {list.map((g) => {
                    const title = pickTitle(g.primary, uiLang);
                    return (
                      <li
                        key={g.resourceId}
                        className="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {title}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {g.subject && (
                              <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
                                {g.subject}
                              </span>
                            )}
                            {g.year != null && (
                              <span className="text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded">
                                {g.year}
                              </span>
                            )}
                            {g.variants.map((v) => (
                              <a
                                key={v.id}
                                href={v.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`${t('pastPapersOpenIn')} ${t(LANG_FULL_KEY[v.language])}`}
                                className={`text-xs px-2 py-0.5 rounded border ${LANG_CHIP_CLASS[v.language]} hover:opacity-80`}
                              >
                                {t(LANG_CHIP_KEY[v.language])}
                              </a>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <a
                            href={g.primary.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-gray-500 hover:text-gray-700"
                          >
                            {t('pastPapersSource')} ↗
                          </a>
                          <a
                            href={g.primary.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary text-sm"
                          >
                            {t('pastPapersOpenPdf')}
                          </a>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            <p className="text-xs text-gray-500 mt-2">
              {t('pastPapersAttribution')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
