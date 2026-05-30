import type { Metadata } from 'next';
import ZScoreClient from './ZScoreClient';

export const metadata: Metadata = {
  title: 'Z-Score Calculator for A/L — Sri Lankan Students',
  description:
    'Free Z-score calculator for Sri Lankan A/L students. Estimate your Z-score from raw marks using published subject means and standard deviations.',
  alternates: { canonical: '/z-score' },
  openGraph: {
    title: 'Z-Score Calculator for A/L — Sri Lankan Students',
    description:
      'Free Z-score calculator for Sri Lankan A/L students. Estimate your university entry Z-score in seconds.',
    url: '/z-score',
  },
};

export default function Page() {
  return <ZScoreClient />;
}
