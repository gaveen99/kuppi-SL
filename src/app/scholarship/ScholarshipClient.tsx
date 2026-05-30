'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import AdSlot from '@/components/AdSlot';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { EXAM_TARGETS } from '@/lib/sriLanka';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Course, Material } from '@/types';

export default function ScholarshipHubPage() {
  const { t } = useLanguage();
  const [papers, setPapers] = useState<Material[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const target = EXAM_TARGETS.find((e) => e.id === 'scholarship-2026');

  useEffect(() => {
    (async () => {
      try {
        // Past papers explicitly tagged for the Grade 5 Scholarship.
        const papersSnap = await getDocs(
          query(
            collection(db, 'materials'),
            where('resourceCategory', 'in', ['past-paper', 'model-paper'])
          )
        );
        const papersData = papersSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Material))
          .filter((p) => {
            const hay = `${p.title ?? ''} ${p.subject ?? ''}`.toLowerCase();
            return (
              hay.includes('scholarship') ||
              hay.includes('shishyathwa') ||
              hay.includes('ශිෂ්‍යත්ව') ||
              hay.includes('grade 5')
            );
          });
        setPapers(papersData);

        // Courses that mention scholarship in the title / description.
        const coursesSnap = await getDocs(
          query(collection(db, 'courses'), where('isPublished', '==', true), limit(100))
        );
        const coursesData = coursesSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Course))
          .filter((c) => {
            const hay = `${c.title} ${c.description}`.toLowerCase();
            return (
              hay.includes('scholarship') ||
              hay.includes('shishyathwa') ||
              hay.includes('grade 5')
            );
          });
        setCourses(coursesData);
      } catch (err) {
        console.error('Scholarship hub load failed', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const daysLeft = target
    ? Math.max(
        0,
        Math.ceil(
          (new Date(target.target).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      )
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card mb-6 bg-gradient-to-br from-primary-50 to-white border-primary-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-primary-900">
                {t('scholarshipTitle')}
              </h1>
              <p className="text-primary-800 mt-2 max-w-2xl">
                {t('scholarshipSubtitle')}
              </p>
            </div>
            {daysLeft !== null && (
              <div className="text-center rounded-xl bg-white border border-primary-200 px-6 py-4 shadow-sm">
                <p className="text-5xl font-bold text-primary-900">{daysLeft}</p>
                <p className="text-xs uppercase tracking-wide text-primary-700 mt-1">
                  {t('scholarshipDaysToExam')}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                {t('scholarshipPapersHeading')}
              </h2>
              {loading ? (
                <p className="text-gray-500 text-sm">{t('scholarshipLoadingPapers')}</p>
              ) : papers.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  {t('scholarshipNoPapers')}
                </p>
              ) : (
                <ul className="space-y-2">
                  {papers.slice(0, 15).map((p) => {
                    const href = p.filePath
                      ? `/api/files/${p.filePath.split('/').pop()}`
                      : p.externalUrl;
                    return (
                      <li
                        key={p.id}
                        className="flex items-center justify-between border-b border-gray-100 last:border-0 py-2"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {p.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {p.examYear ?? '—'} · {p.medium ?? ''}
                          </p>
                        </div>
                        {href && (
                          <a
                            href={href}
                            download={p.originalFileName}
                            target={p.externalUrl ? '_blank' : undefined}
                            rel={p.externalUrl ? 'noopener noreferrer' : undefined}
                            className="btn-outline text-sm"
                          >
                            {t('scholarshipOpenPaper')}
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              <Link
                href="/past-papers"
                className="inline-block mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {t('scholarshipSeeAllPapers')}
              </Link>
            </section>

            <section className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                {t('scholarshipClassesHeading')}
              </h2>
              {loading ? (
                <p className="text-gray-500 text-sm">{t('scholarshipLoadingClasses')}</p>
              ) : courses.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  {t('scholarshipNoClasses')}
                </p>
              ) : (
                <ul className="grid sm:grid-cols-2 gap-3">
                  {courses.slice(0, 6).map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/courses/${c.id}`}
                        className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <p className="font-medium text-gray-900">{c.title}</p>
                        <p className="text-xs text-gray-500">{t('scholarshipCourseByPrefix')} {c.teacherName}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <AdSlot placement="sidebar" />

            <div className="card text-sm">
              <h3 className="font-semibold text-gray-900 mb-2">{t('scholarshipQuickLinks')}</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/past-papers" className="text-primary-600 hover:underline">
                    {t('scholarshipQuickLinkPastPapers')}
                  </Link>
                </li>
                <li>
                  <Link href="/learn" className="text-primary-600 hover:underline">
                    {t('scholarshipQuickLinkLearn')}
                  </Link>
                </li>
                <li>
                  <Link href="/offers" className="text-primary-600 hover:underline">
                    {t('scholarshipQuickLinkOffers')}
                  </Link>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
