'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import AdSlot from '@/components/AdSlot';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Material, Level, Medium } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/lib/translations';

const CATEGORY_LABEL_KEY: Record<string, TranslationKey> = {
  'past-paper': 'pastPapersPastPaper',
  'model-paper': 'pastPapersModelPaper',
  'marking-scheme': 'pastPapersMarkingScheme',
};

const CATEGORY_COLORS: Record<string, string> = {
  'past-paper': 'bg-blue-100 text-blue-800',
  'model-paper': 'bg-purple-100 text-purple-800',
  'marking-scheme': 'bg-amber-100 text-amber-800',
};

const EXAM_LEVELS: Array<{ id: Level | 'Scholarship'; labelKey: TranslationKey }> = [
  { id: 'OL', labelKey: 'pastPapersLevelOL' },
  { id: 'AL', labelKey: 'pastPapersLevelAL' },
  { id: 'Scholarship' as Level | 'Scholarship', labelKey: 'pastPapersLevelScholarship' },
];

const MEDIUM_OPTIONS: Array<{ id: Medium; labelKey: TranslationKey }> = [
  { id: 'Sinhala', labelKey: 'pastPapersMediumSinhala' },
  { id: 'Tamil', labelKey: 'pastPapersMediumTamil' },
  { id: 'English', labelKey: 'pastPapersMediumEnglish' },
];

export default function CommunityPapersPage() {
  const { t } = useLanguage();
  const [papers, setPapers] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>('All');
  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [yearFilter, setYearFilter] = useState<string>('All');
  const [mediumFilter, setMediumFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    try {
      const q = query(
        collection(db, 'materials'),
        where('resourceCategory', 'in', [
          'past-paper',
          'model-paper',
          'marking-scheme',
        ])
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as Material)
      );
      data.sort((a, b) => {
        if ((b.examYear ?? 0) !== (a.examYear ?? 0)) {
          return (b.examYear ?? 0) - (a.examYear ?? 0);
        }
        return a.title.localeCompare(b.title);
      });
      setPapers(data);
    } catch (err) {
      console.error('Error loading community papers:', err);
    } finally {
      setLoading(false);
    }
  };

  const subjects = useMemo(() => {
    const s = new Set<string>();
    papers.forEach((p) => p.subject && s.add(p.subject));
    return Array.from(s).sort();
  }, [papers]);

  const years = useMemo(() => {
    const y = new Set<number>();
    papers.forEach((p) => p.examYear && y.add(p.examYear));
    return Array.from(y).sort((a, b) => b - a);
  }, [papers]);

  const filtered = useMemo(() => {
    return papers.filter((p) => {
      if (levelFilter !== 'All' && p.level !== levelFilter) return false;
      if (subjectFilter !== 'All' && p.subject !== subjectFilter) return false;
      if (yearFilter !== 'All' && String(p.examYear) !== yearFilter) return false;
      if (mediumFilter !== 'All' && p.medium !== mediumFilter) return false;
      if (categoryFilter !== 'All' && p.resourceCategory !== categoryFilter)
        return false;
      return true;
    });
  }, [papers, levelFilter, subjectFilter, yearFilter, mediumFilter, categoryFilter]);

  const grouped = useMemo(() => {
    const groups: Record<string, Material[]> = {};
    for (const p of filtered) {
      const key = p.examYear ? String(p.examYear) : 'Undated';
      (groups[key] ||= []).push(p);
    }
    return groups;
  }, [filtered]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{t('communityPapersTitle')}</h1>
          <p className="text-gray-600 mt-2">
            {t('communityPapersSubtitle')}
          </p>
        </div>

        <div className="card mb-6 bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-900">
            {t('communityPapersOfficialLink')}{' '}
            <Link href="/past-papers" className="font-medium underline hover:no-underline">
              /past-papers
            </Link>
          </p>
        </div>

        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="label">{t('level')}</label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="input-field"
              >
                <option value="All">{t('allLevels')}</option>
                {EXAM_LEVELS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {t(l.labelKey)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('subject')}</label>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="input-field"
              >
                <option value="All">{t('allSubjects')}</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('pastPapersYear')}</label>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="input-field"
              >
                <option value="All">{t('pastPapersAllYears')}</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('pastPapersMedium')}</label>
              <select
                value={mediumFilter}
                onChange={(e) => setMediumFilter(e.target.value)}
                className="input-field"
              >
                <option value="All">{t('pastPapersAllMediums')}</option>
                {MEDIUM_OPTIONS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {t(m.labelKey)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('pastPapersType')}</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="input-field"
              >
                <option value="All">{t('pastPapersAllTypes')}</option>
                <option value="past-paper">{t('pastPapersPastPaper')}</option>
                <option value="model-paper">{t('pastPapersModelPaper')}</option>
                <option value="marking-scheme">{t('pastPapersMarkingScheme')}</option>
              </select>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
            <Link href="/courses" className="btn-outline text-sm">
              {t('communityPapersUploadCta')}
            </Link>
          </div>
        </div>

        <AdSlot placement="footer" />

        {loading ? (
          <div className="card text-center py-12 text-gray-500">{t('pastPapersLoading')}</div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500">{t('pastPapersEmpty')}</p>
            <p className="text-sm text-gray-400 mt-2">
              {t('pastPapersEmptyHint')}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([year, list]) => (
              <section key={year}>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  {year === 'Undated' ? t('pastPapersUndatedYear') : year}
                </h2>
                <ul className="space-y-2">
                  {list.map((p) => {
                    const catClass =
                      CATEGORY_COLORS[p.resourceCategory ?? ''] ||
                      'bg-gray-100 text-gray-800';
                    const catKey = CATEGORY_LABEL_KEY[p.resourceCategory ?? ''];
                    const catLabel = catKey ? t(catKey) : t('pastPapersGenericPaper');
                    const fileHref = p.filePath
                      ? `/api/files/${p.filePath.split('/').pop()}`
                      : p.externalUrl;
                    return (
                      <li
                        key={p.id}
                        className="card flex items-center justify-between gap-4 p-4"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {p.title}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded ${catClass}`}>
                              {catLabel}
                            </span>
                            {p.level && (
                              <span className="text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded">
                                {p.level}
                              </span>
                            )}
                            {p.subject && (
                              <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
                                {p.subject}
                              </span>
                            )}
                            {p.medium && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                                {p.medium}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Link
                            href={`/courses/${p.courseId}`}
                            className="text-sm text-primary-600 hover:text-primary-700"
                          >
                            {t('pastPapersCourse')}
                          </Link>
                          {fileHref && (
                            <a
                              href={fileHref}
                              download={p.originalFileName}
                              target={p.externalUrl ? '_blank' : undefined}
                              rel={p.externalUrl ? 'noopener noreferrer' : undefined}
                              className="btn-outline text-sm"
                            >
                              {t('pastPapersOpen')}
                            </a>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
