import type { Metadata } from 'next';
import ScholarshipClient from './ScholarshipClient';

export const metadata: Metadata = {
  title: 'Grade 5 Scholarship Hub — Past Papers & Free Resources',
  description:
    'Free Grade 5 Scholarship Examination resources for Sri Lankan students: past papers, model papers, and exam guidance in Sinhala, Tamil, and English.',
  alternates: { canonical: '/scholarship' },
  openGraph: {
    title: 'Grade 5 Scholarship Hub — Past Papers & Free Resources',
    description:
      'Past papers, model papers, and exam prep for the Sri Lankan Grade 5 Scholarship Examination.',
    url: '/scholarship',
  },
};

export default function Page() {
  return <ScholarshipClient />;
}
