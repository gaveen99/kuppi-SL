'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AboutPage() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
          {t('aboutTitle')}
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          {t('aboutSubtitle')}
        </p>

        <section className="prose max-w-none text-gray-700 space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">{t('aboutMissionTitle')}</h2>
          <p>
            {t('aboutMissionBody')}
          </p>

          <h2 className="text-2xl font-bold text-gray-900">
            {t('aboutWhatYouCanDoTitle')}
          </h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t('aboutWhatYouCanDo1')}</li>
            <li>{t('aboutWhatYouCanDo2')}</li>
            <li>{t('aboutWhatYouCanDo3')}</li>
            <li>{t('aboutWhatYouCanDo4')}</li>
            <li>{t('aboutWhatYouCanDo5')}</li>
            <li>{t('aboutWhatYouCanDo6')}</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900">
            {t('aboutFreeTitle')}
          </h2>
          <p>
            {t('aboutFreeBody')}
          </p>

          <h2 className="text-2xl font-bold text-gray-900">{t('aboutGetInvolvedTitle')}</h2>
          <p>
            {t('aboutGetInvolvedBefore')}{' '}
            <Link href="/contact" className="text-primary-600 hover:underline">
              {t('aboutGetInvolvedLink')}
            </Link>
            {t('aboutGetInvolvedAfter')}
          </p>
        </section>
      </main>
    </div>
  );
}
