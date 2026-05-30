'use client';

import { VIDEO_QUALITY_PRESETS, type VideoQualityTier } from '@/lib/videoQuality';

interface VideoQualityPickerProps {
  value: VideoQualityTier;
  onChange: (tier: VideoQualityTier) => void;
  compact?: boolean;
}

const ORDER: VideoQualityTier[] = ['hd', 'sd', 'audio'];

export default function VideoQualityPicker({
  value,
  onChange,
  compact = false,
}: VideoQualityPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Video quality"
      className={`inline-flex rounded-full p-1 ${
        compact ? 'bg-gray-800/80 text-white' : 'bg-gray-100 text-gray-700'
      }`}
    >
      {ORDER.map((tier) => {
        const preset = VIDEO_QUALITY_PRESETS[tier];
        const active = value === tier;
        return (
          <button
            key={tier}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(tier)}
            title={preset.description}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              active
                ? compact
                  ? 'bg-white text-gray-900'
                  : 'bg-white text-primary-600 shadow-sm'
                : compact
                ? 'hover:bg-white/10'
                : 'hover:text-gray-900'
            }`}
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}
