'use client';

import { useMemo, useState } from 'react';
import Navbar from '@/components/Navbar';
import AdSlot from '@/components/AdSlot';
import {
  AL_STREAMS,
  AL_STREAM_SUBJECTS,
  UGC_CUTOFFS_SAMPLE,
  type ALStream,
} from '@/lib/sriLanka';
import { useLanguage } from '@/contexts/LanguageContext';

// Z = (x - mean) / stdev, averaged across 3 subjects.
// Users input raw mark (0-100) plus mean + stdev from the published island-wide
// statistics for that subject and year. We give sensible defaults but make
// everything editable.
interface SubjectInput {
  name: string;
  mark: string;
  mean: string;
  stdev: string;
}

const DEFAULT_STATS: Record<string, { mean: number; stdev: number }> = {
  'Combined Mathematics': { mean: 37, stdev: 25 },
  Physics: { mean: 40, stdev: 22 },
  Chemistry: { mean: 45, stdev: 23 },
  Biology: { mean: 43, stdev: 21 },
  'Information & Communication Technology': { mean: 50, stdev: 22 },
  Agriculture: { mean: 48, stdev: 20 },
  'Business Studies': { mean: 48, stdev: 20 },
  Accounting: { mean: 52, stdev: 21 },
  Economics: { mean: 45, stdev: 22 },
  'Business Statistics': { mean: 50, stdev: 21 },
  Sinhala: { mean: 55, stdev: 18 },
  Tamil: { mean: 52, stdev: 19 },
  English: { mean: 48, stdev: 19 },
  History: { mean: 52, stdev: 20 },
  Geography: { mean: 50, stdev: 20 },
  'Political Science': { mean: 48, stdev: 20 },
  Logic: { mean: 50, stdev: 21 },
  'Engineering Technology': { mean: 45, stdev: 22 },
  'Bio-systems Technology': { mean: 46, stdev: 22 },
  'Science for Technology': { mean: 47, stdev: 21 },
};

function computeZ(mark: number, mean: number, stdev: number): number | null {
  if (!Number.isFinite(mark) || !Number.isFinite(mean) || !Number.isFinite(stdev)) return null;
  if (stdev === 0) return null;
  return (mark - mean) / stdev;
}

export default function ZScorePage() {
  const { t } = useLanguage();
  const [stream, setStream] = useState<ALStream>('Biological Science');
  const firstThreeSubjects = (AL_STREAM_SUBJECTS[stream] || []).slice(0, 3);
  const [subjects, setSubjects] = useState<SubjectInput[]>(
    firstThreeSubjects.map((s) => ({
      name: s,
      mark: '',
      mean: String(DEFAULT_STATS[s]?.mean ?? 50),
      stdev: String(DEFAULT_STATS[s]?.stdev ?? 20),
    }))
  );

  const handleStreamChange = (next: ALStream) => {
    setStream(next);
    const nextSubjects = (AL_STREAM_SUBJECTS[next] || []).slice(0, 3);
    setSubjects(
      nextSubjects.map((s) => ({
        name: s,
        mark: '',
        mean: String(DEFAULT_STATS[s]?.mean ?? 50),
        stdev: String(DEFAULT_STATS[s]?.stdev ?? 20),
      }))
    );
  };

  const updateSubject = (index: number, field: keyof SubjectInput, value: string) => {
    setSubjects((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const overallZ = useMemo(() => {
    const zs = subjects
      .map((s) => computeZ(Number(s.mark), Number(s.mean), Number(s.stdev)))
      .filter((z): z is number => z !== null);
    if (zs.length === 0) return null;
    return zs.reduce((a, b) => a + b, 0) / zs.length;
  }, [subjects]);

  const courseMatches = useMemo(() => {
    if (overallZ === null) return [];
    return UGC_CUTOFFS_SAMPLE.filter(
      (c) => (c.stream === 'Any' || c.stream === stream) && overallZ >= c.minZScore
    ).sort((a, b) => b.minZScore - a.minZScore);
  }, [overallZ, stream]);

  const closeMisses = useMemo(() => {
    if (overallZ === null) return [];
    return UGC_CUTOFFS_SAMPLE.filter(
      (c) =>
        (c.stream === 'Any' || c.stream === stream) &&
        overallZ < c.minZScore &&
        c.minZScore - overallZ <= 0.2
    ).sort((a, b) => a.minZScore - b.minZScore);
  }, [overallZ, stream]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{t('zScoreTitle')}</h1>
          <p className="text-gray-600 mt-2">
            {t('zScoreSubtitle')}
          </p>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-3">
            {t('zScoreDisclaimer')}
          </p>
        </div>

        <div className="card mb-6">
          <label className="label">{t('zScoreStreamLabel')}</label>
          <select
            value={stream}
            onChange={(e) => handleStreamChange(e.target.value as ALStream)}
            className="input-field md:max-w-sm"
          >
            {AL_STREAMS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="card mb-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-3 font-semibold text-gray-700">{t('zScoreColSubject')}</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-700">{t('zScoreColYourMark')}</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-700">{t('zScoreColIslandMean')}</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-700">{t('zScoreColStdDev')}</th>
                <th className="text-right py-2 pl-3 font-semibold text-gray-700">{t('zScoreColZ')}</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s, i) => {
                const z = computeZ(Number(s.mark), Number(s.mean), Number(s.stdev));
                return (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 pr-3">
                      <input
                        value={s.name}
                        onChange={(e) => updateSubject(i, 'name', e.target.value)}
                        className="input-field text-sm"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={s.mark}
                        onChange={(e) => updateSubject(i, 'mark', e.target.value)}
                        className="input-field text-sm w-24"
                        placeholder={t('zScoreInputMarkPlaceholder')}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        value={s.mean}
                        onChange={(e) => updateSubject(i, 'mean', e.target.value)}
                        className="input-field text-sm w-24"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        value={s.stdev}
                        onChange={(e) => updateSubject(i, 'stdev', e.target.value)}
                        className="input-field text-sm w-24"
                      />
                    </td>
                    <td className="py-2 pl-3 text-right font-mono text-gray-900">
                      {z === null ? '—' : z.toFixed(4)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="card mb-6 bg-primary-50 border-primary-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-primary-900">{t('zScoreInputAggregate')}</h2>
              <p className="text-xs text-primary-700">{t('zScoreInputAggregateHelp')}</p>
            </div>
            <p className="text-4xl font-bold text-primary-900 font-mono">
              {overallZ === null ? '—' : overallZ.toFixed(4)}
            </p>
          </div>
        </div>

        <AdSlot placement="footer" />

        {overallZ !== null && (
          <>
            <section className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                {t('zScoreCoursesHeading')}
              </h2>
              {courseMatches.length === 0 ? (
                <div className="card text-sm text-gray-500">
                  {t('zScoreNoMatches')}
                </div>
              ) : (
                <ul className="space-y-2">
                  {courseMatches.map((c, i) => (
                    <li key={i} className="card flex items-center justify-between p-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {c.course} · {c.universities.join(', ')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {t('zScoreCutoffLabel')} {c.minZScore.toFixed(4)} · {t('zScoreDistrictLabel')} {c.district}
                        </p>
                      </div>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        {t('zScoreAboveCutoff')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {closeMisses.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  {t('zScoreCloseMissesHeading')}
                </h2>
                <ul className="space-y-2">
                  {closeMisses.map((c, i) => (
                    <li key={i} className="card flex items-center justify-between p-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {c.course} · {c.universities.join(', ')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {t('zScoreCutoffLabel')} {c.minZScore.toFixed(4)} · {t('zScoreGapLabel')} {(c.minZScore - overallZ).toFixed(4)}
                        </p>
                      </div>
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                        {t('zScoreBelowCutoff')}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
