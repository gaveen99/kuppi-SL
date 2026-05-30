'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { EnvironmentOutlined } from '@ant-design/icons';
import Navbar from '@/components/Navbar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LearnRequest } from '@/types';

export default function RequestsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [requests, setRequests] = useState<LearnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState({
    level: '',
    category: '',
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const requestsQuery = query(
        collection(db, 'learnRequests'),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      const requestsData = requestsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as LearnRequest));
      setRequests(requestsData);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      setError(error?.message || 'Failed to load learn requests');
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(request => {
    if (filter.level && request.level !== filter.level) return false;
    if (filter.category && request.category !== filter.category) return false;
    return true;
  });

  const levels = Array.from(new Set(requests.map(r => r.level)));
  const categories = Array.from(new Set(requests.map(r => r.category)));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('learnRequestsTitle')}</h1>
          <p className="text-gray-600 mt-2">{t('browseLearnRequests')}</p>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">{t('level')}</label>
              <select
                value={filter.level}
                onChange={(e) => setFilter({ ...filter, level: e.target.value })}
                className="input-field"
              >
                <option value="">{t('allLevels')}</option>
                {levels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('subject')}</label>
              <select
                value={filter.category}
                onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                className="input-field"
              >
                <option value="">{t('allSubjects')}</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">{t('loading')}</div>
        ) : filteredRequests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRequests.map((request) => {
              const createdAt = request.createdAt instanceof Date
                ? request.createdAt
                : request.createdAt.toDate();

              return (
                <div key={request.id} className="card hover:shadow-lg transition-shadow">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{request.title}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{request.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded">
                      {request.level}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                      {request.category}
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {request.preferredMode}
                    </span>
                  </div>

                  {request.location && (
                    <p className="text-sm text-gray-600 mb-3"><EnvironmentOutlined /> {request.location}</p>
                  )}

                  <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      {createdAt.toLocaleDateString()}
                    </p>
                    {user && (
                      <Link
                        href={`/messages?user=${request.studentId}`}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        Contact →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card text-center py-12">
            <p className="text-gray-500">{t('noLearnRequests')}</p>
          </div>
        )}
      </div>
      
    </div>
  );
}
