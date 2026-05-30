'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Level, Medium } from '@/types';

export default function AskQuestionPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState<Level>('OL');
  const [medium, setMedium] = useState<Medium | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!loading && !user) {
    router.push('/auth/login');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !body.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const ref = await addDoc(collection(db, 'qaQuestions'), {
        authorId: user.uid,
        authorName: user.name,
        title: title.trim(),
        body: body.trim(),
        subject: subject.trim() || null,
        level,
        medium: medium || null,
        upvotes: 0,
        answerCount: 0,
        answeredByTeacher: false,
        createdAt: Timestamp.now(),
      });
      router.push(`/qa/${ref.id}`);
    } catch (err: any) {
      setError(err.message || t('qaAskFailedToPost'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('qaAskTitle')}</h1>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label">{t('qaAskTitleLabel')}</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('qaAskTitlePlaceholder')}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">{t('qaAskDetailsLabel')}</label>
            <textarea
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder={t('qaAskDetailsPlaceholder')}
              className="input-field"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">{t('level')}</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as Level)}
                className="input-field"
              >
                <option value="OL">{t('ol')}</option>
                <option value="AL">{t('al')}</option>
                <option value="Undergraduate">{t('undergraduate')}</option>
                <option value="Masters">{t('masters')}</option>
                <option value="Other">{t('other')}</option>
              </select>
            </div>
            <div>
              <label className="label">{t('subject')}</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t('qaAskSubjectPlaceholder')}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">{t('qaAskMedium')}</label>
              <select
                value={medium}
                onChange={(e) => setMedium(e.target.value as Medium | '')}
                className="input-field"
              >
                <option value="">{t('qaAskNotSpecified')}</option>
                <option value="Sinhala">{t('qaAskSinhala')}</option>
                <option value="Tamil">{t('qaAskTamil')}</option>
                <option value="English">{t('qaAskEnglish')}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex-1"
            >
              {submitting ? t('qaAskPosting') : t('qaAskPostQuestion')}
            </button>
            <button
              type="button"
              onClick={() => router.push('/qa')}
              className="btn-secondary"
            >
              {t('qaAskCancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
