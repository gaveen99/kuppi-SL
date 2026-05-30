'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarOutlined,
  LinkOutlined,
  VideoCameraOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc,
  deleteDoc,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Course, LiveSession } from '@/types';
import { getHolidayOn } from '@/lib/sriLanka';

export default function ManageSessionsPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingSession, setEditingSession] = useState<string | null>(null);

  // Form state
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [recordingUrl, setRecordingUrl] = useState('');

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
    try {
      // Fetch course
      const courseDoc = await getDoc(doc(db, 'courses', params.id));
      if (!courseDoc.exists()) {
        router.push('/courses');
        return;
      }
      const courseData = { id: courseDoc.id, ...courseDoc.data() } as Course;
      setCourse(courseData);

      // Fetch sessions - with index fallback
      try {
        const sessionsQuery = query(
          collection(db, 'liveSessions'),
          where('courseId', '==', params.id),
          orderBy('scheduledAt', 'desc')
        );
        const sessionsSnapshot = await getDocs(sessionsQuery);
        const sessionsData = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LiveSession));
        setSessions(sessionsData);
      } catch (indexError) {
        console.log('Sessions index not ready, fetching without order:', indexError);
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
        setSessions(sessionsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(t('courseSessionsFailedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  // Check if user is authorized
  useEffect(() => {
    if (!authLoading && !loading && course) {
      if (!user || user.uid !== course.teacherId) {
        router.push(`/courses/${params.id}`);
      }
    }
  }, [user, authLoading, loading, course, router, params.id]);

  const resetForm = () => {
    setSessionTitle('');
    setSessionDescription('');
    setScheduledDate('');
    setScheduledTime('');
    setMeetingUrl('');
    setRecordingUrl('');
    setEditingSession(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionTitle.trim() || !scheduledDate || !scheduledTime || !meetingUrl.trim()) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);
      
      if (editingSession) {
        await updateDoc(doc(db, 'liveSessions', editingSession), {
          title: sessionTitle.trim(),
          description: sessionDescription.trim(),
          scheduledAt: Timestamp.fromDate(scheduledAt),
          meetingUrl: meetingUrl.trim(),
          recordingUrl: recordingUrl.trim() || null,
          recordingAvailable: Boolean(recordingUrl.trim()),
          updatedAt: Timestamp.now(),
        });
        setSuccess(t('courseSessionsUpdateSuccess'));
      } else {
        await addDoc(collection(db, 'liveSessions'), {
          courseId: params.id,
          title: sessionTitle.trim(),
          description: sessionDescription.trim(),
          scheduledAt: Timestamp.fromDate(scheduledAt),
          meetingUrl: meetingUrl.trim(),
          recordingUrl: recordingUrl.trim() || null,
          recordingAvailable: Boolean(recordingUrl.trim()),
          createdAt: Timestamp.now(),
        });
        setSuccess(t('courseSessionsCreateSuccess'));
      }

      resetForm();
      fetchData();
    } catch (err: any) {
      console.error('Error saving session:', err);
      setError(err.message || t('courseSessionsSaveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (session: LiveSession) => {
    const sessionDate = session.scheduledAt instanceof Timestamp 
      ? session.scheduledAt.toDate() 
      : new Date(session.scheduledAt);
    
    setSessionTitle(session.title);
    setSessionDescription(session.description || '');
    setScheduledDate(sessionDate.toISOString().split('T')[0]);
    setScheduledTime(sessionDate.toTimeString().slice(0, 5));
    setMeetingUrl(session.meetingUrl);
    setRecordingUrl(session.recordingUrl || '');
    setEditingSession(session.id);
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm(t('courseSessionsDeleteConfirm'))) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'liveSessions', sessionId));
      fetchData();
    } catch (err: any) {
      console.error('Error deleting session:', err);
      setError(err.message || t('courseSessionsDeleteFailed'));
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-12">{t('loading')}</div>
      </div>
    );
  }

  if (!course || !user || user.uid !== course.teacherId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-12">{t('courseSessionsNotAuthorized')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('courseSessionsTitle')}</h1>
            <p className="text-gray-600 mt-1">{course.title}</p>
          </div>
          <button
            onClick={() => router.push(`/courses/${params.id}`)}
            className="text-gray-600 hover:text-gray-900"
          >
            {t('courseSessionsBackToCourse')}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        {/* Add/Edit Session Form */}
        <form onSubmit={handleSubmit} className="card mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingSession ? t('courseSessionsEditHeading') : t('courseSessionsScheduleHeading')}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="label">{t('courseSessionsSessionTitle')}</label>
              <input
                type="text"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder={t('courseSessionsTitlePlaceholder')}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="label">{t('courseSessionsDescriptionOptional')}</label>
              <textarea
                value={sessionDescription}
                onChange={(e) => setSessionDescription(e.target.value)}
                placeholder={t('courseSessionsDescriptionPlaceholder')}
                rows={3}
                className="input-field"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">{t('courseSessionsDate')}</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="input-field"
                  required
                />
                {(() => {
                  const holiday = getHolidayOn(scheduledDate);
                  if (!holiday) return null;
                  return (
                    <p className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                      {t('courseSessionsHolidayPrefix')} <span className="font-semibold">{holiday.name}</span>
                      {holiday.kind === 'poya' ? t('courseSessionsHolidayPoyaSuffix') : ''}{t('courseSessionsHolidayManyStudents')}
                    </p>
                  );
                })()}
              </div>

              <div>
                <label className="label">{t('courseSessionsTime')}</label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">{t('courseSessionsMeetingUrl')}</label>
              <input
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder={t('courseSessionsMeetingUrlPlaceholder')}
                className="input-field"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('courseSessionsMeetingUrlHelp')}
              </p>
            </div>

            <div>
              <label className="label">{t('courseSessionsRecordingUrlOptional')}</label>
              <input
                type="url"
                value={recordingUrl}
                onChange={(e) => setRecordingUrl(e.target.value)}
                placeholder={t('courseSessionsRecordingUrlPlaceholder')}
                className="input-field"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('courseSessionsRecordingUrlHelp')}
              </p>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary flex-1"
              >
                {submitting ? t('courseSessionsSaving') : editingSession ? t('courseSessionsUpdate') : t('courseSessionsScheduleSubmit')}
              </button>
              {editingSession && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn-secondary"
                >
                  {t('courseSessionsCancel')}
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Sessions List */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('courseSessionsScheduledHeading')}</h2>
          
          {sessions.length > 0 ? (
            <div className="space-y-4">
              {sessions.map(session => {
                const sessionDate = session.scheduledAt instanceof Timestamp 
                  ? session.scheduledAt.toDate() 
                  : new Date(session.scheduledAt);
                const isPast = sessionDate < new Date();
                
                return (
                  <div 
                    key={session.id} 
                    className={`p-4 rounded-lg border ${isPast ? 'bg-gray-50 border-gray-200' : 'bg-white border-primary-200'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{session.title}</h3>
                          {isPast && (
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                              {t('courseSessionsBadgePast')}
                            </span>
                          )}
                          {!isPast && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                              {t('courseSessionsBadgeUpcoming')}
                            </span>
                          )}
                        </div>
                        {session.description && (
                          <p className="text-sm text-gray-600 mt-1">{session.description}</p>
                        )}
                        <p className="text-sm text-gray-500 mt-2">
                          <CalendarOutlined /> {sessionDate.toLocaleString('en-US', {
                            dateStyle: 'full',
                            timeStyle: 'short',
                          })}
                        </p>
                        <p className="text-xs text-gray-400 mt-1 truncate">
                          <LinkOutlined /> {session.meetingUrl}
                        </p>
                        {session.recordingUrl && (
                          <p className="text-xs text-primary-600 mt-1 truncate">
                            <VideoCameraOutlined /> {t('courseSessionsRecordingAvailable')}{' '}
                            <a
                              href={session.recordingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline"
                            >
                              {session.recordingUrl}
                            </a>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {!isPast && (
                          <a
                            href={session.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700 text-sm"
                          >
                            {t('courseSessionsJoin')}
                          </a>
                        )}
                        <button
                          onClick={() => handleEdit(session)}
                          className="text-primary-600 hover:text-primary-700 text-sm"
                        >
                          {t('courseSessionsEdit')}
                        </button>
                        <button
                          onClick={() => handleDelete(session.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          {t('courseSessionsDelete')}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              {t('courseSessionsEmpty')}
            </p>
          )}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2"><BulbOutlined /> {t('courseSessionsTipsHeading')}</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• {t('courseSessionsTipShareLink')}</li>
            <li>• {t('courseSessionsTipRecord')}</li>
            <li>• {t('courseSessionsTipTestAv')}</li>
            <li>• {t('courseSessionsTipMaterials')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
