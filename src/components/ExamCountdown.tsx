'use client';

import { useEffect, useState } from 'react';
import { EXAM_TARGETS, type ExamTarget } from '@/lib/sriLanka';

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

interface CountdownLine {
  target: ExamTarget;
  daysLeft: number;
}

export default function ExamCountdown() {
  const [lines, setLines] = useState<CountdownLine[]>([]);

  useEffect(() => {
    const now = new Date();
    const upcoming = EXAM_TARGETS.map((t) => ({
      target: t,
      daysLeft: daysBetween(now, new Date(t.target)),
    }))
      .filter((l) => l.daysLeft >= 0)
      .sort((a, b) => a.daysLeft - b.daysLeft);
    setLines(upcoming);
  }, []);

  if (lines.length === 0) return null;

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Exam Countdown</h3>
      <ul className="space-y-2">
        {lines.map((l) => {
          const urgent = l.daysLeft <= 30;
          return (
            <li
              key={l.target.id}
              className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 last:border-0"
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">
                  {l.target.label}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(l.target.target).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div
                className={`text-right flex-shrink-0 px-2.5 py-1 rounded ${
                  urgent
                    ? 'bg-red-50 text-red-700'
                    : 'bg-primary-50 text-primary-700'
                }`}
              >
                <p className="text-xl font-bold leading-none">{l.daysLeft}</p>
                <p className="text-[10px] uppercase tracking-wide">
                  {l.daysLeft === 1 ? 'day' : 'days'}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
