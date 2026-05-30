'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import ExamCountdown from '@/components/ExamCountdown';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Course, Enrollment, LearnRequest, Announcement } from '@/types';

export default function StudentDashboard() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
  const [myRequests, setMyRequests] = useState<LearnRequest[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'student')) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && user.role === 'student') {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch enrolled courses
      const enrollmentsQuery = query(
        collection(db, 'enrollments'),
        where('studentId', '==', user.uid)
      );
      const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
      const courseIds = enrollmentsSnapshot.docs.map(doc => doc.data().courseId);

      if (courseIds.length > 0) {
        const coursesQuery = query(
          collection(db, 'courses'),
          where('__name__', 'in', courseIds)
        );
        const coursesSnapshot = await getDocs(coursesQuery);
        const courses = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        setEnrolledCourses(courses);
      }

      // Fetch recommended courses based on level
      const recommendedQuery = query(
        collection(db, 'courses'),
        where('isPublished', '==', true),
        where('level', '==', user.level),
        orderBy('createdAt', 'desc'),
        limit(4)
      );
      const recommendedSnapshot = await getDocs(recommendedQuery);
      const recommended = recommendedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      setRecommendedCourses(recommended);

      // Fetch student's learn requests
      const requestsQuery = query(
        collection(db, 'learnRequests'),
        where('studentId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      const requests = requestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LearnRequest));
      setMyRequests(requests);

      // Fetch announcements
      const announcementsQuery = query(
        collection(db, 'announcements'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const announcementsSnapshot = await getDocs(announcementsQuery);
      const announcements = announcementsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
      setAnnouncements(announcements);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center">{t('loading')}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('dashCommonWelcomeBack')} {user.name}</h1>
          <p className="text-gray-600 mt-2">{t('dashStudentRole')} - {user.level}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Enrolled Courses */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{t('dashStudentMyCourses')}</h2>
                <Link href="/courses" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                  {t('dashCommonBrowseAllCoursesArrow')}
                </Link>
              </div>

              {dataLoading ? (
                <div className="text-center py-8">{t('loading')}</div>
              ) : enrolledCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {enrolledCourses.map((course) => (
                    <Link key={course.id} href={`/courses/${course.id}`}>
                      <div className="card hover:shadow-lg transition-shadow cursor-pointer">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{course.title}</h3>
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{course.description}</p>
                        <div className="flex gap-2">
                          <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded">
                            {course.level}
                          </span>
                          <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                            {course.category}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="card text-center py-8">
                  <p className="text-gray-500 mb-4">{t('dashStudentNoCoursesEnrolled')}</p>
                  <Link href="/courses" className="btn-primary inline-block">
                    {t('dashStudentBrowseCourses')}
                  </Link>
                </div>
              )}
            </section>

            {/* Recommended Courses */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('dashStudentRecommended')}</h2>

              {dataLoading ? (
                <div className="text-center py-8">{t('loading')}</div>
              ) : recommendedCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendedCourses.map((course) => (
                    <Link key={course.id} href={`/courses/${course.id}`}>
                      <div className="card hover:shadow-lg transition-shadow cursor-pointer">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{course.title}</h3>
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{course.description}</p>
                        <div className="flex gap-2">
                          <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded">
                            {course.level}
                          </span>
                          <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                            {course.category}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="card text-center py-8 text-gray-500">
                  {t('dashStudentNoRecommended')}
                </div>
              )}
            </section>

            {/* My Learn Requests */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{t('dashStudentMyLearnRequests')}</h2>
                <Link href="/learn" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                  {t('dashCommonManageRequestsArrow')}
                </Link>
              </div>

              {dataLoading ? (
                <div className="text-center py-8">{t('loading')}</div>
              ) : myRequests.length > 0 ? (
                <div className="space-y-3">
                  {myRequests.slice(0, 3).map((request) => (
                    <div key={request.id} className="card">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900">{request.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{request.description}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${request.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {request.isActive ? t('dashStudentRequestActive') : t('dashStudentRequestInactive')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card text-center py-8">
                  <p className="text-gray-500 mb-4">{t('dashStudentNoLearnRequests')}</p>
                  <Link href="/learn" className="btn-primary inline-block">
                    {t('dashStudentCreateLearnRequest')}
                  </Link>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <ExamCountdown />

            {/* Quick Actions */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashCommonQuickActions')}</h3>
              <div className="space-y-2">
                <Link href="/courses" className="block btn-primary text-center">
                  {t('dashStudentBrowseCourses')}
                </Link>
                <Link href="/offers" className="block btn-outline text-center">
                  {t('dashStudentFindTeachers')}
                </Link>
                <Link href="/learn" className="block btn-secondary text-center">
                  {t('dashStudentPostLearnRequest')}
                </Link>
                <Link href="/messages" className="block btn-secondary text-center">
                  {t('dashStudentMessages')}
                </Link>
                <Link href="/dashboard/student/offline" className="block btn-secondary text-center">
                  {t('dashStudentSavedOffline')}
                </Link>
                <Link href="/past-papers" className="block btn-secondary text-center">
                  {t('dashStudentPastPapers')}
                </Link>
                <Link href="/z-score" className="block btn-secondary text-center">
                  {t('dashStudentZScoreCalculator')}
                </Link>
              </div>
            </div>

            {/* Announcements */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashCommonAnnouncements')}</h3>
              {dataLoading ? (
                <div className="text-center py-4">{t('loading')}</div>
              ) : announcements.length > 0 ? (
                <div className="space-y-3">
                  {announcements.slice(0, 3).map((announcement) => (
                    <div key={announcement.id} className="border-b border-gray-200 last:border-0 pb-3 last:pb-0">
                      <h4 className="font-medium text-gray-900 text-sm">{announcement.title}</h4>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{announcement.body}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">{t('dashCommonNoAnnouncements')}</p>
              )}
              <Link href="/announcements" className="block text-primary-600 hover:text-primary-700 text-sm font-medium mt-4">
                {t('dashCommonViewAllArrow')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
