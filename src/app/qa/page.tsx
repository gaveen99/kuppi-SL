import type { Metadata } from 'next';
import QAListClient from './QAListClient';

export const metadata: Metadata = {
  title: 'Student Q&A — Ask Sri Lankan Tutors Free',
  description:
    'Ask exam questions and get answers from Sri Lankan students and tutors. Free, community-driven Q&A for O/L, A/L, and university subjects.',
  alternates: { canonical: '/qa' },
  openGraph: {
    title: 'Student Q&A — Ask Sri Lankan Tutors Free',
    description:
      'Free Q&A community for Sri Lankan O/L, A/L, and university students. Ask, answer, and learn together.',
    url: '/qa',
  },
};

export default function Page() {
  return <QAListClient />;
}
