export const ADSENSE_CLIENT =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-1224577042495394';

export type AdPlacement = 'sidebar' | 'inline' | 'footer';

export const AD_SLOTS: Record<AdPlacement, string | undefined> = {
  sidebar: process.env.NEXT_PUBLIC_ADSENSE_SIDEBAR_SLOT,
  inline: process.env.NEXT_PUBLIC_ADSENSE_INFEED_SLOT,
  footer: process.env.NEXT_PUBLIC_ADSENSE_HORIZONTAL_SLOT,
};

// Routes (and prefixes) where ads must NEVER render.
// Keep this list tight — this is how we protect the learning experience.
const FORBIDDEN_PREFIXES: string[] = [
  '/call',
  '/messages',
  '/practice', // reserved for P2 timed exam mode
  '/exam', // reserved for P2 timed exam mode
  '/auth',
];

export function isAdForbiddenPath(pathname: string | null | undefined): boolean {
  if (!pathname) return true;
  return FORBIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  );
}

export const CONSENT_KEY = 'kuppi.adConsent';

export type AdConsent = 'granted' | 'denied' | 'unset';

export function readConsent(): AdConsent {
  if (typeof window === 'undefined') return 'unset';
  try {
    const v = window.localStorage.getItem(CONSENT_KEY);
    if (v === 'granted' || v === 'denied') return v;
    return 'unset';
  } catch {
    return 'unset';
  }
}

export function writeConsent(value: Exclude<AdConsent, 'unset'>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
    window.dispatchEvent(new CustomEvent('kuppi:adConsent', { detail: value }));
  } catch {
    // ignore storage errors
  }
}
