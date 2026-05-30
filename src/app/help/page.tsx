'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useLanguage } from '@/contexts/LanguageContext';

interface FAQ {
  q: string;
  a: React.ReactNode;
}

export default function HelpPage() {
  const { t } = useLanguage();

  const FAQS: FAQ[] = [
    {
      q: t('helpFaq1Q'),
      a: t('helpFaq1A'),
    },
    {
      q: t('helpFaq2Q'),
      a: (
        <>
          {t('helpFaq2ABefore')}{' '}
          <Link href="/auth/login" className="text-primary-600 hover:underline">
            {t('helpFaq2ALink')}
          </Link>{' '}
          {t('helpFaq2AAfter')}
        </>
      ),
    },
    {
      q: t('helpFaq3Q'),
      a: (
        <>
          {t('helpFaq3ABefore')}{' '}
          <Link href="/teach" className="text-primary-600 hover:underline">
            {t('helpFaq3ALink')}
          </Link>{' '}
          {t('helpFaq3AAfter')}
        </>
      ),
    },
    {
      q: t('helpFaq4Q'),
      a: (
        <>
          {t('helpFaq4ABrowse')}{' '}
          <Link href="/offers" className="text-primary-600 hover:underline">
            {t('helpFaq4AOffersLink')}
          </Link>{' '}
          {t('helpFaq4AForTeachers')}{' '}
          <Link href="/requests" className="text-primary-600 hover:underline">
            {t('helpFaq4ARequestsLink')}
          </Link>
          {t('helpFaq4AForQuestions')}{' '}
          <Link href="/qa" className="text-primary-600 hover:underline">
            {t('helpFaq4AQaLink')}
          </Link>
          {t('helpFaq4AEnd')}
        </>
      ),
    },
    {
      q: t('helpFaq5Q'),
      a: t('helpFaq5A'),
    },
    {
      q: t('helpFaq6Q'),
      a: (
        <>
          {t('helpFaq6ABefore')}{' '}
          <Link href="/profile" className="text-primary-600 hover:underline">
            {t('helpFaq6ALink')}
          </Link>{' '}
          {t('helpFaq6AAfter')}
        </>
      ),
    },
    {
      q: t('helpFaq7Q'),
      a: (
        <>
          {t('helpFaq7ABefore')}{' '}
          <Link href="/contact" className="text-primary-600 hover:underline">
            {t('helpFaq7ALink')}
          </Link>{' '}
          {t('helpFaq7AAfter')}
        </>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
          {t('helpTitle')}
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          {t('helpIntroBefore')}{' '}
          <Link href="/contact" className="text-primary-600 hover:underline">
            {t('helpIntroLink')}
          </Link>
          {t('helpIntroAfter')}
        </p>

        <div className="space-y-4">
          {FAQS.map((f, i) => (
            <details
              key={i}
              className="card cursor-pointer group"
            >
              <summary className="flex items-center justify-between font-semibold text-gray-900 list-none">
                <span>{f.q}</span>
                <span className="text-primary-600 group-open:rotate-180 transition-transform">
                  ▾
                </span>
              </summary>
              <div className="pt-3 text-gray-700 leading-relaxed">{f.a}</div>
            </details>
          ))}
        </div>
      </main>
    </div>
  );
}
