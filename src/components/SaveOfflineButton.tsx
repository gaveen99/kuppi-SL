'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Material } from '@/types';
import { useOfflineMaterials } from '@/hooks/useOfflineMaterials';
import { getStorageUsageRatio, isOfflineSupported } from '@/lib/offlineStorage';

interface SaveOfflineButtonProps {
  material: Material;
}

export default function SaveOfflineButton({ material }: SaveOfflineButtonProps) {
  const { savedIds, saveStates, saveMaterial, removeMaterial } =
    useOfflineMaterials();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [quotaWarning, setQuotaWarning] = useState(false);

  useEffect(() => {
    isOfflineSupported().then(setSupported);
  }, []);

  useEffect(() => {
    getStorageUsageRatio().then((ratio) => {
      if (ratio !== null && ratio > 0.8) setQuotaWarning(true);
    });
  }, [savedIds.size]);

  if (material.type === 'link' || !material.filePath) return null;
  if (supported === false) return null;
  if (supported === null) {
    return (
      <button
        type="button"
        disabled
        className="text-xs text-gray-400 px-2 py-1"
        aria-label="Checking offline support"
      >
        ...
      </button>
    );
  }

  const isSaved = savedIds.has(material.id);
  const state = saveStates[material.id] ?? 'idle';
  const fileName = material.filePath.split('/').pop() || '';
  const fileUrl = `/api/files/${fileName}`;

  const handleSave = async () => {
    if (isSaved) {
      await removeMaterial(material.id);
      return;
    }
    await saveMaterial({
      materialId: material.id,
      courseId: material.courseId,
      moduleId: material.moduleId,
      title: material.title,
      originalFileName: material.originalFileName || fileName,
      mimeType: material.mimeType || 'application/octet-stream',
      sizeBytes: material.fileSize || 0,
      fileUrl,
    });
  };

  const label = (() => {
    if (state === 'saving') return 'Saving...';
    if (state === 'failed') return 'Retry save';
    if (isSaved) return 'Saved offline';
    return 'Save offline';
  })();

  const colorClasses = isSaved
    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
    : state === 'failed'
    ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50';

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleSave}
        disabled={state === 'saving'}
        className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border transition-colors ${colorClasses} ${
          state === 'saving' ? 'opacity-70 cursor-wait' : ''
        }`}
        title={isSaved ? 'Remove from offline' : 'Save this material for offline access'}
      >
        {isSaved ? (
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : (
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
            />
          </svg>
        )}
        <span>{label}</span>
      </button>
      {quotaWarning && !isSaved && (
        <p className="text-[10px] text-amber-600">
          Storage &gt;80% full.{' '}
          <Link href="/dashboard/student/offline" className="underline">
            Manage saved items
          </Link>
        </p>
      )}
    </div>
  );
}
