'use client';

import type { AdPlacement } from '@/lib/adConfig';

interface AdSlotProps {
  placement: AdPlacement;
  className?: string;
}

// Ads disabled site-wide. Component intentionally renders nothing.
export default function AdSlot(_props: AdSlotProps) {
  return null;
}
