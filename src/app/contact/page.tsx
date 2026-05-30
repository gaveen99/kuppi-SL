'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircleOutlined } from '@ant-design/icons';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

type Category = 'inquiry' | 'feedback' | 'complaint' | 'other';

const MAX_MESSAGE = 5000;

export default function ContactPage() {
  const { firebaseUser, user, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  const CATEGORY_OPTIONS: { value: Category; label: string; hint: string }[] = [
    { value: 'inquiry', label: t('contactCatInquiry'), hint: t('contactCatInquiryHint') },
    { value: 'feedback', label: t('contactCatFeedback'), hint: t('contactCatFeedbackHint') },
    { value: 'complaint', label: t('contactCatComplaint'), hint: t('contactCatComplaintHint') },
    { value: 'other', label: t('contactCatOther'), hint: t('contactCatOtherHint') },
  ];
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('inquiry');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (user?.name && !name) setName(user.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Reply address comes from the signed-in account — never shown in the UI.
  const replyEmail = user?.email || firebaseUser?.email || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!replyEmail) {
      setError(t('contactErrorNeedSignIn'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: replyEmail,
          category,
          subject,
          message,
          website,
          uid: firebaseUser?.uid,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || t('contactErrorGeneric'));
      }
      setSent(true);
      setSubject('');
      setMessage('');
    } catch (err: any) {
      setError(err.message || t('contactErrorGeneric'));
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="bg-white">
        <Navbar />
        <main className="w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div
            role="status"
            aria-live="polite"
            className="card text-center py-12"
          >
            <div className="w-14 h-14 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              <CheckCircleOutlined />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
              {t('contactSentTitle')}
            </h1>
            <p className="text-gray-600 mb-6">
              {t('contactSentDescription')}
            </p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="btn-secondary"
            >
              {t('contactSendAnother')}
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <Navbar />
      <main className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-3">
          {t('contactTitle')}
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          {t('contactSubtitle')}
        </p>

        {authLoading ? (
          <div className="card text-center py-10 text-gray-500">{t('loading')}</div>
        ) : !firebaseUser ? (
          <div className="card text-center py-10">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {t('contactSignInTitle')}
            </h2>
            <p className="text-gray-600 mb-6">
              {t('contactSignInDescription')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/auth/login" className="btn-primary">
                {t('contactSignIn')}
              </Link>
              <Link href="/auth/register" className="btn-secondary">
                {t('contactCreateAccount')}
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-5" noValidate>
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm"
              >
                {error}
              </div>
            )}

            {/* Honeypot — hidden from humans, attractive to bots. */}
            <div aria-hidden="true" className="hidden">
              <label>
                {t('contactWebsiteHoneypot')}
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </label>
            </div>

            <div>
              <label htmlFor="contact-name" className="label">
                {t('contactNameLabel')}
              </label>
              <input
                id="contact-name"
                type="text"
                required
                autoComplete="name"
                autoCapitalize="words"
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder={t('contactNamePlaceholder')}
              />
            </div>

            <div>
              <span className="label block mb-2">{t('contactWhatAbout')}</span>
              <div
                role="radiogroup"
                aria-label={t('contactCategoryAria')}
                className="grid gap-2 sm:grid-cols-2"
              >
                {CATEGORY_OPTIONS.map((opt) => {
                  const selected = category === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`cursor-pointer rounded-lg border p-3 text-sm transition-colors ${
                        selected
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="category"
                        value={opt.value}
                        checked={selected}
                        onChange={() => setCategory(opt.value)}
                        className="sr-only"
                      />
                      <div className="font-semibold text-gray-900">
                        {opt.label}
                      </div>
                      <div className="text-gray-500 text-xs mt-0.5">
                        {opt.hint}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="contact-subject" className="label">
                {t('contactSubjectLabel')}
              </label>
              <input
                id="contact-subject"
                type="text"
                required
                maxLength={200}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="input-field"
                placeholder={t('contactSubjectPlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="contact-message" className="label">
                {t('contactMessageLabel')}
              </label>
              <textarea
                id="contact-message"
                required
                rows={8}
                maxLength={MAX_MESSAGE}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="input-field resize-y"
                placeholder={t('contactMessagePlaceholder')}
              />
              <p className="mt-1 text-xs text-gray-500 text-right">
                {message.length} / {MAX_MESSAGE}
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full sm:w-auto"
            >
              {submitting ? t('contactSending') : t('contactSend')}
            </button>

            <p className="text-xs text-gray-500">
              {t('contactReplyNote')}
            </p>
          </form>
        )}
      </main>
    </div>
  );
}
