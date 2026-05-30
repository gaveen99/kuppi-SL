'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  isMaterialSaved,
  listSavedMaterials,
  removeSavedMaterial,
  saveMaterialOffline,
  type SavedMaterialRecord,
} from '@/lib/offlineStorage';

type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

interface UseOfflineMaterialsReturn {
  savedIds: Set<string>;
  savedList: SavedMaterialRecord[];
  saveStates: Record<string, SaveState>;
  saveMaterial: (
    record: Omit<SavedMaterialRecord, 'savedAt'>
  ) => Promise<void>;
  removeMaterial: (materialId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useOfflineMaterials(): UseOfflineMaterialsReturn {
  const [savedList, setSavedList] = useState<SavedMaterialRecord[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});

  const refresh = useCallback(async () => {
    const list = await listSavedMaterials();
    setSavedList(list);
    setSavedIds(new Set(list.map((r) => r.materialId)));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveMaterial = useCallback(
    async (record: Omit<SavedMaterialRecord, 'savedAt'>) => {
      setSaveStates((s) => ({ ...s, [record.materialId]: 'saving' }));
      try {
        await saveMaterialOffline(record);
        setSaveStates((s) => ({ ...s, [record.materialId]: 'saved' }));
        await refresh();
      } catch (err) {
        console.error('Failed to save material offline:', err);
        setSaveStates((s) => ({ ...s, [record.materialId]: 'failed' }));
      }
    },
    [refresh]
  );

  const removeMaterial = useCallback(
    async (materialId: string) => {
      try {
        await removeSavedMaterial(materialId);
        setSaveStates((s) => {
          const next = { ...s };
          delete next[materialId];
          return next;
        });
        await refresh();
      } catch (err) {
        console.error('Failed to remove saved material:', err);
      }
    },
    [refresh]
  );

  return {
    savedIds,
    savedList,
    saveStates,
    saveMaterial,
    removeMaterial,
    refresh,
  };
}

export function useIsMaterialSaved(materialId: string): boolean {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    isMaterialSaved(materialId).then((result) => {
      if (!cancelled) setSaved(result);
    });
    return () => {
      cancelled = true;
    };
  }, [materialId]);

  return saved;
}
