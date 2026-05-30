'use client';

import { useMemo, useState } from 'react';
import Navbar from '@/components/Navbar';
import AdSlot from '@/components/AdSlot';
import {
  AL_STREAMS,
  UGC_CUTOFFS_SAMPLE,
  type ALStream,
} from '@/lib/sriLanka';
import { useLanguage } from '@/contexts/LanguageContext';

export default function UgcCutoffsPage() {
  const { t } = useLanguage();
  const [streamFilter, setStreamFilter] = useState<'All' | ALStream>('All');
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    return UGC_CUTOFFS_SAMPLE.filter((c) => {
      if (streamFilter !== 'All' && c.stream !== streamFilter) return false;
      if (search) {
        const hay = `${c.course} ${c.universities.join(' ')} ${c.district}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    }).sort((a, b) => b.minZScore - a.minZScore);
  }, [streamFilter, search]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('ugcCutoffsTitle')}</h1>
        <p className="text-gray-600 mt-2 mb-6">
          {t('ugcCutoffsSubtitle')}
        </p>

        <div className="card mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">{t('ugcCutoffsStreamLabel')}</label>
            <select
              value={streamFilter}
              onChange={(e) => setStreamFilter(e.target.value as 'All' | ALStream)}
              className="input-field"
            >
              <option value="All">{t('ugcCutoffsAllStreams')}</option>
              {AL_STREAMS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t('ugcCutoffsSearchLabel')}</label>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('ugcCutoffsSearchPlaceholder')}
              className="input-field"
            />
          </div>
        </div>

        <AdSlot placement="footer" />

        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-700">
                <th className="text-left py-2 pr-3">{t('ugcCutoffsColCourse')}</th>
                <th className="text-left py-2 px-3">{t('ugcCutoffsColUniversity')}</th>
                <th className="text-left py-2 px-3">{t('ugcCutoffsColStream')}</th>
                <th className="text-left py-2 px-3">{t('ugcCutoffsColDistrict')}</th>
                <th className="text-right py-2 pl-3">{t('ugcCutoffsColMinZScore')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2 pr-3 font-medium text-gray-900">{c.course}</td>
                  <td className="py-2 px-3">{c.universities.join(', ')}</td>
                  <td className="py-2 px-3 text-gray-600">{c.stream}</td>
                  <td className="py-2 px-3 text-gray-600">{c.district}</td>
                  <td className="py-2 pl-3 text-right font-mono text-gray-900">
                    {c.minZScore.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="text-center text-gray-500 py-6 text-sm">
              {t('ugcCutoffsNoEntries')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
