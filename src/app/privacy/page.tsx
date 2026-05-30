'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PrivacyPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
          {t('privacyTitle')}
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          {t('privacyLastUpdated')}
        </p>

        <section className="space-y-6 text-gray-700 leading-relaxed">
          <p>{t('privacyIntro')}</p>

          <Block title={t('privacy1Title')}>
            <p>{t('privacy1Body1')}</p>
            <p className="mt-3">{t('privacy1Body2')}</p>
            <p className="mt-3">{t('privacy1Body3')}</p>
          </Block>

          <Block title={t('privacy2Title')}>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t('privacy2Item1')}</li>
              <li>{t('privacy2Item2')}</li>
              <li>{t('privacy2Item3')}</li>
              <li>
                {t('privacy2Item4Before')}{' '}
                <Link href="/guidelines" className="text-primary-600 hover:underline">
                  {t('privacy2Item4Link')}
                </Link>
                {t('privacy2Item4After')}
              </li>
            </ul>
          </Block>

          <Block title={t('privacy3Title')}>
            <p>{t('privacy3Intro')}</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>
                <strong>{t('privacy3FirebaseBold')}</strong> {t('privacy3FirebaseText')}
              </li>
              <li>
                <strong>{t('privacy3AdSenseBold')}</strong> {t('privacy3AdSenseText')}
              </li>
              <li>
                <strong>{t('privacy3EmailBold')}</strong> {t('privacy3EmailText')}
              </li>
            </ul>
          </Block>

          <Block title={t('privacy4Title')}>
            <p>{t('privacy4Body')}</p>
          </Block>

          <Block title={t('privacy5Title')}>
            <p>
              {t('privacy5Before')}{' '}
              <Link href="/contact" className="text-primary-600 hover:underline">
                {t('privacy5Link')}
              </Link>
              {t('privacy5After')}
            </p>
          </Block>

          <Block title={t('privacy6Title')}>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                {t('privacy6Item1Before')}{' '}
                <Link href="/profile" className="text-primary-600 hover:underline">
                  {t('privacy6Item1Link')}
                </Link>
                {t('privacy6Item1After')}
              </li>
              <li>{t('privacy6Item2')}</li>
              <li>
                {t('privacy6Item3Before')}{' '}
                <a
                  href="mailto:hello@your-domain.com"
                  className="text-primary-600 hover:underline"
                >
                  hello@your-domain.com
                </a>
                {t('privacy6Item3After')}
              </li>
            </ul>
          </Block>

          <Block title={t('privacy7Title')}>
            <p>
              {t('privacy7Before')}{' '}
              <a
                href="mailto:report@your-domain.com"
                className="text-primary-600 hover:underline"
              >
                report@your-domain.com
              </a>
              {t('privacy7After')}
            </p>
          </Block>

          <Block title={t('privacy8Title')}>
            <p>{t('privacy8Body')}</p>
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
