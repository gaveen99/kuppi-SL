'use client';

import Link from 'next/link';
import type { ComponentType, CSSProperties } from 'react';
import {
  ExperimentOutlined,
  DotChartOutlined,
  BarChartOutlined,
  BgColorsOutlined,
  SettingOutlined,
  RiseOutlined,
  BookOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import Navbar from '@/components/Navbar';
import AdSlot from '@/components/AdSlot';
import { AL_STREAMS, AL_STREAM_SUBJECTS } from '@/lib/sriLanka';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/lib/translations';

type StreamIcon = ComponentType<{ className?: string; style?: CSSProperties }>;

// Note: Physical Science uses ExperimentOutlined (chemistry beaker, closest to atom).
// Biological Science uses DotChartOutlined to differentiate from Physical Science,
// per spec — both originals were lab-themed but we want visual distinction.
const STREAM_ICONS: Record<string, StreamIcon> = {
  'Physical Science': ExperimentOutlined,
  'Biological Science': DotChartOutlined,
  Commerce: BarChartOutlined,
  Arts: BgColorsOutlined,
  'Technology (Engineering)': SettingOutlined,
  'Technology (Biosystems)': RiseOutlined,
  Common: BookOutlined,
};

// Map AL_STREAMS keys -> i18n keys so we can render localized stream names.
const STREAM_NAME_KEYS: Record<string, TranslationKey> = {
  'Physical Science': 'streamsCardPhysicalScience',
  'Biological Science': 'streamsCardBiologicalScience',
  Commerce: 'streamsCardCommerce',
  Arts: 'streamsCardArts',
  'Technology (Engineering)': 'streamsCardTechnologyEngineering',
  'Technology (Biosystems)': 'streamsCardTechnologyBiosystems',
  Common: 'streamsCardCommon',
};

export default function StreamsPage() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('streamsTitle')}</h1>
        <p className="text-gray-600 mt-2 mb-6">
          {t('streamsSubtitle')}
        </p>

        <AdSlot placement="footer" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AL_STREAMS.map((stream) => {
            const subjects = AL_STREAM_SUBJECTS[stream] || [];
            const Icon = STREAM_ICONS[stream] ?? AppstoreOutlined;
            const nameKey = STREAM_NAME_KEYS[stream];
            const displayName = nameKey ? t(nameKey) : stream;
            return (
              <section key={stream} className="card">
                <div className="flex items-center gap-3 mb-3">
                  <Icon style={{ fontSize: '1.875rem' }} />
                  <h2 className="text-xl font-semibold text-gray-900">{displayName}</h2>
                </div>
                <ul className="space-y-1.5 mb-4">
                  {subjects.map((s) => (
                    <li key={s} className="text-sm text-gray-700 flex items-center gap-2">
                      <span className="text-primary-500">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/courses?stream=${encodeURIComponent(stream)}`}
                    className="btn-outline text-xs px-3 py-1.5"
                  >
                    {t('streamsBrowseCourses')}
                  </Link>
                  <Link
                    href={`/offers?stream=${encodeURIComponent(stream)}`}
                    className="btn-outline text-xs px-3 py-1.5"
                  >
                    {t('streamsFindTeachers')}
                  </Link>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
