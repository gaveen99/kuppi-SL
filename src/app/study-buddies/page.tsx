'use client';

import { useEffect, useMemo, useState } from 'react';
import Navbar from '@/components/Navbar';
import AdSlot from '@/components/AdSlot';
import { useAuth } from '@/contexts/AuthContext';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SL_DISTRICTS } from '@/lib/sriLanka';
import type { Level, StudyBuddyProfile } from '@/types';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

function overlapCount<T>(a: T[], b: T[]) {
  const s = new Set(a);
  return b.filter((x) => s.has(x)).length;
}

export default function StudyBuddiesPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [buddies, setBuddies] = useState<StudyBuddyProfile[]>([]);
  const [myProfile, setMyProfile] = useState<StudyBuddyProfile | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [subjectsInput, setSubjectsInput] = useState('');
  const [bio, setBio] = useState('');
  const [district, setDistrict] = useState('');
  const [level, setLevel] = useState<Level>('OL');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [mine, all] = await Promise.all([
          getDoc(doc(db, 'studyBuddies', user.uid)),
          getDocs(collection(db, 'studyBuddies')),
        ]);
        if (mine.exists()) {
          const data = mine.data() as StudyBuddyProfile;
          setMyProfile(data);
          setSubjectsInput((data.subjects || []).join(', '));
          setBio(data.bio || '');
          setDistrict(data.district || '');
          setLevel(data.level || 'OL');
        } else {
          setLevel(user.level);
          setDistrict((user as any).district || '');
        }
        setBuddies(
          all.docs
            .map((d) => ({ uid: d.id, ...d.data() } as StudyBuddyProfile))
            .filter((p) => p.uid !== user.uid)
        );
      } catch (err) {
        console.error(err);
      } finally {
        setPageLoading(false);
      }
    })();
  }, [user]);

  const ranked = useMemo(() => {
    if (!myProfile) return buddies;
    return [...buddies]
      .map((b) => ({
        b,
        score:
          (b.level === myProfile.level ? 3 : 0) +
          (b.district && b.district === myProfile.district ? 2 : 0) +
          overlapCount(b.subjects || [], myProfile.subjects || []),
      }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.b);
  }, [buddies, myProfile]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const subjects = subjectsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const profile: StudyBuddyProfile = {
        uid: user.uid,
        name: user.name,
        level,
        district: district || undefined,
        subjects,
        bio: bio || undefined,
        updatedAt: Timestamp.now(),
      };
      await setDoc(doc(db, 'studyBuddies', user.uid), profile);
      setMyProfile(profile);
    } catch (err: any) {
      alert(err.message || t('studyBuddiesFailedSave'));
    } finally {
      setSaving(false);
    }
  };

  const messageBuddy = async (buddyUid: string, buddyName: string) => {
    if (!user) return;
    const qSnap = await getDocs(
      query(
        collection(db, 'conversations'),
        where('participantIds', 'array-contains', user.uid)
      )
    );
    let convId: string | null = null;
    for (const d of qSnap.docs) {
      const data = d.data();
      if (data.participantIds.includes(buddyUid)) {
        convId = d.id;
        break;
      }
    }
    if (!convId) {
      const ref = await addDoc(collection(db, 'conversations'), {
        participantIds: [user.uid, buddyUid],
        participantNames: { [user.uid]: user.name, [buddyUid]: buddyName },
        createdAt: Timestamp.now(),
        lastMessageAt: Timestamp.now(),
        lastMessagePreview: '',
      });
      convId = ref.id;
    }
    router.push(`/messages/${convId}`);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">{t('studyBuddiesLoading')}</div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('studyBuddiesTitle')}</h1>
        <p className="text-gray-600 mt-2 mb-6">
          {t('studyBuddiesIntro')}
        </p>

        <form onSubmit={save} className="card mb-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">{t('studyBuddiesYourProfile')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">{t('studyBuddiesLevel')}</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as Level)}
                className="input-field"
              >
                <option value="OL">{t('studyBuddiesLevelOL')}</option>
                <option value="AL">{t('studyBuddiesLevelAL')}</option>
                <option value="Undergraduate">{t('studyBuddiesLevelUndergraduate')}</option>
                <option value="Masters">{t('studyBuddiesLevelMasters')}</option>
                <option value="Other">{t('studyBuddiesLevelOther')}</option>
              </select>
            </div>
            <div>
              <label className="label">{t('studyBuddiesDistrict')}</label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="input-field"
              >
                <option value="">{t('studyBuddiesAnyDistrict')}</option>
                {SL_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('studyBuddiesSubjectsLabel')}</label>
              <input
                value={subjectsInput}
                onChange={(e) => setSubjectsInput(e.target.value)}
                placeholder={t('studyBuddiesSubjectsPlaceholder')}
                className="input-field"
                required
              />
            </div>
          </div>
          <div>
            <label className="label">{t('studyBuddiesBioLabel')}</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              placeholder={t('studyBuddiesBioPlaceholder')}
              className="input-field"
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? t('studyBuddiesSaving') : myProfile ? t('studyBuddiesUpdateProfile') : t('studyBuddiesCreateProfile')}
            </button>
          </div>
        </form>

        <AdSlot placement="footer" />

        <h2 className="text-xl font-semibold text-gray-900 mb-3">{t('studyBuddiesSuggested')}</h2>
        {pageLoading ? (
          <div className="card text-center py-12 text-gray-500">{t('studyBuddiesListLoading')}</div>
        ) : ranked.length === 0 ? (
          <div className="card text-center py-12 text-gray-500">
            {t('studyBuddiesEmpty')}
          </div>
        ) : (
          <ul className="space-y-3">
            {ranked.slice(0, 30).map((b) => (
              <li key={b.uid} className="card flex items-center justify-between p-4">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{b.name}</p>
                  <p className="text-xs text-gray-500">
                    {b.level}
                    {b.district && ` · ${b.district}`}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {b.subjects?.map((s) => (
                      <span
                        key={s}
                        className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                  {b.bio && (
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2">{b.bio}</p>
                  )}
                </div>
                <button
                  onClick={() => messageBuddy(b.uid, b.name)}
                  className="btn-outline text-sm flex-shrink-0"
                >
                  {t('studyBuddiesMessage')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
