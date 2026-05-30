'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Conversation } from '@/types';

export default function MessagesPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      // Set up real-time listener for conversations
      const conversationsQuery = query(
        collection(db, 'conversations'),
        where('participantIds', 'array-contains', user.uid),
        orderBy('lastMessageAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        conversationsQuery,
        (snapshot) => {
          const conversationsData = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          } as Conversation));
          setConversations(conversationsData);
          setDataLoading(false);
        },
        (error) => {
          console.error('Error loading conversations:', error);
          setError(error?.message || 'Failed to load conversations');
          setDataLoading(false);
        }
      );

      return () => unsubscribe();
    }
  }, [user]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const getOtherParticipantName = (conversation: Conversation) => {
    const otherParticipantId = conversation.participantIds.find(id => id !== user.uid);
    return conversation.participantNames?.[otherParticipantId!] || 'Unknown';
  };

  const formatTime = (timestamp: any) => {
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('messagesTitle')}</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {dataLoading ? (
          <div className="text-center py-12">{t('loading')}</div>
        ) : conversations.length > 0 ? (
          <div className="space-y-3">
            {conversations.map((conversation) => (
              <Link key={conversation.id} href={`/messages/${conversation.id}`}>
                <div className="card hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {getOtherParticipantName(conversation)}
                      </h3>
                      {conversation.lastMessagePreview && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                          {conversation.lastMessagePreview}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTime(conversation.lastMessageAt)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <p className="text-gray-500 mb-4">{t('noMessages')}</p>
            <p className="text-sm text-gray-400">
              Start a conversation by contacting a teacher from their profile or course page
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
