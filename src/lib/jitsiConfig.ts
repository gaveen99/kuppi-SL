import type { VideoQualityTier } from './videoQuality';

export const JITSI_DOMAIN = 'meet.jit.si';

export const JITSI_IFRAME_ALLOW =
  'camera; microphone; fullscreen; display-capture; autoplay; clipboard-write';

export function buildRoomName(callId: string, secret: string): string {
  return `kuppi-${callId}-${secret}`;
}

export function generateCallSecret(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  }
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

export function buildJitsiConstraints(tier: VideoQualityTier) {
  switch (tier) {
    case 'hd':
      return {
        video: {
          height: { ideal: 720, max: 720, min: 240 },
          frameRate: { ideal: 30, max: 30 },
        },
      };
    case 'sd':
      return {
        video: {
          height: { ideal: 360, max: 360, min: 180 },
          frameRate: { ideal: 15, max: 20 },
        },
      };
    case 'audio':
      return {
        video: {
          height: { ideal: 180, max: 180, min: 120 },
          frameRate: { ideal: 10, max: 15 },
        },
      };
  }
}
