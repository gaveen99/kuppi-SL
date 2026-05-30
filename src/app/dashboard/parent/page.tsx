'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ExamCountdown from '@/components/ExamCountdown';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Course, Enrollment, LiveSession, User } from '@/types';

interface StudentSnapshot {
  student: User;
  courses: Course[];
  upcomingSessions: LiveSession[];
}

export default function ParentDashboard() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [studentEmail, setStudentEmail] = useState('');
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState('');
  const [snapshots, setSnapshots] = useState<StudentSnapshot[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'parent')) {
      router.push('/auth/login');
    }
  }, [loading, user, router]);

  const loadLinkedStudents = async (linkedIds: string[]) => {
    const result: StudentSnapshot[] = [];
    for (const sid of linkedIds) {
      try {
        const sDoc = await getDoc(doc(db, 'users', sid));
        if (!sDoc.exists()) continue;
        const student = { uid: sDoc.id, ...sDoc.data() } as User;

        // Enrolled courses
        const enrollSnap = await getDocs(
          query(collection(db, 'enrollments'), where('studentId', '==', sid))
        );
        const courseIds = enrollSnap.docs
          .map((d) => (d.data() as Enrollment).courseId)
          .filter(Boolean);
        let courses: Course[] = [];
        if (courseIds.length > 0) {
          const courseDocs = await Promise.all(
            courseIds.map((cid) => getDoc(doc(db, 'courses', cid)))
          );
          courses = courseDocs
            .filter((d) => d.exists())
            .map((d) => ({ id: d.id, ...d.data() } as Course));
        }

        // Upcoming sessions from those courses
        const now = Timestamp.now();
        let upcoming: LiveSession[] = [];
        for (const c of courses) {
          const sSnap = await getDocs(
            query(
              collection(db, 'liveSessions'),
              where('courseId', '==', c.id),
              where('scheduledAt', '>=', now)
            )
          );
          upcoming.push(
            ...sSnap.docs.map((d) => ({ id: d.id, ...d.data() } as LiveSession))
          );
        }
        upcoming.sort((a, b) => {
          const ta =
            a.scheduledAt instanceof Timestamp
              ? a.scheduledAt.toMillis()
              : new Date(a.scheduledAt).getTime();
          const tb =
            b.scheduledAt instanceof Timestamp
              ? b.scheduledAt.toMillis()
              : new Date(b.scheduledAt).getTime();
          return ta - tb;
        });

        result.push({
          student,
          courses,
          upcomingSessions: upcoming.slice(0, 5),
        });
      } catch (err) {
        console.error('Failed to load a linked student:', err);
      }
    }
    return result;
  };

  useEffect(() => {
    if (!user || user.role !== 'parent') return;
    (async () => {
      try {
        const snaps = await loadLinkedStudents(user.linkedStudentIds || []);
        setSnapshots(snaps);
      } finally {
        setDataLoading(false);
      }
    })();
  }, [user]);

  const linkStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !studentEmail.trim()) return;
    setError('');
    setLinking(true);
    try {
      const normalized = studentEmail.trim().toLowerCase();
      const q1 = await getDocs(
        query(collection(db, 'users'), where('email', '==', normalized))
      );
      if (q1.empty) {
        throw new Error(t('dashParentErrorNoStudent'));
      }
      const candidate = q1.docs[0];
      const candidateData = candidate.data() as User;
      if (candidateData.role !== 'student') {
        throw new Error(t('dashParentErrorNotStudent'));
      }
      await updateDoc(doc(db, 'users', user.uid), {
        linkedStudentIds: arrayUnion(candidate.id),
      });
      setStudentEmail('');
      const snaps = await loadLinkedStudents([
        ...(user.linkedStudentIds || []),
        candidate.id,
      ]);
      setSnapshots(snaps);
    } catch (err: any) {
      setError(err.message || t('dashParentErrorLinkFailed'));
    } finally {
      setLinking(false);
    }
  };

  const unlinkStudent = async (studentId: string) => {
    if (!user) return;
    if (!confirm(t('dashParentUnlinkConfirm'))) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        linkedStudentIds: arrayRemove(studentId),
      });
      setSnapshots((list) => list.filter((s) => s.student.uid !== studentId));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">{t('loading')}</div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('dashParentTitle')}</h1>
        <p className="text-gray-600 mt-2 mb-6">
          {t('dashParentSubtitle')}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={linkStudent} className="card space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">
                {t('dashParentLinkStudent')}
              </h2>
              <p className="text-sm text-gray-600">
                {t('dashParentLinkHelp')}
              </p>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder={t('dashParentEmailPlaceholder')}
                  className="input-field flex-1"
                />
                <button
                  type="submit"
                  disabled={linking}
                  className="btn-primary"
                >
                  {linking ? t('dashParentLinking') : t('dashParentLink')}
                </button>
              </div>
            </form>

            {dataLoading ? (
              <div className="card text-center py-12 text-gray-500">
                {t('loading')}
              </div>
            ) : snapshots.length === 0 ? (
              <div className="card text-center py-12 text-gray-500">
                {t('dashParentNoLinked')}
              </div>
            ) : (
              snapshots.map((s) => (
                <section key={s.student.uid} className="card">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {s.student.name}
                      </h2>
                      <p className="text-xs text-gray-500">
                        {s.student.level} · {s.student.fieldOfStudy}
                      </p>
                    </div>
                    <button
                      onClick={() => unlinkStudent(s.student.uid)}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      {t('dashParentUnlink')}
                    </button>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {t('dashParentEnrolledCourses')} ({s.courses.length})
                    </h3>
                    {s.courses.length === 0 ? (
                      <p className="text-sm text-gray-500 mb-4">
                        {t('dashParentNotEnrolled')}
                      </p>
                    ) : (
                      <ul className="grid sm:grid-cols-2 gap-2 mb-4">
                        {s.courses.map((c) => (
                          <li key={c.id}>
                            <Link
                              href={`/courses/${c.id}`}
                              className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
                            >
                              <p className="font-medium text-gray-900">{c.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {t('dashParentBy')} {c.teacherName} · {c.level}
                              </p>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {t('dashParentUpcomingSessions')}
                    </h3>
                    {s.upcomingSessions.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        {t('dashParentNoUpcoming')}
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {s.upcomingSessions.map((session) => {
                          const d =
                            session.scheduledAt instanceof Timestamp
                              ? session.scheduledAt.toDate()
                              : new Date(session.scheduledAt);
                          return (
                            <li
                              key={session.id}
                              className="flex items-center justify-between text-sm border-b border-gray-100 last:border-0 py-2"
                            >
                              <div>
                                <p className="font-medium text-gray-900">
                                  {session.title}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {d.toLocaleString(undefined, {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                  })}
                                </p>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </section>
              ))
            )}
          </div>

          <aside className="space-y-6">
            <ExamCountdown />
            <div className="card text-sm">
              <h3 className="font-semibold text-gray-900 mb-2">{t('dashParentHelpfulLinks')}</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/past-papers" className="text-primary-600 hover:underline">
                    {t('dashParentPastPapersArchive')}
                  </Link>
                </li>
                <li>
                  <Link href="/scholarship" className="text-primary-600 hover:underline">
                    {t('dashParentScholarshipHub')}
                  </Link>
                </li>
                <li>
                  <Link href="/z-score" className="text-primary-600 hover:underline">
                    {t('dashParentZScoreCalculator')}
                  </Link>
                </li>
                <li>
                  <Link href="/ugc-cutoffs" className="text-primary-600 hover:underline">
                    {t('dashParentUgcCutoffs')}
                  </Link>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
