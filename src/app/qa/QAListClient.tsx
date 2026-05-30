'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CheckOutlined } from '@ant-design/icons';
import Navbar from '@/components/Navbar';
import AdSlot from '@/components/AdSlot';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { QAQuestion, Level } from '@/types';

export default function QAListPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [questions, setQuestions] = useState<QAQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<Level | 'All'>('All');
  const [sortBy, setSortBy] = useState<'new' | 'top'>('new');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'qaQuestions'), orderBy('createdAt', 'desc'))
        );
        setQuestions(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as QAQuestion))
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const visible = useMemo(() => {
    let list = [...questions];
    if (levelFilter !== 'All') list = list.filter((q) => q.level === levelFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((q) => {
        const hay = `${q.title} ${q.body} ${q.subject ?? ''}`.toLowerCase();
        return hay.includes(s);
      });
    }
    if (sortBy === 'top') list.sort((a, b) => b.upvotes - a.upvotes);
    return list;
  }, [questions, levelFilter, search, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('qaListTitle')}</h1>
            <p className="text-gray-600 mt-2">
              {t('qaListSubtitle')}
            </p>
          </div>
          {user && (
            <Link href="/qa/ask" className="btn-primary">
              {t('qaListAskButton')}
            </Link>
          )}
        </div>

        <div className="card mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="search"
            placeholder={t('qaListSearchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
          />
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as Level | 'All')}
            className="input-field"
          >
            <option value="All">{t('allLevels')}</option>
            <option value="OL">{t('ol')}</option>
            <option value="AL">{t('al')}</option>
            <option value="Undergraduate">{t('undergraduate')}</option>
            <option value="Masters">{t('masters')}</option>
            <option value="Other">{t('other')}</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'new' | 'top')}
            className="input-field"
          >
            <option value="new">{t('qaListSortNewest')}</option>
            <option value="top">{t('qaListSortTopVoted')}</option>
          </select>
        </div>

        <AdSlot placement="footer" />

        {loading ? (
          <div className="card text-center py-12 text-gray-500">{t('qaListLoading')}</div>
        ) : visible.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500">{t('qaListEmpty')}</p>
            {user && (
              <Link
                href="/qa/ask"
                className="btn-primary inline-block mt-4"
              >
                {t('qaListBeFirst')}
              </Link>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map((q) => (
              <li key={q.id} className="card p-4">
                <Link href={`/qa/${q.id}`} className="block">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900">{q.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">{q.body}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {q.level && (
                          <span className="text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded">
                            {q.level}
                          </span>
                        )}
                        {q.subject && (
                          <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
                            {q.subject}
                          </span>
                        )}
                        {q.answeredByTeacher && (
                          <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                            <CheckOutlined /> {t('qaListTeacherAnswered')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {t('qaListAskedBy')} {q.authorName}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-gray-900">{q.upvotes}</p>
                      <p className="text-[10px] uppercase text-gray-500">{t('qaListVotes')}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {q.answerCount} {q.answerCount === 1 ? t('qaListAnswerSingular') : t('qaListAnswerPlural')}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
