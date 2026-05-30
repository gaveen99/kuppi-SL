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
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TeacherOffer, Level, Mode } from '@/types';
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

type PricingMode = 'free' | 'priced';

export default function TeachPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [myOffers, setMyOffers] = useState<TeacherOffer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    level: 'OL' as Level,
    category: 'Mathematics',
    mode: 'online' as Mode,
    location: '',
    availability: '',
    pricing: 'free' as PricingMode,
    hourlyRate: '',
  });

  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editPricing, setEditPricing] = useState<PricingMode>('free');
  const [editHourlyRate, setEditHourlyRate] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'teacher')) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && user.role === 'teacher') {
      fetchMyOffers();
    }
  }, [user]);

  const fetchMyOffers = async () => {
    if (!user) return;

    try {
      const offersQuery = query(
        collection(db, 'teacherOffers'),
        where('teacherId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const offersSnapshot = await getDocs(offersQuery);
      const offers = offersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeacherOffer));
      setMyOffers(offers);
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const rate =
      formData.pricing === 'priced' && formData.hourlyRate
        ? parseFloat(formData.hourlyRate)
        : null;

    if (formData.pricing === 'priced' && (rate === null || Number.isNaN(rate) || rate <= 0)) {
      alert(t('teachHourlyRateLabel'));
      return;
    }

    try {
      await addDoc(collection(db, 'teacherOffers'), {
        teacherId: user.uid,
        teacherName: user.name,
        title: formData.title,
        description: formData.description,
        level: formData.level,
        category: formData.category,
        mode: formData.mode,
        location: formData.location || null,
        availability: formData.availability || null,
        hourlyRate: rate,
        isActive: true,
        createdAt: Timestamp.now(),
      });

      setFormData({
        title: '',
        description: '',
        level: 'OL',
        category: 'Mathematics',
        mode: 'online',
        location: '',
        availability: '',
        pricing: 'free',
        hourlyRate: '',
      });
      setShowForm(false);
      fetchMyOffers();
    } catch (error) {
      console.error('Error creating offer:', error);
      const message = (error as any)?.message || t('teachFailedToCreate');
      alert(message);
    }
  };

  const toggleOfferStatus = async (offerId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'teacherOffers', offerId), {
        isActive: !currentStatus,
      });
      fetchMyOffers();
    } catch (error) {
      console.error('Error updating offer:', error);
    }
  };

  const startEditPrice = (offer: TeacherOffer) => {
    const isPriced = typeof offer.hourlyRate === 'number' && offer.hourlyRate > 0;
    setEditingPriceId(offer.id);
    setEditPricing(isPriced ? 'priced' : 'free');
    setEditHourlyRate(isPriced ? String(offer.hourlyRate) : '');
  };

  const cancelEditPrice = () => {
    setEditingPriceId(null);
    setEditPricing('free');
    setEditHourlyRate('');
  };

  const saveEditPrice = async (offerId: string) => {
    const rate =
      editPricing === 'priced' && editHourlyRate ? parseFloat(editHourlyRate) : null;

    if (editPricing === 'priced' && (rate === null || Number.isNaN(rate) || rate <= 0)) {
      alert(t('teachHourlyRateLabel'));
      return;
    }

    setSavingPrice(true);
    try {
      await updateDoc(doc(db, 'teacherOffers', offerId), {
        hourlyRate: rate,
      });
      cancelEditPrice();
      fetchMyOffers();
    } catch (error) {
      console.error('Error updating price:', error);
      alert((error as any)?.message || t('teachFailedToCreate'));
    } finally {
      setSavingPrice(false);
    }
  };

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center">{t('teachLoading')}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('teachMyOffersTitle')}</h1>
            <p className="text-gray-600 mt-2">{t('teachMyOffersSubtitle')}</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            {showForm ? t('teachCancel') : t('teachCreateNewOffer')}
          </button>
        </div>

        {showForm && (
          <div className="card mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t('teachCreateOfferTitle')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">{t('teachTitleLabel')}</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={t('teachTitlePlaceholder')}
                  className="input-field"
                />
              </div>

              <div>
                <label className="label">{t('teachDescriptionLabel')}</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('teachDescriptionPlaceholder')}
                  rows={4}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">{t('teachLevel')}</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value as Level })}
                    className="input-field"
                  >
                    <option value="OL">{t('teachLevelOL')}</option>
                    <option value="AL">{t('teachLevelAL')}</option>
                    <option value="Undergraduate">{t('teachLevelUndergraduate')}</option>
                    <option value="Masters">{t('teachLevelMasters')}</option>
                    <option value="Other">{t('teachLevelOther')}</option>
                  </select>
                </div>

                <div>
                  <label className="label">{t('teachSubject')}</label>
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
                  <label className="label">{t('teachMode')}</label>
                  <select
                    value={formData.mode}
                    onChange={(e) => setFormData({ ...formData, mode: e.target.value as Mode })}
                    className="input-field"
                  >
                    <option value="online">{t('teachModeOnline')}</option>
                    <option value="in-person">{t('teachModeInPerson')}</option>
                    <option value="hybrid">{t('teachModeHybrid')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">{t('teachLocationOptional')}</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder={t('teachLocationPlaceholder')}
                  className="input-field"
                />
              </div>

              <div>
                <label className="label">{t('teachAvailabilityOptional')}</label>
                <input
                  type="text"
                  value={formData.availability}
                  onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                  placeholder={t('teachAvailabilityPlaceholder')}
                  className="input-field"
                />
              </div>

              <div>
                <label className="label">{t('teachPricingLabel')}</label>
                <div className="flex flex-wrap gap-4">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="pricing"
                      value="free"
                      checked={formData.pricing === 'free'}
                      onChange={() => setFormData({ ...formData, pricing: 'free', hourlyRate: '' })}
                    />
                    <span>{t('teachPricingFree')}</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="pricing"
                      value="priced"
                      checked={formData.pricing === 'priced'}
                      onChange={() => setFormData({ ...formData, pricing: 'priced' })}
                    />
                    <span>{t('teachPricingPriced')}</span>
                  </label>
                </div>
              </div>

              {formData.pricing === 'priced' && (
                <div>
                  <label className="label">{t('teachHourlyRateLabel')}</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                    placeholder={t('teachHourlyRatePlaceholder')}
                    className="input-field"
                  />
                </div>
              )}

              <button type="submit" className="btn-primary">
                {t('teachCreateOfferButton')}
              </button>
            </form>
          </div>
        )}

        {dataLoading ? (
          <div className="text-center py-12">{t('teachLoadingMyOffers')}</div>
        ) : myOffers.length > 0 ? (
          <div className="space-y-4">
            {myOffers.map((offer) => {
              const isPriced = typeof offer.hourlyRate === 'number' && offer.hourlyRate > 0;
              const isEditing = editingPriceId === offer.id;
              return (
                <div key={offer.id} className="card">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-xl font-semibold text-gray-900">{offer.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded ${offer.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {offer.isActive ? t('teachActive') : t('teachInactive')}
                        </span>
                        {isPriced ? (
                          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                            {offer.hourlyRate} {t('teachRateUnit')}
                          </span>
                        ) : (
                          <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded">
                            {t('teachFreeBadge')}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 mb-3">{offer.description}</p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded">
                          {offer.level}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                          {offer.category}
                        </span>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {offer.mode}
                        </span>
                      </div>
                      {offer.location && (
                        <p className="text-sm text-gray-600"><EnvironmentOutlined /> {offer.location}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => toggleOfferStatus(offer.id, offer.isActive)}
                        className={offer.isActive ? 'btn-secondary' : 'btn-primary'}
                      >
                        {offer.isActive ? t('teachDeactivate') : t('teachActivate')}
                      </button>
                      {!isEditing && (
                        <button
                          onClick={() => startEditPrice(offer)}
                          className="btn-secondary"
                        >
                          {t('teachEditPrice')}
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="mt-4 border-t border-gray-200 pt-4 space-y-3">
                      <div>
                        <label className="label">{t('teachPricingLabel')}</label>
                        <div className="flex flex-wrap gap-4">
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="radio"
                              name={`edit-pricing-${offer.id}`}
                              value="free"
                              checked={editPricing === 'free'}
                              onChange={() => {
                                setEditPricing('free');
                                setEditHourlyRate('');
                              }}
                            />
                            <span>{t('teachPricingFree')}</span>
                          </label>
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="radio"
                              name={`edit-pricing-${offer.id}`}
                              value="priced"
                              checked={editPricing === 'priced'}
                              onChange={() => setEditPricing('priced')}
                            />
                            <span>{t('teachPricingPriced')}</span>
                          </label>
                        </div>
                      </div>

                      {editPricing === 'priced' && (
                        <div>
                          <label className="label">{t('teachHourlyRateLabel')}</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={editHourlyRate}
                            onChange={(e) => setEditHourlyRate(e.target.value)}
                            placeholder={t('teachHourlyRatePlaceholder')}
                            className="input-field"
                          />
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => saveEditPrice(offer.id)}
                          disabled={savingPrice}
                          className="btn-primary"
                        >
                          {t('teachSavePrice')}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditPrice}
                          disabled={savingPrice}
                          className="btn-secondary"
                        >
                          {t('teachCancelEdit')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card text-center py-12">
            <p className="text-gray-500 mb-4">{t('teachEmptyMessage')}</p>
            <button onClick={() => setShowForm(true)} className="btn-primary">
              {t('teachFirstOfferButton')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
