'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  LinkOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import Navbar from '@/components/Navbar';
import SaveOfflineButton from '@/components/SaveOfflineButton';
import AdSlot from '@/components/AdSlot';
import TeacherBadges from '@/components/TeacherBadges';
import { useAuth } from '@/contexts/AuthContext';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  orderBy,
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Course, CourseModule, Material, LiveSession, User } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [teacher, setTeacher] = useState<User | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    fetchCourseData();
  }, [params.id, user]);

  const fetchCourseData = async () => {
    try {
      // Fetch course
      const courseDoc = await getDoc(doc(db, 'courses', params.id));
      if (!courseDoc.exists()) {
        router.push('/courses');
        return;
      }
      const courseData = { id: courseDoc.id, ...courseDoc.data() } as Course;
      setCourse(courseData);

      // Fetch teacher
      const teacherDoc = await getDoc(doc(db, 'users', courseData.teacherId));
      if (teacherDoc.exists()) {
        setTeacher({ uid: teacherDoc.id, ...teacherDoc.data() } as User);
      }

      // Fetch modules - with index fallback
      try {
        const modulesQuery = query(
          collection(db, 'courseModules'),
          where('courseId', '==', params.id),
          orderBy('orderIndex', 'asc')
        );
        const modulesSnapshot = await getDocs(modulesQuery);
        const modulesData = modulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseModule));
        setModules(modulesData);
      } catch (indexError) {
        console.log('Modules index not ready, fetching without order');
        const modulesQuery = query(
          collection(db, 'courseModules'),
          where('courseId', '==', params.id)
        );
        const modulesSnapshot = await getDocs(modulesQuery);
        const modulesData = modulesSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as CourseModule))
          .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
        setModules(modulesData);
      }

      // Fetch materials - with index fallback
      try {
        const materialsQuery = query(
          collection(db, 'materials'),
          where('courseId', '==', params.id),
          orderBy('createdAt', 'desc')
        );
        const materialsSnapshot = await getDocs(materialsQuery);
        const materialsData = materialsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Material));
        setMaterials(materialsData);
      } catch (indexError) {
        console.log('Materials index not ready, fetching without order');
        const materialsQuery = query(
          collection(db, 'materials'),
          where('courseId', '==', params.id)
        );
        const materialsSnapshot = await getDocs(materialsQuery);
        const materialsData = materialsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Material))
          .sort((a, b) => {
            const aTime = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
            const bTime = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
            return bTime - aTime;
          });
        setMaterials(materialsData);
      }

      // Fetch live sessions - with index fallback
      try {
        const sessionsQuery = query(
          collection(db, 'liveSessions'),
          where('courseId', '==', params.id),
          orderBy('scheduledAt', 'desc')
        );
        const sessionsSnapshot = await getDocs(sessionsQuery);
        const sessionsData = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LiveSession));
        setLiveSessions(sessionsData);
      } catch (indexError) {
        console.log('Sessions index not ready, fetching without order');
        const sessionsQuery = query(
          collection(db, 'liveSessions'),
          where('courseId', '==', params.id)
        );
        const sessionsSnapshot = await getDocs(sessionsQuery);
        const sessionsData = sessionsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as LiveSession))
          .sort((a, b) => {
            const aTime = a.scheduledAt instanceof Timestamp ? a.scheduledAt.toMillis() : new Date(a.scheduledAt).getTime();
            const bTime = b.scheduledAt instanceof Timestamp ? b.scheduledAt.toMillis() : new Date(b.scheduledAt).getTime();
            return bTime - aTime;
          });
        setLiveSessions(sessionsData);
      }

      // Check if user is enrolled
      if (user && user.role === 'student') {
        const enrollmentQuery = query(
          collection(db, 'enrollments'),
          where('courseId', '==', params.id),
          where('studentId', '==', user.uid)
        );
        const enrollmentSnapshot = await getDocs(enrollmentQuery);
        setIsEnrolled(!enrollmentSnapshot.empty);
      }
    } catch (error) {
      console.error('Error fetching course data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!user || user.role !== 'student') {
      router.push('/auth/login');
      return;
    }

    setEnrolling(true);
    try {
      await addDoc(collection(db, 'enrollments'), {
        courseId: params.id,
        studentId: user.uid,
        createdAt: Timestamp.now(),
      });
      setIsEnrolled(true);
    } catch (error) {
      console.error('Error enrolling:', error);
      alert(t('courseDetailEnrollFailed'));
    } finally {
      setEnrolling(false);
    }
  };

  const handleMessageTeacher = async () => {
    if (!user || !course) {
      router.push('/auth/login');
      return;
    }

    // Check if conversation exists
    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', user.uid)
    );
    const conversationsSnapshot = await getDocs(conversationsQuery);
    
    let conversationId = null;
    for (const doc of conversationsSnapshot.docs) {
      const data = doc.data();
      if (data.participantIds.includes(course.teacherId)) {
        conversationId = doc.id;
        break;
      }
    }

    // Create conversation if it doesn't exist
    if (!conversationId) {
      const newConversation = await addDoc(collection(db, 'conversations'), {
        participantIds: [user.uid, course.teacherId],
        participantNames: {
          [user.uid]: user.name,
          [course.teacherId]: teacher?.name || t('courseDetailTeacherFallback'),
        },
        createdAt: Timestamp.now(),
        lastMessageAt: Timestamp.now(),
        lastMessagePreview: '',
      });
      conversationId = newConversation.id;
    }

    router.push(`/messages/${conversationId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-12">{t('courseDetailLoading')}</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-12">{t('courseDetailNotFound')}</div>
      </div>
    );
  }

  const isOwner = user && user.uid === course.teacherId;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Course Header */}
        <div className="card mb-8">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{course.title}</h1>
              <p className="text-gray-600 mb-4">{course.description}</p>
              {teacher && (
                <p className="text-sm text-gray-500">{t('courseDetailTaughtBy')} <span className="font-medium">{teacher.name}</span></p>
              )}
            </div>
            {course.isPremium && (
              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded font-medium">
                {t('courseSharedPremium')}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <span className="bg-primary-100 text-primary-800 px-3 py-1 rounded">
              {course.level}
            </span>
            <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded">
              {course.category}
            </span>
            {course.medium && (
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded">
                {course.medium}
              </span>
            )}
          </div>

          <div className="flex gap-4">
            {isOwner ? (
              <Link href={`/courses/${course.id}/edit`} className="btn-primary">
                {t('courseSharedEditCourse')}
              </Link>
            ) : user && user.role === 'student' ? (
              <>
                {!isEnrolled ? (
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="btn-primary"
                  >
                    {enrolling ? t('courseDetailEnrolling') : t('courseDetailEnrollButton')}
                  </button>
                ) : (
                  <div className="bg-green-100 text-green-800 px-4 py-2 rounded font-medium">
                    <CheckOutlined /> {t('courseDetailEnrolledBadge')}
                  </div>
                )}
                <button onClick={handleMessageTeacher} className="btn-outline">
                  {t('courseDetailMessageTeacher')}
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Modules and Materials */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('courseDetailCourseContent')}</h2>
              
              {modules.length > 0 ? (
                <div className="space-y-6">
                  {modules.map((module) => {
                    const moduleMaterials = materials.filter(m => m.moduleId === module.id);
                    
                    return (
                      <div key={module.id} className="card">
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">{module.title}</h3>
                        
                        {moduleMaterials.length > 0 ? (
                          <div className="space-y-2">
                            {moduleMaterials.map((material) => (
                              <div key={material.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                <div className="flex items-center gap-3">
                                  {material.type === 'pdf' && (
                                    <FilePdfOutlined className="text-red-600" />
                                  )}
                                  {material.type === 'image' && (
                                    <FileImageOutlined className="text-blue-600" />
                                  )}
                                  {material.type === 'link' && (
                                    <LinkOutlined className="text-green-600" />
                                  )}
                                  <div>
                                    <p className="font-medium text-gray-900">{material.title}</p>
                                    {material.fileSize && material.fileSize > 0 ? (
                                      <p className="text-xs text-gray-500">
                                        {material.fileSize >= 1024 * 1024 
                                          ? `${(material.fileSize / 1024 / 1024).toFixed(2)} MB`
                                          : `${(material.fileSize / 1024).toFixed(2)} KB`}
                                      </p>
                                    ) : material.originalFileName ? (
                                      <p className="text-xs text-gray-500">{material.originalFileName}</p>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {material.type === 'link' && material.externalUrl ? (
                                    <a
                                      href={material.externalUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn-outline text-sm"
                                    >
                                      {t('courseDetailOpen')}
                                    </a>
                                  ) : material.filePath ? (
                                    <>
                                      <SaveOfflineButton material={material} />
                                      <a
                                        href={`/api/files/${material.filePath.split('/').pop()}`}
                                        download={material.originalFileName}
                                        className="btn-outline text-sm"
                                      >
                                        {t('courseDetailDownload')}
                                      </a>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">{t('courseDetailNoMaterials')}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="card text-center py-8 text-gray-500">
                  {t('courseDetailNoModules')}
                </div>
              )}
            </section>

            {/* Live Sessions */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('courseDetailLiveSessions')}</h2>
              
              {liveSessions.length > 0 ? (
                <div className="space-y-4">
                  {liveSessions.map((session) => {
                    const sessionDate = session.scheduledAt instanceof Timestamp 
                      ? session.scheduledAt.toDate() 
                      : new Date(session.scheduledAt);
                    const isPast = sessionDate < new Date();
                    
                    return (
                      <div key={session.id} className="card">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900">{session.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{session.description}</p>
                            <p className="text-sm text-gray-500 mt-2">
                              {sessionDate.toLocaleString('en-US', {
                                dateStyle: 'full',
                                timeStyle: 'short',
                              })}
                            </p>
                          </div>
                          {!isPast && (
                            <a
                              href={session.meetingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-primary ml-4"
                            >
                              {t('courseDetailJoinSession')}
                            </a>
                          )}
                          {isPast && session.recordingUrl ? (
                            <a
                              href={session.recordingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-outline ml-4"
                            >
                              <VideoCameraOutlined /> {t('courseDetailWatchRecording')}
                            </a>
                          ) : isPast ? (
                            <span className="text-gray-400 ml-4">{t('courseDetailEnded')}</span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="card text-center py-8 text-gray-500">
                  {t('courseDetailNoSessions')}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {isOwner && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('courseDetailManageCourse')}</h3>
                <div className="space-y-2">
                  <Link href={`/courses/${course.id}/edit`} className="block btn-primary text-center">
                    {t('courseSharedEditCourse')}
                  </Link>
                  <Link href={`/courses/${course.id}/modules`} className="block btn-outline text-center">
                    {t('courseDetailManageModules')}
                  </Link>
                  <Link href={`/courses/${course.id}/materials`} className="block btn-outline text-center">
                    {t('courseDetailAddMaterials')}
                  </Link>
                  <Link href={`/courses/${course.id}/sessions`} className="block btn-outline text-center">
                    {t('courseDetailManageSessions')}
                  </Link>
                </div>
              </div>
            )}

            <AdSlot placement="sidebar" />

            {teacher && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('courseDetailInstructor')}</h3>
                <p className="text-gray-900 font-medium">{teacher.name}</p>
                <p className="text-sm text-gray-600 mt-1">{teacher.fieldOfStudy}</p>
                {teacher.institution && (
                  <p className="text-sm text-gray-500 mt-1">{teacher.institution}</p>
                )}
                {teacher.badges && teacher.badges.length > 0 && (
                  <div className="mt-3">
                    <TeacherBadges badges={teacher.badges} />
                  </div>
                )}
                {user && user.uid !== teacher.uid && (
                  <button onClick={handleMessageTeacher} className="btn-outline w-full mt-4">
                    {t('courseDetailContactInstructor')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
