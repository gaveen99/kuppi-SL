'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TermsPage() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
          {t('termsTitle')}
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          {t('termsLastUpdated')}
        </p>

        <section className="space-y-6 text-gray-700 leading-relaxed">
          <p>
            {t('termsIntro')}
          </p>

          <Block title={t('terms1Title')}>
            <p>{t('terms1Body')}</p>
          </Block>

          <Block title={t('terms2Title')}>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t('terms2Item1')}</li>
              <li>{t('terms2Item2')}</li>
              <li>{t('terms2Item3')}</li>
            </ul>
          </Block>

          <Block title={t('terms3Title')}>
            <p>
              {t('terms3Before')}{' '}
              <Link href="/guidelines" className="text-primary-600 hover:underline">
                {t('terms3Link')}
              </Link>
              {t('terms3After')}
            </p>
          </Block>

          <Block title={t('terms4Title')}>
            <p>
              {t('terms4Body1')}
            </p>
            <p className="mt-3">
              {t('terms4Body2')}
            </p>
          </Block>

          <Block title={t('terms5Title')}>
            <p>
              {t('terms5Body')}
            </p>
          </Block>

          <Block title={t('terms6Title')}>
            <p>
              {t('terms6Body')}
            </p>
          </Block>

          <Block title={t('terms7Title')}>
            <p>
              {t('terms7Body')}
            </p>
          </Block>

          <Block title={t('terms8Title')}>
            <p>
              {t('terms8Before')}{' '}
              <a
                href="mailto:hello@your-domain.com"
                className="text-primary-600 hover:underline"
              >
                hello@your-domain.com
              </a>
              {t('terms8After')}{' '}
              <Link href="/guidelines" className="text-primary-600 hover:underline">
                {t('terms8GuidelinesLink')}
              </Link>
              {t('terms8End')}
            </p>
          </Block>

          <Block title={t('terms9Title')}>
            <p>
              {t('terms9Body')}
            </p>
          </Block>

          <Block title={t('terms10Title')}>
            <p>
              {t('terms10Body')}
            </p>
          </Block>

          <Block title={t('terms11Title')}>
            <p>
              {t('terms11Before')}{' '}
              <Link href="/contact" className="text-primary-600 hover:underline">
                {t('terms11Link')}
              </Link>
              {t('terms11After')}
            </p>
          </Block>
        </section>
      </main>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
      {children}
    </div>
  );
}
