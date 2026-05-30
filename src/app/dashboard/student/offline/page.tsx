'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileImageOutlined, FileTextOutlined } from '@ant-design/icons';
import Navbar from '@/components/Navbar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOfflineMaterials } from '@/hooks/useOfflineMaterials';
import {
  getOfflineFileBlob,
  getStorageUsageRatio,
  type SavedMaterialRecord,
} from '@/lib/offlineStorage';

function formatBytes(bytes: number): string {
  if (!bytes) return '';
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function OfflineMaterialsPage() {
  const { t } = useLanguage();
  const { savedList, removeMaterial } = useOfflineMaterials();
  const [quotaRatio, setQuotaRatio] = useState<number | null>(null);

  useEffect(() => {
    getStorageUsageRatio().then(setQuotaRatio);
  }, [savedList.length]);

  const handleOpen = async (record: SavedMaterialRecord) => {
    const blob = await getOfflineFileBlob(record.fileUrl);
    if (!blob) {
      // Fall back to the network URL (will work when online)
      window.open(record.fileUrl, '_blank');
      return;
    }
    const url = URL.createObjectURL(blob);
    const opened = window.open(url, '_blank');
    // Best-effort cleanup
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    if (!opened) {
      const a = document.createElement('a');
      a.href = url;
      a.download = record.originalFileName;
      a.click();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('dashStudentOfflineTitle')}</h1>
            <p className="text-gray-600 mt-1">
              {t('dashStudentOfflineSubtitle')}
            </p>
          </div>
          <Link
            href="/dashboard/student"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            {t('dashStudentOfflineBackArrow')}
          </Link>
        </div>

        {quotaRatio !== null && (
          <div
            className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
              quotaRatio > 0.8
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-gray-50 border-gray-200 text-gray-700'
            }`}
          >
            {t('dashStudentOfflineStorageUsage')} {(quotaRatio * 100).toFixed(0)}%
            {quotaRatio > 0.8 && ` ${t('dashStudentOfflineStorageHint')}`}
          </div>
        )}

        {savedList.length === 0 ? (
          <div className="card text-center py-12 text-gray-500">
            <p className="text-base font-medium">{t('dashStudentOfflineEmptyTitle')}</p>
            <p className="text-sm mt-2">
              {t('dashStudentOfflineEmptyHintA')}{' '}
              <span className="font-semibold text-gray-700">{t('dashStudentOfflineEmptyHintSaveLabel')}</span>{' '}
              {t('dashStudentOfflineEmptyHintB')}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {savedList.map((record) => (
              <li
                key={record.materialId}
                className="card flex items-center justify-between gap-4 p-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl flex-shrink-0">
                    {record.mimeType.startsWith('image/') ? <FileImageOutlined /> : <FileTextOutlined />}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {record.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatBytes(record.sizeBytes)} · {t('dashStudentOfflineSavedPrefix')} {formatDate(record.savedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleOpen(record)}
                    className="btn-secondary text-sm py-1.5 px-3"
                  >
                    {t('dashStudentOfflineOpen')}
                  </button>
                  <button
                    onClick={() => removeMaterial(record.materialId)}
                    className="text-sm text-red-600 hover:text-red-700 px-3 py-1.5"
                  >
                    {t('dashStudentOfflineRemove')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
