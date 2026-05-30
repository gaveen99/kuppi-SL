'use client';

import Link from 'next/link';
import {
  BookOutlined,
  BarChartOutlined,
  AimOutlined,
  ReadOutlined,
  CompassOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import Navbar from '@/components/Navbar';
import { AdBanner } from '@/components/ads';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Course, TeacherOffer, LearnRequest, Announcement } from '@/types';

export default function Home() {
  const { t } = useLanguage();
  const [featuredCourses, setFeaturedCourses] = useState<Course[]>([]);
  const [teacherOffers, setTeacherOffers] = useState<TeacherOffer[]>([]);
  const [learnRequests, setLearnRequests] = useState<LearnRequest[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch featured courses
        const coursesQuery = query(
          collection(db, 'courses'),
          where('isPublished', '==', true),
          orderBy('createdAt', 'desc'),
          limit(3)
        );
        const coursesSnapshot = await getDocs(coursesQuery);
        const courses = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        setFeaturedCourses(courses);

        // Fetch latest teacher offers
        const offersQuery = query(
          collection(db, 'teacherOffers'),
          where('isActive', '==', true),
          orderBy('createdAt', 'desc'),
          limit(3)
        );
        const offersSnapshot = await getDocs(offersQuery);
        const offers = offersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeacherOffer));
        setTeacherOffers(offers);

        // Fetch latest learn requests
        const requestsQuery = query(
          collection(db, 'learnRequests'),
          where('isActive', '==', true),
          orderBy('createdAt', 'desc'),
          limit(3)
        );
        const requestsSnapshot = await getDocs(requestsQuery);
        const requests = requestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LearnRequest));
        setLearnRequests(requests);

        // Fetch latest announcements
        const announcementsQuery = query(
          collection(db, 'announcements'),
          orderBy('createdAt', 'desc'),
          limit(3)
        );
        const announcementsSnapshot = await getDocs(announcementsQuery);
        const announcements = announcementsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
        setAnnouncements(announcements);
      } catch (error: any) {
        console.error('Error fetching data:', error);
        setError(error?.message || 'Failed to load data. Please check Firebase setup.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-white pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className="absolute inset-0 bg-hero-pattern opacity-5"></div>
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-primary-100 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-96 h-96 bg-secondary-100 rounded-full blur-3xl opacity-50"></div>
          
          <div className="container-custom relative z-10">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-medium mb-6 border border-primary-100">
                <span className="flex h-2 w-2 rounded-full bg-primary-600 mr-2"></span>
                {t('homeHeroBadge')}
              </div>
              <h1 className="text-5xl md:text-7xl font-display font-bold text-gray-900 tracking-tight mb-6 leading-tight">
                {t('homeHeroTitlePart1')} <span className="text-primary-600 relative">
                  {t('homeHeroTitleHighlight')}
                  <svg className="absolute w-full h-3 -bottom-1 left-0 text-primary-200 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                    <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                  </svg>
                </span>
              </h1>
              <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                {t('homeHeroSubtitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/courses" className="btn-primary text-lg px-8 py-4 w-full sm:w-auto">
                  {t('homeHeroCTABrowse')}
                </Link>
                <Link href="/offers" className="btn-secondary text-lg px-8 py-4 w-full sm:w-auto">
                  {t('homeHeroCTAFind')}
                </Link>
              </div>
              
            </div>
          </div>
        </section>

        {/* What Kuppi is — honest pillars, no unverifiable stats */}
        <section className="py-12 bg-primary-900 text-white">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div className="p-4">
                <div className="text-3xl font-bold font-display mb-2 text-accent-400">{t('homePillarFreeNumber')}</div>
                <div className="text-primary-200 text-sm">{t('homePillarFreeLabel')}</div>
              </div>
              <div className="p-4">
                <div className="text-3xl font-bold font-display mb-2 text-accent-400">{t('homePillarLevelsNumber')}</div>
                <div className="text-primary-200 text-sm">{t('homePillarLevelsLabel')}</div>
              </div>
              <div className="p-4">
                <div className="text-3xl font-bold font-display mb-2 text-accent-400">{t('homePillarLangNumber')}</div>
                <div className="text-primary-200 text-sm">{t('homePillarLangLabel')}</div>
              </div>
              <div className="p-4">
                <div className="text-3xl font-bold font-display mb-2 text-accent-400">{t('homePillarCommunityNumber')}</div>
                <div className="text-primary-200 text-sm">{t('homePillarCommunityLabel')}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Sri Lanka-specific tools */}
        <section className="py-16 bg-white">
          <div className="container-custom">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold font-display text-gray-900 mb-3">
                {t('homeToolsHeading')}
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                {t('homeToolsSubheading')}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <Link href="/past-papers" className="card p-4 text-center hover:shadow-lg transition-shadow">
                <BookOutlined className="mb-2" style={{ fontSize: '1.875rem' }} />
                <p className="font-semibold text-gray-900 text-sm">{t('homeToolPastPapers')}</p>
              </Link>
              <Link href="/z-score" className="card p-4 text-center hover:shadow-lg transition-shadow">
                <BarChartOutlined className="mb-2" style={{ fontSize: '1.875rem' }} />
                <p className="font-semibold text-gray-900 text-sm">{t('homeToolZScore')}</p>
              </Link>
              <Link href="/ugc-cutoffs" className="card p-4 text-center hover:shadow-lg transition-shadow">
                <AimOutlined className="mb-2" style={{ fontSize: '1.875rem' }} />
                <p className="font-semibold text-gray-900 text-sm">{t('homeToolUGC')}</p>
              </Link>
              <Link href="/scholarship" className="card p-4 text-center hover:shadow-lg transition-shadow">
                <ReadOutlined className="mb-2" style={{ fontSize: '1.875rem' }} />
                <p className="font-semibold text-gray-900 text-sm">{t('homeToolScholarship')}</p>
              </Link>
              <Link href="/streams" className="card p-4 text-center hover:shadow-lg transition-shadow">
                <CompassOutlined className="mb-2" style={{ fontSize: '1.875rem' }} />
                <p className="font-semibold text-gray-900 text-sm">{t('homeToolStreams')}</p>
              </Link>
              <Link href="/qa" className="card p-4 text-center hover:shadow-lg transition-shadow">
                <MessageOutlined className="mb-2" style={{ fontSize: '1.875rem' }} />
                <p className="font-semibold text-gray-900 text-sm">{t('homeToolQA')}</p>
              </Link>
            </div>
          </div>
        </section>

        {/* Featured Courses */}
        <section className="py-20 bg-gray-50">
          <div className="container-custom">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="text-3xl font-bold font-display text-gray-900 mb-4">{t('homeFeaturedHeading')}</h2>
                <p className="text-gray-600 max-w-xl">{t('homeFeaturedIntro')}</p>
              </div>
              <Link href="/courses" className="hidden md:flex items-center text-primary-600 font-semibold hover:text-primary-700">
                {t('homeFeaturedViewAll')}
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-80 bg-gray-200 rounded-2xl animate-pulse"></div>
                ))}
              </div>
            ) : featuredCourses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
                <BookOutlined className="mb-3" style={{ fontSize: '2.25rem' }} />
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t('homeFeaturedEmptyTitle')}</h3>
                <p className="text-gray-600 max-w-md mx-auto mb-6">
                  {t('homeFeaturedEmptyBody')}
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <Link href="/past-papers" className="btn-secondary">{t('homeFeaturedEmptyBrowse')}</Link>
                  <Link href="/teach" className="btn-primary">{t('homeFeaturedEmptyTeach')}</Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {featuredCourses.map((course) => (
                  <Link href={`/courses/${course.id}`} key={course.id} className="group">
                    <div className="card h-full flex flex-col">
                      <div className="h-48 bg-gray-200 relative overflow-hidden">
                        {/* Placeholder for course image if not available */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center text-primary-300">
                          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                        </div>
                      </div>
                      <div className="p-6 flex-grow flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 bg-primary-50 px-2 py-1 rounded-md">
                            {course.category}
                          </span>
                          <span className="text-sm text-gray-500">{course.level}</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors line-clamp-2">
                          {course.title}
                        </h3>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-grow">
                          {course.description}
                        </p>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-gray-200 mr-2"></div>
                            <span className="text-sm font-medium text-gray-700">{t('homeInstructor')}</span>
                          </div>
                          <span className="text-lg font-bold text-primary-600">
                            {t('homeFree')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            
            <div className="mt-8 text-center md:hidden">
              <Link href="/courses" className="btn-secondary w-full">{t('homeViewAllMobile')}</Link>
            </div>
          </div>
        </section>

        {/* Ad Banner */}
        <div className="container-custom py-8">
          <AdBanner type="horizontal" />
        </div>

        {/* Teacher Offers & Requests Grid */}
        <section className="py-20 bg-white">
          <div className="container-custom">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              {/* Teacher Offers */}
              <div>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold font-display text-gray-900">{t('homeLatestTeacherOffers')}</h2>
                  <Link href="/offers" className="text-primary-600 text-sm font-semibold hover:underline">{t('viewAll')}</Link>
                </div>
                <div className="space-y-4">
                  {teacherOffers.length === 0 && !loading ? (
                    <div className="p-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 text-center">
                      <p className="text-sm text-gray-600 mb-3">
                        {t('homeNoTeacherOffers')}
                      </p>
                      <Link href="/teach" className="text-primary-600 text-sm font-semibold hover:underline">
                        {t('homePostAnOffer')}
                      </Link>
                    </div>
                  ) : (
                    teacherOffers.map((offer) => (
                      <div key={offer.id} className="p-4 rounded-xl border border-gray-100 hover:border-primary-100 hover:shadow-md transition-all bg-white group">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors">{offer.title}</h3>
                            <p className="text-sm text-gray-500 mb-2">
                              {offer.level} · {offer.category}
                              {offer.medium && ` · ${offer.medium} ${t('homeMediumSuffix')}`}
                            </p>
                            <p className="text-sm text-gray-600 line-clamp-1">{offer.description}</p>
                          </div>
                          <span className="bg-green-50 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                            {offer.mode}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Learn Requests */}
              <div>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold font-display text-gray-900">{t('homeStudentRequestsHeading')}</h2>
                  <Link href="/requests" className="text-primary-600 text-sm font-semibold hover:underline">{t('viewAll')}</Link>
                </div>
                <div className="space-y-4">
                  {learnRequests.length === 0 && !loading ? (
                    <div className="p-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 text-center">
                      <p className="text-sm text-gray-600 mb-3">
                        {t('homeNoStudentRequests')}
                      </p>
                      <Link href="/learn" className="text-secondary-600 text-sm font-semibold hover:underline">
                        {t('homePostARequest')}
                      </Link>
                    </div>
                  ) : (
                    learnRequests.map((request) => (
                      <div key={request.id} className="p-4 rounded-xl border border-gray-100 hover:border-secondary-100 hover:shadow-md transition-all bg-white group">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-gray-900 group-hover:text-secondary-600 transition-colors">{request.title}</h3>
                            <p className="text-sm text-gray-500 mb-2">
                              {request.level} · {request.category}
                              {request.medium && ` · ${request.medium} ${t('homeMediumSuffix')}`}
                            </p>
                            <p className="text-sm text-gray-600 line-clamp-1">{request.description}</p>
                          </div>
                          <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
                            {request.preferredMode}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-hero-pattern opacity-10"></div>
          <div className="container-custom relative z-10 text-center">
            <h2 className="text-3xl md:text-4xl font-bold font-display text-white mb-6">{t('homeCTAHeading')}</h2>
            <p className="text-primary-100 text-lg mb-10 max-w-2xl mx-auto">
              {t('homeCTABody')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register" className="bg-white text-primary-600 font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-gray-50 transition-colors transform hover:-translate-y-1">
                {t('homeCTAGetStarted')}
              </Link>
              <Link href="/about" className="bg-primary-700 text-white font-bold py-3 px-8 rounded-lg border border-primary-500 hover:bg-primary-800 transition-colors">
                {t('homeCTALearnMore')}
              </Link>
            </div>
          </div>
        </section>
      </main>

    </div>
  );
}
