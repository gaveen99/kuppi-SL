import type { Metadata } from 'next';
import StreamsClient from './StreamsClient';

export const metadata: Metadata = {
  title: 'A/L Subject Streams Guide — Physical Science, Bio, Commerce, Arts',
  description:
    'Explore Sri Lankan A/L streams — Physical Science, Biological Science, Commerce, Arts, and Technology. See subjects, careers, and find tutors for each.',
  alternates: { canonical: '/streams' },
  openGraph: {
    title: 'A/L Subject Streams Guide — Physical Science, Bio, Commerce, Arts',
    description:
      'Pick your Sri Lankan A/L stream. Subjects, career paths, and tutors for Physical Science, Bio, Commerce, Arts, and Technology streams.',
    url: '/streams',
  },
};

export default function Page() {
  return <StreamsClient />;
}
