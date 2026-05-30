'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import TeacherBadges, { ALL_BADGES, describeBadge } from '@/components/TeacherBadges';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { TeacherBadge, User } from '@/types';

export default function AdminTeachersPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [teachers, setTeachers] = useState<User[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === 'admin') {
      (async () => {
        try {
          const snap = await getDocs(
            query(collection(db, 'users'), where('role', '==', 'teacher'))
          );
          setTeachers(
            snap.docs.map((d) => ({ uid: d.id, ...d.data() } as User))
          );
        } catch (err) {
          console.error('Failed to load teachers:', err);
        } finally {
          setPageLoading(false);
        }
      })();
    }
  }, [user]);

  const toggleBadge = async (teacher: User, badge: TeacherBadge) => {
    const current = new Set(teacher.badges || []);
    if (current.has(badge)) current.delete(badge);
    else current.add(badge);
    const next = Array.from(current);
    setSaving(teacher.uid);
    try {
      await updateDoc(doc(db, 'users', teacher.uid), {
        badges: next,
        verifiedAt: next.length > 0 ? Timestamp.now() : null,
      });
      setTeachers((list) =>
        list.map((t) => (t.uid === teacher.uid ? { ...t, badges: next } : t))
      );
    } catch (err) {
      console.error('Failed to update badges:', err);
      alert(t('dashAdminTeachersUpdateFailed'));
    } finally {
      setSaving(null);
    }
  };

  const visible = teachers.filter((t) => {
    if (!search.trim()) return true;
    const hay = `${t.name} ${t.email} ${t.institution ?? ''}`.toLowerCase();
    return hay.includes(search.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {t('dashAdminTeachersTitle')}
        </h1>
        <p className="text-gray-600 mb-6">
          {t('dashAdminTeachersSubtitle')}
        </p>

        <input
          type="search"
          placeholder={t('dashAdminTeachersSearchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field mb-6 md:max-w-md"
        />

        {pageLoading ? (
          <div className="card text-center py-12 text-gray-500">{t('dashAdminTeachersLoading')}</div>
        ) : visible.length === 0 ? (
          <div className="card text-center py-12 text-gray-500">
            {t('dashAdminTeachersNoneMatch')}
          </div>
        ) : (
          <ul className="space-y-4">
            {visible.map((teacher) => (
              <li key={teacher.uid} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{teacher.name}</p>
                    <p className="text-xs text-gray-500 truncate">{teacher.email}</p>
                    {teacher.institution && (
                      <p className="text-xs text-gray-500">{teacher.institution}</p>
                    )}
                    <div className="mt-2">
                      <TeacherBadges badges={teacher.badges} />
                    </div>
                  </div>
                  {saving === teacher.uid && (
                    <span className="text-xs text-gray-500">{t('dashAdminTeachersSaving')}</span>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {ALL_BADGES.map((b) => {
                    const active = teacher.badges?.includes(b) ?? false;
                    const meta = describeBadge(b);
                    const Icon = meta.icon;
                    return (
                      <button
                        key={b}
                        onClick={() => toggleBadge(teacher, b)}
                        disabled={saving === teacher.uid}
                        className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          active
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        } ${saving === teacher.uid ? 'opacity-70 cursor-wait' : ''}`}
                      >
                        <Icon aria-hidden="true" />
                        <span>{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
