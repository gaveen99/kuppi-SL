import type { Metadata } from 'next';
import CoursesClient from './CoursesClient';

export const metadata: Metadata = {
  title: 'Free Courses — O/L, A/L & University for Sri Lankan Students',
  description:
    'Browse free online courses on Kuppi for Sri Lankan O/L, A/L, and university students. Filter by subject, level, medium, and district.',
  alternates: { canonical: '/courses' },
  openGraph: {
    title: 'Free Courses — O/L, A/L & University for Sri Lankan Students',
    description:
      'Free courses for Sri Lankan students. Browse by subject, exam level, language medium, and district.',
    url: '/courses',
  },
};

export default function Page() {
  return <CoursesClient />;
}
