import type { Metadata } from 'next';
import PastPapersClient from './PastPapersClient';

export const metadata: Metadata = {
  title: 'O/L & A/L Past Papers — Free Download for Sri Lankan Students',
  description:
    'Download free O/L, A/L, and Grade 5 Scholarship past papers, model papers, and marking schemes in Sinhala, Tamil, and English. Sourced from the Department of Examinations, Sri Lanka.',
  alternates: { canonical: '/past-papers' },
  openGraph: {
    title: 'O/L & A/L Past Papers — Free Download for Sri Lankan Students',
    description:
      'Free past papers, model papers, and marking schemes for Sri Lankan O/L, A/L, and Grade 5 Scholarship students.',
    url: '/past-papers',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Past Papers Archive — Kuppi',
  description:
    'Past papers, model papers, and marking schemes for GCE Ordinary Level, GCE Advanced Level, and Grade 5 Scholarship Examination in Sri Lanka.',
  url: 'https://your-domain.com/past-papers',
  inLanguage: ['en', 'si', 'ta'],
  isPartOf: {
    '@type': 'WebSite',
    name: 'Kuppi',
    url: 'https://your-domain.com',
  },
  about: [
    {
      '@type': 'EducationalOccupationalProgram',
      name: 'GCE Ordinary Level (Sri Lanka)',
    },
    {
      '@type': 'EducationalOccupationalProgram',
      name: 'GCE Advanced Level (Sri Lanka)',
    },
    {
      '@type': 'EducationalOccupationalProgram',
      name: 'Grade 5 Scholarship Examination (Sri Lanka)',
    },
  ],
  sourceOrganization: {
    '@type': 'GovernmentOrganization',
    name: 'Department of Examinations, Sri Lanka',
    url: 'https://doenets.lk',
  },
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        // Safe: this is a static literal under our control.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PastPapersClient />
    </>
  );
}
