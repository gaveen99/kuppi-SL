'use client';

import type { ComponentType } from 'react';
import {
  CheckOutlined,
  StarFilled,
  ReadOutlined,
  EditOutlined,
} from '@ant-design/icons';
import type { TeacherBadge } from '@/types';

interface TeacherBadgesProps {
  badges?: TeacherBadge[];
  size?: 'sm' | 'md';
}

type BadgeIcon = ComponentType<{ className?: string }>;

const BADGE_META: Record<
  TeacherBadge,
  { label: string; icon: BadgeIcon; colorClass: string }
> = {
  verified: {
    label: 'Verified',
    icon: CheckOutlined,
    colorClass: 'bg-blue-100 text-blue-800',
  },
  'leading-school': {
    label: 'Leading School Teacher',
    icon: StarFilled,
    colorClass: 'bg-yellow-100 text-yellow-800',
  },
  'university-lecturer': {
    label: 'University Lecturer',
    icon: ReadOutlined,
    colorClass: 'bg-indigo-100 text-indigo-800',
  },
  phd: {
    label: 'Ph.D.',
    icon: ReadOutlined,
    colorClass: 'bg-purple-100 text-purple-800',
  },
  professor: {
    label: 'Professor',
    icon: ReadOutlined,
    colorClass: 'bg-rose-100 text-rose-800',
  },
  'past-examiner': {
    label: 'Past Examiner',
    icon: EditOutlined,
    colorClass: 'bg-emerald-100 text-emerald-800',
  },
};

export const ALL_BADGES = Object.keys(BADGE_META) as TeacherBadge[];
export function describeBadge(b: TeacherBadge) {
  return BADGE_META[b];
}

export default function TeacherBadges({ badges, size = 'sm' }: TeacherBadgesProps) {
  if (!badges || badges.length === 0) return null;
  const cls = size === 'md' ? 'text-sm px-2.5 py-1' : 'text-xs px-2 py-0.5';
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b) => {
        const m = BADGE_META[b];
        if (!m) return null;
        const Icon = m.icon;
        return (
          <span
            key={b}
            className={`inline-flex items-center gap-1 rounded-full font-medium ${m.colorClass} ${cls}`}
            title={m.label}
          >
            <Icon aria-hidden="true" />
            <span>{m.label}</span>
          </span>
        );
      })}
    </div>
  );
}
