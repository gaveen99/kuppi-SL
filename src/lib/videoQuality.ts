export type VideoQualityTier = 'hd' | 'sd' | 'audio';

export interface QualityPreset {
  tier: VideoQualityTier;
  label: string;
  description: string;
  video: MediaTrackConstraints | false;
  audio: MediaTrackConstraints | boolean;
  maxBitrateBps: number;
}

export const VIDEO_QUALITY_PRESETS: Record<VideoQualityTier, QualityPreset> = {
  hd: {
    tier: 'hd',
    label: 'HD',
    description: '720p · 1.5 Mbps',
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
      facingMode: 'user',
    },
    audio: { echoCancellation: true, noiseSuppression: true },
    maxBitrateBps: 1_500_000,
  },
  sd: {
    tier: 'sd',
    label: 'SD',
    description: '360p · 500 kbps',
    video: {
      width: { ideal: 640 },
      height: { ideal: 360 },
      frameRate: { ideal: 15 },
      facingMode: 'user',
    },
    audio: { echoCancellation: true, noiseSuppression: true },
    maxBitrateBps: 500_000,
  },
  audio: {
    tier: 'audio',
    label: 'Audio only',
    description: 'No video · ~32 kbps',
    video: false,
    audio: { echoCancellation: true, noiseSuppression: true },
    maxBitrateBps: 0,
  },
};

const STORAGE_KEY = 'videoQualityPreference';

type NavigatorConnection = {
  effectiveType?: string;
  saveData?: boolean;
};

function getConnection(): NavigatorConnection | null {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as unknown as {
    connection?: NavigatorConnection;
    mozConnection?: NavigatorConnection;
    webkitConnection?: NavigatorConnection;
  };
  return nav.connection || nav.mozConnection || nav.webkitConnection || null;
}

export function detectAutoQuality(): VideoQualityTier {
  const conn = getConnection();
  if (!conn) return 'hd';
  if (conn.saveData) return 'audio';
  switch (conn.effectiveType) {
    case 'slow-2g':
    case '2g':
      return 'audio';
    case '3g':
      return 'sd';
    case '4g':
      return 'hd';
    default:
      return 'hd';
  }
}

export function getStoredQualityPreference(): VideoQualityTier | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === 'hd' || value === 'sd' || value === 'audio') return value;
    return null;
  } catch {
    return null;
  }
}

export function storeQualityPreference(tier: VideoQualityTier): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, tier);
  } catch {
    // ignore quota/permission errors
  }
}

export function resolveInitialQuality(): VideoQualityTier {
  return getStoredQualityPreference() ?? detectAutoQuality();
}

export function getMediaConstraints(
  tier: VideoQualityTier
): MediaStreamConstraints {
  const preset = VIDEO_QUALITY_PRESETS[tier];
  return {
    video: preset.video,
    audio: preset.audio,
  };
}

