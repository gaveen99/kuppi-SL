'use client';

import { useEffect, useState } from 'react';
import { readConsent, writeConsent, type AdConsent } from '@/lib/adConfig';

export default function ConsentBanner() {
  const [consent, setConsent] = useState<AdConsent>('granted');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setConsent(readConsent());
  }, []);

  if (!mounted || consent !== 'unset') return null;

  const accept = () => {
    writeConsent('granted');
    setConsent('granted');
  };

  const decline = () => {
    writeConsent('denied');
    setConsent('denied');
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie and ad consent"
      style={{
        bottom: 'max(1rem, env(safe-area-inset-bottom))',
      }}
      className="fixed inset-x-4 md:inset-x-auto md:right-6 md:max-w-md z-[70] rounded-xl bg-white shadow-2xl border border-gray-200 p-4 text-sm"
    >
      <p className="text-gray-700 leading-relaxed">
        Kuppi is free to use. We show a small number of education-focused Google
        ads to cover server costs. Your choice below.
      </p>
      <div className="flex justify-end gap-2 mt-3">
        <button
          type="button"
          onClick={decline}
          className="text-gray-600 hover:text-gray-800 font-medium px-3 py-1.5 text-xs"
        >
          No thanks
        </button>
        <button
          type="button"
          onClick={accept}
          className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-1.5 rounded-lg text-xs"
        >
          Allow ads
        </button>
      </div>
    </div>
  );
}
