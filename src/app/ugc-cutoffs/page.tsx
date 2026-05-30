import type { Metadata } from 'next';
import UgcCutoffsClient from './UgcCutoffsClient';

export const metadata: Metadata = {
  title: 'UGC Cut-off Marks — Sri Lankan University Course Z-scores',
  description:
    'Browse minimum Z-score cut-offs for Sri Lankan universities and courses. Filter by stream, district, and subject — based on UGC published data.',
  alternates: { canonical: '/ugc-cutoffs' },
  openGraph: {
    title: 'UGC Cut-off Marks — Sri Lankan University Course Z-scores',
    description:
      'Search Sri Lankan university course cut-offs by stream and district. Free reference for A/L students choosing degree programs.',
    url: '/ugc-cutoffs',
  },
};

export default function Page() {
  return <UgcCutoffsClient />;
}
