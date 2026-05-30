'use client';

interface AdBannerProps {
  type?: 'horizontal' | 'sidebar' | 'in-article' | 'in-feed';
  className?: string;
}

// Ads disabled site-wide. Component intentionally renders nothing.
export default function AdBanner(_props: AdBannerProps) {
  return null;
}
