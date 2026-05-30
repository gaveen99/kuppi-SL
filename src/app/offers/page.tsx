'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { EnvironmentOutlined, ClockCircleOutlined } from '@ant-design/icons';
import Navbar from '@/components/Navbar';
import { AdBanner } from '@/components/ads';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { collection, query, where, getDocs, orderBy, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TeacherOffer, Level, Mode, Medium } from '@/types';
import { SL_DISTRICTS, CLASS_TYPES } from '@/lib/sriLanka';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
  'Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology',
  'IT', 'Computer Science', 'Engineering', 'Business', 'Medicine',
  'Language', 'Arts', 'Other'
];

const MEDIUMS: Medium[] = ['Sinhala', 'Tamil', 'English'];

export default function OffersPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [offers, setOffers] = useState<TeacherOffer[]>([]);
  const [filteredOffers, setFilteredOffers] = useState<TeacherOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<Level | 'All'>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [modeFilter, setModeFilter] = useState<Mode | 'All'>('All');
  const [mediumFilter, setMediumFilter] = useState<Medium | 'All'>('All');
  const [districtFilter, setDistrictFilter] = useState<string>('All');
  const [classTypeFilter, setClassTypeFilter] = useState<string>('All');

  useEffect(() => {
    fetchOffers();
  }, []);

  useEffect(() => {
    filterOffers();
  }, [offers, levelFilter, categoryFilter, modeFilter, mediumFilter, districtFilter, classTypeFilter]);

  const fetchOffers = async () => {
    try {
      const offersQuery = query(
        collection(db, 'teacherOffers'),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );
      const offersSnapshot = await getDocs(offersQuery);
      const offersData = offersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeacherOffer));
      setOffers(offersData);
    } catch (error: any) {
      console.error('Error fetching offers:', error);
      setError(error?.message || 'Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  const filterOffers = () => {
    let filtered = offers;

    if (levelFilter !== 'All') {
      filtered = filtered.filter(offer => offer.level === levelFilter);
    }

    if (categoryFilter !== 'All') {
      filtered = filtered.filter(offer => offer.category === categoryFilter);
    }

    if (modeFilter !== 'All') {
      filtered = filtered.filter(offer => offer.mode === modeFilter);
    }

    if (mediumFilter !== 'All') {
      filtered = filtered.filter(offer => offer.medium === mediumFilter);
    }

    if (districtFilter !== 'All') {
      filtered = filtered.filter(offer => offer.district === districtFilter);
    }

    if (classTypeFilter !== 'All') {
      filtered = filtered.filter(offer => offer.classType === classTypeFilter);
    }

    setFilteredOffers(filtered);
  };

  const handleContactTeacher = async (teacherId: string, teacherName: string) => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Check if conversation exists
    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', user.uid)
    );
    const conversationsSnapshot = await getDocs(conversationsQuery);
    
    let conversationId = null;
    for (const doc of conversationsSnapshot.docs) {
      const data = doc.data();
      if (data.participantIds.includes(teacherId)) {
        conversationId = doc.id;
        break;
      }
    }

    // Create conversation if it doesn't exist
    if (!conversationId) {
      const newConversation = await addDoc(collection(db, 'conversations'), {
        participantIds: [user.uid, teacherId],
        participantNames: {
          [user.uid]: user.name,
          [teacherId]: teacherName,
        },
        createdAt: Timestamp.now(),
        lastMessageAt: Timestamp.now(),
        lastMessagePreview: '',
      });
      conversationId = newConversation.id;
    }

    router.push(`/messages/${conversationId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('findTeachersTitle')}</h1>
        <p className="text-gray-600 mb-8">{t('browseTeachingOffers')}</p>

        {/* Filters */}
        <div className="card mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="label">{t('level')}</label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value as Level | 'All')}
                className="input-field"
              >
                <option value="All">{t('allLevels')}</option>
                <option value="OL">{t('ol')}</option>
                <option value="AL">{t('al')}</option>
                <option value="Undergraduate">{t('undergraduate')}</option>
                <option value="Masters">{t('masters')}</option>
                <option value="Other">{t('other')}</option>
              </select>
            </div>
            <div>
              <label className="label">{t('subject')}</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="input-field"
              >
                <option value="All">{t('allSubjects')}</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('mode')}</label>
              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value as Mode | 'All')}
                className="input-field"
              >
                <option value="All">{t('allModes')}</option>
                <option value="online">Online</option>
                <option value="in-person">In-Person</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="label">Medium</label>
              <select
                value={mediumFilter}
                onChange={(e) => setMediumFilter(e.target.value as Medium | 'All')}
                className="input-field"
              >
                <option value="All">All Mediums</option>
                {MEDIUMS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">District</label>
              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="input-field"
              >
                <option value="All">All Districts</option>
                {SL_DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Class Type</label>
              <select
                value={classTypeFilter}
                onChange={(e) => setClassTypeFilter(e.target.value)}
                className="input-field"
              >
                <option value="All">All Types</option>
                {CLASS_TYPES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Ad Banner */}
        <div className="mb-8">
          <AdBanner type="horizontal" />
        </div>

        {/* Offers Grid */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="text-center py-12">{t('loading')}</div>
        ) : filteredOffers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOffers.map((offer) => (
              <div key={offer.id} className="card h-full flex flex-col">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{offer.title}</h3>
                <p className="text-sm text-gray-500 mb-3">By {offer.teacherName}</p>
                <p className="text-gray-600 mb-4 flex-1">{offer.description}</p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {typeof offer.hourlyRate === 'number' && offer.hourlyRate > 0 ? (
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded font-medium">
                      {offer.hourlyRate} {t('teachRateUnit')}
                    </span>
                  ) : (
                    <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded font-medium">
                      {t('teachFreeBadge')}
                    </span>
                  )}
                  <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded">
                    {offer.level}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                    {offer.category}
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {offer.mode}
                  </span>
                  {offer.medium && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      {offer.medium}
                    </span>
                  )}
                  {offer.classType && (
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                      {offer.classType}
                    </span>
                  )}
                  {offer.district && (
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                      {offer.district}
                    </span>
                  )}
                </div>

                {offer.location && (
                  <p className="text-sm text-gray-600 mb-2"><EnvironmentOutlined /> {offer.location}</p>
                )}
                {offer.availability && (
                  <p className="text-sm text-gray-600 mb-2"><ClockCircleOutlined /> {offer.availability}</p>
                )}

                <button
                  onClick={() => handleContactTeacher(offer.teacherId, offer.teacherName || 'Teacher')}
                  className="btn-primary w-full mt-auto"
                >
                  {t('contactTeacher')}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <p className="text-gray-500">{t('noResultsFound')}</p>
          </div>
        )}
      </div>
      
    </div>
  );
}
