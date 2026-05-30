'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { useLanguage } from '@/contexts/LanguageContext';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Announcement } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const announcementsQuery = query(
        collection(db, 'announcements'),
        orderBy('createdAt', 'desc')
      );
      const announcementsSnapshot = await getDocs(announcementsQuery);
      const announcementsData = announcementsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Announcement));
      setAnnouncements(announcementsData);
    } catch (error: any) {
      console.error('Error fetching announcements:', error);
      setError(error?.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const filteredAnnouncements = user 
    ? announcements.filter(a => !a.targetLevel || a.targetLevel === user.level)
    : announcements;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('announcementsTitle')}</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">{t('loading')}</div>
        ) : filteredAnnouncements.length > 0 ? (
          <div className="space-y-6">
            {filteredAnnouncements.map((announcement) => {
              const createdAt = announcement.createdAt instanceof Date
                ? announcement.createdAt
                : announcement.createdAt.toDate();

              return (
                <div key={announcement.id} className="card">
                  <div className="flex justify-between items-start mb-3">
                    <h2 className="text-2xl font-semibold text-gray-900">{announcement.title}</h2>
                    {announcement.targetLevel && (
                      <span className="bg-primary-100 text-primary-800 px-3 py-1 rounded text-sm">
                        {announcement.targetLevel}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 mb-4 whitespace-pre-wrap">{announcement.body}</p>
                  <div className="text-sm text-gray-500">
                    Posted on {createdAt.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                    {announcement.createdByName && ` by ${announcement.createdByName}`}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card text-center py-12">
            <p className="text-gray-500">{t('noAnnouncements')}</p>
          </div>
        )}
      </div>
      
    </div>
  );
}
