'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import AdSlot from '@/components/AdSlot';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { QAAnswer, QAQuestion } from '@/types';

export default function QuestionDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [question, setQuestion] = useState<QAQuestion | null>(null);
  const [answers, setAnswers] = useState<QAAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [answerText, setAnswerText] = useState('');
  const [posting, setPosting] = useState(false);

  const load = async () => {
    const qDoc = await getDoc(doc(db, 'qaQuestions', params.id));
    if (!qDoc.exists()) {
      router.push('/qa');
      return;
    }
    setQuestion({ id: qDoc.id, ...qDoc.data() } as QAQuestion);

    const aSnap = await getDocs(
      query(
        collection(db, 'qaAnswers'),
        where('questionId', '==', params.id),
        orderBy('upvotes', 'desc')
      )
    );
    setAnswers(aSnap.docs.map((d) => ({ id: d.id, ...d.data() } as QAAnswer)));
  };

  useEffect(() => {
    (async () => {
      try {
        await load();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const upvoteQuestion = async () => {
    if (!question || !user) return;
    try {
      await updateDoc(doc(db, 'qaQuestions', question.id), {
        upvotes: increment(1),
      });
      setQuestion({ ...question, upvotes: question.upvotes + 1 });
    } catch (err) {
      console.error(err);
    }
  };

  const upvoteAnswer = async (a: QAAnswer) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'qaAnswers', a.id), { upvotes: increment(1) });
      setAnswers(
        answers.map((x) => (x.id === a.id ? { ...x, upvotes: x.upvotes + 1 } : x))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const postAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !question || !answerText.trim()) return;
    setPosting(true);
    try {
      await addDoc(collection(db, 'qaAnswers'), {
        questionId: question.id,
        authorId: user.uid,
        authorName: user.name,
        authorRole: user.role,
        body: answerText.trim(),
        upvotes: 0,
        isAccepted: false,
        createdAt: Timestamp.now(),
      });
      await updateDoc(doc(db, 'qaQuestions', question.id), {
        answerCount: increment(1),
        answeredByTeacher: question.answeredByTeacher || user.role === 'teacher',
      });
      setAnswerText('');
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setPosting(false);
    }
  };

  if (loading || !question) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="text-center py-12 text-gray-500">{t('qaDetailLoading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <article className="card mb-6">
          <div className="flex items-start gap-4">
            <div className="text-center flex-shrink-0">
              <button
                onClick={upvoteQuestion}
                disabled={!user}
                className="text-gray-400 hover:text-primary-600 disabled:opacity-50"
                title={t('qaDetailUpvote')}
              >
                ▲
              </button>
              <p className="text-xl font-bold">{question.upvotes}</p>
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">{question.title}</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                {question.level && (
                  <span className="text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded">
                    {question.level}
                  </span>
                )}
                {question.subject && (
                  <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
                    {question.subject}
                  </span>
                )}
              </div>
              <div className="mt-4 whitespace-pre-wrap text-gray-700">
                {question.body}
              </div>
              <p className="text-xs text-gray-500 mt-4">
                {t('qaDetailAskedBy')} {question.authorName}
              </p>
            </div>
          </div>
        </article>

        <AdSlot placement="footer" />

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            {answers.length} {answers.length === 1 ? t('qaDetailAnswerSingular') : t('qaDetailAnswerPlural')}
          </h2>
          {answers.length === 0 ? (
            <p className="text-sm text-gray-500 mb-6">{t('qaDetailBeFirstAnswer')}</p>
          ) : (
            <ul className="space-y-4 mb-6">
              {answers.map((a) => (
                <li key={a.id} className="card p-4">
                  <div className="flex items-start gap-4">
                    <div className="text-center flex-shrink-0">
                      <button
                        onClick={() => upvoteAnswer(a)}
                        disabled={!user}
                        className="text-gray-400 hover:text-primary-600 disabled:opacity-50"
                        title={t('qaDetailUpvote')}
                      >
                        ▲
                      </button>
                      <p className="text-lg font-bold">{a.upvotes}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="whitespace-pre-wrap text-gray-700">{a.body}</p>
                      <p className="text-xs text-gray-500 mt-3">
                        {t('qaDetailAnsweredBy')} {a.authorName}
                        {a.authorRole === 'teacher' && (
                          <span className="ml-2 inline-block bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                            {t('qaDetailTeacherBadge')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {user ? (
            <form onSubmit={postAnswer} className="card space-y-3">
              <h3 className="font-semibold text-gray-900">{t('qaDetailYourAnswer')}</h3>
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                rows={5}
                placeholder={t('qaDetailAnswerPlaceholder')}
                className="input-field"
                required
              />
              <button
                type="submit"
                disabled={posting}
                className="btn-primary"
              >
                {posting ? t('qaDetailPosting') : t('qaDetailPostAnswer')}
              </button>
            </form>
          ) : (
            <div className="card text-sm text-gray-600">
              {t('qaDetailLoginToAnswer')}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
