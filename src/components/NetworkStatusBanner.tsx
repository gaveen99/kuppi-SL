'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export default function NetworkStatusBanner() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-[60] w-full bg-amber-500 text-white text-sm font-medium py-2 px-4 shadow-md flex items-center justify-center gap-2"
    >
      <svg
        className="w-4 h-4 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M18.364 5.636a9 9 0 010 12.728m-3.536-3.536a4 4 0 010-5.656M12 12h.01M9.172 9.172a4 4 0 015.656 0M5.636 5.636a9 9 0 000 12.728"
        />
      </svg>
      <span>
        You&rsquo;re offline. Saved materials are still available.
      </span>
    </div>
  );
}
