import type { Metadata } from 'next';
import CommunityPapersClient from './CommunityPapersClient';

export const metadata: Metadata = {
  title: 'Community Uploads — Student & Teacher Past Papers on Kuppi',
  description:
    'Browse past papers, model papers, and marking schemes shared by Kuppi teachers and students. Community-uploaded resources curated by the Sri Lankan learning community — separate from the official Department of Examinations catalog.',
  alternates: { canonical: '/community-papers' },
  openGraph: {
    title: 'Community Uploads — Student & Teacher Past Papers on Kuppi',
    description:
      'Community-contributed past papers, model papers, and marking schemes from Kuppi teachers and students. Looking for the official DOE catalog? Visit /past-papers.',
    url: '/community-papers',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Community Uploads — Kuppi',
  description:
    'User-contributed past papers, model papers, and marking schemes uploaded by Kuppi teachers and students. This corner of the marketplace surfaces community resources separately from the official Department of Examinations catalog.',
  url: 'https://your-domain.com/community-papers',
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
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        // Safe: this is a static literal under our control.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CommunityPapersClient />
    </>
  );
}
