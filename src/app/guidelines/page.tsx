'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useLanguage } from '@/contexts/LanguageContext';

export default function GuidelinesPage() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
          {t('guidelinesTitle')}
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          {t('guidelinesSubtitle')}
        </p>

        <section className="space-y-8 text-gray-700">
          <Section title={t('guidelines1Title')}>
            <p>{t('guidelines1Body')}</p>
          </Section>

          <Section title={t('guidelines2Title')}>
            <p>{t('guidelines2Body')}</p>
          </Section>

          <Section title={t('guidelines3Title')}>
            <p>{t('guidelines3Body')}</p>
          </Section>

          <Section title={t('guidelines4Title')}>
            <p>{t('guidelines4Body')}</p>
          </Section>

          <Section title={t('guidelines5Title')}>
            <p>{t('guidelines5Body')}</p>
          </Section>

          <Section title={t('guidelines6Title')}>
            <p>{t('guidelines6Body')}</p>
          </Section>

          <Section title={t('guidelines7Title')}>
            <p>{t('guidelines7Body')}</p>
          </Section>

          <Section title={t('guidelines8Title')}>
            <p>
              {t('guidelines8Before')}{' '}
              <Link href="/contact" className="text-primary-600 hover:underline">
                {t('guidelines8Link')}
              </Link>
              {t('guidelines8After')}
            </p>
          </Section>
        </section>
      </main>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}
