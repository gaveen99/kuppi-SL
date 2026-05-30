'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EnvironmentOutlined } from '@ant-design/icons';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc,
  doc,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LearnRequest, Level, Mode, Medium } from '@/types';
import { SL_DISTRICTS } from '@/lib/sriLanka';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/lib/translations';

const CATEGORIES: Array<{ id: string; labelKey: TranslationKey }> = [
  { id: 'Mathematics', labelKey: 'subjMathematics' },
  { id: 'Science', labelKey: 'subjScience' },
  { id: 'Physics', labelKey: 'subjPhysics' },
  { id: 'Chemistry', labelKey: 'subjChemistry' },
  { id: 'Biology', labelKey: 'subjBiology' },
  { id: 'IT', labelKey: 'subjIT' },
  { id: 'Computer Science', labelKey: 'subjComputerScience' },
  { id: 'Engineering', labelKey: 'subjEngineering' },
  { id: 'Business', labelKey: 'subjBusiness' },
  { id: 'Medicine', labelKey: 'subjMedicine' },
  { id: 'Language', labelKey: 'subjLanguage' },
  { id: 'Arts', labelKey: 'subjArts' },
  { id: 'Other', labelKey: 'subjOther' },
];

const MEDIUM_OPTIONS: Array<{ id: Medium; labelKey: TranslationKey }> = [
  { id: 'Sinhala', labelKey: 'learnMediumSinhala' },
  { id: 'Tamil', labelKey: 'learnMediumTamil' },
  { id: 'English', labelKey: 'learnMediumEnglish' },
];

export default function LearnPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [myRequests, setMyRequests] = useState<LearnRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    level: 'OL' as Level,
    category: 'Mathematics',
    preferredMode: 'online' as Mode,
    location: '',
    district: '',
    medium: '' as Medium | '',
  });

  useEffect(() => {
    if (!loading && (!user || user.role !== 'student')) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && user.role === 'student') {
      fetchMyRequests();
    }
  }, [user]);

  const fetchMyRequests = async () => {
    if (!user) return;

    try {
      const requestsQuery = query(
        collection(db, 'learnRequests'),
        where('studentId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      const requests = requestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LearnRequest));
      setMyRequests(requests);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'learnRequests'), {
        studentId: user.uid,
        studentName: user.name,
        title: formData.title,
        description: formData.description,
        level: formData.level,
        category: formData.category,
        preferredMode: formData.preferredMode,
        location: formData.location || null,
        district: formData.district || null,
        medium: formData.medium || null,
        isActive: true,
        createdAt: Timestamp.now(),
      });

      setFormData({
        title: '',
        description: '',
        level: 'OL',
        category: 'Mathematics',
        preferredMode: 'online',
        location: '',
        district: '',
        medium: '',
      });
      setShowForm(false);
      fetchMyRequests();
    } catch (error) {
      console.error('Error creating request:', error);
      alert(t('learnFailedToCreate'));
    }
  };

  const toggleRequestStatus = async (requestId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'learnRequests', requestId), {
        isActive: !currentStatus,
      });
      fetchMyRequests();
    } catch (error) {
      console.error('Error updating request:', error);
    }
  };

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center">{t('learnLoading')}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('learnMyRequestsTitle')}</h1>
            <p className="text-gray-600 mt-2">{t('learnMyRequestsSubtitle')}</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            {showForm ? t('learnCancel') : t('learnCreateNewRequest')}
          </button>
        </div>

        {showForm && (
          <div className="card mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t('learnCreateRequestTitle')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">{t('learnTitleLabel')}</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={t('learnTitlePlaceholder')}
                  className="input-field"
                />
              </div>

              <div>
                <label className="label">{t('learnDescriptionLabel')}</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('learnDescriptionPlaceholder')}
                  rows={4}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">{t('learnLevel')}</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value as Level })}
                    className="input-field"
                  >
                    <option value="OL">{t('learnLevelOL')}</option>
                    <option value="AL">{t('learnLevelAL')}</option>
                    <option value="Undergraduate">{t('learnLevelUndergraduate')}</option>
                    <option value="Masters">{t('learnLevelMasters')}</option>
                    <option value="Other">{t('learnLevelOther')}</option>
                  </select>
                </div>

                <div>
                  <label className="label">{t('learnSubject')}</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input-field"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{t(cat.labelKey)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">{t('learnPreferredMode')}</label>
                  <select
                    value={formData.preferredMode}
                    onChange={(e) => setFormData({ ...formData, preferredMode: e.target.value as Mode })}
                    className="input-field"
                  >
                    <option value="online">{t('learnOnline')}</option>
                    <option value="in-person">{t('learnInPerson')}</option>
                    <option value="either">{t('learnEither')}</option>
                  </select>
                </div>

                <div>
                  <label className="label">{t('learnLocationOptional')}</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder={t('learnLocationPlaceholder')}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="label">{t('learnDistrictOptional')}</label>
                  <select
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="input-field"
                  >
                    <option value="">{t('learnAnyDistrict')}</option>
                    {SL_DISTRICTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">{t('learnMediumOptional')}</label>
                  <select
                    value={formData.medium}
                    onChange={(e) => setFormData({ ...formData, medium: e.target.value as Medium | '' })}
                    className="input-field"
                  >
                    <option value="">{t('learnAnyMedium')}</option>
                    {MEDIUM_OPTIONS.map((m) => (
                      <option key={m.id} value={m.id}>{t(m.labelKey)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit" className="btn-primary">
                {t('learnCreateRequestButton')}
              </button>
            </form>
          </div>
        )}

        {dataLoading ? (
          <div className="text-center py-12">{t('learnLoadingMyRequests')}</div>
        ) : myRequests.length > 0 ? (
          <div className="space-y-4">
            {myRequests.map((request) => (
              <div key={request.id} className="card">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{request.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded ${request.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {request.isActive ? t('learnActive') : t('learnInactive')}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{request.description}</p>
                    <div className="flex flex-wrap gap-2 mb-2">
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
                      <p className="text-sm text-gray-600"><EnvironmentOutlined /> {request.location}</p>
                    )}
                  </div>
                  <button
                    onClick={() => toggleRequestStatus(request.id, request.isActive)}
                    className={request.isActive ? 'btn-secondary' : 'btn-primary'}
                  >
                    {request.isActive ? t('learnDeactivate') : t('learnActivate')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <p className="text-gray-500 mb-4">{t('learnEmptyMessage')}</p>
            <button onClick={() => setShowForm(true)} className="btn-primary">
              {t('learnFirstRequestButton')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
