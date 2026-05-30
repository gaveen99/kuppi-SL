'use client';

interface AdSenseProps {
  adSlot: string;
  adFormat?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  fullWidth?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

// Ads disabled site-wide. Component intentionally renders nothing.
export default function AdSense(_props: AdSenseProps) {
  return null;
}
