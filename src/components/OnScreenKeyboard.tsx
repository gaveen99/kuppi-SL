'use client';

import { useEffect, useMemo, useState } from 'react';

type KeyboardLayout = 'si' | 'ta';

interface OnScreenKeyboardProps {
  layout: KeyboardLayout;
  onInsert: (text: string) => void;
  onClose: () => void;
}

// Minimal character sets — not a full phonetic input method, just the most
// frequent letters so users can type basic words without OS configuration.
const SINHALA_ROWS: string[][] = [
  ['අ', 'ආ', 'ඇ', 'ඈ', 'ඉ', 'ඊ', 'උ', 'ඌ', 'එ', 'ඒ', 'ඔ', 'ඕ'],
  ['ක', 'ඛ', 'ග', 'ඝ', 'ච', 'ඡ', 'ජ', 'ඣ', 'ට', 'ඨ', 'ඩ', 'ඪ'],
  ['ත', 'ථ', 'ද', 'ධ', 'න', 'ප', 'ඵ', 'බ', 'භ', 'ම'],
  ['ය', 'ර', 'ල', 'ව', 'ශ', 'ෂ', 'ස', 'හ', 'ළ', 'ෆ'],
  ['ා', 'ැ', 'ෑ', 'ි', 'ී', 'ු', 'ූ', 'ෙ', 'ේ', 'ො', 'ෝ', '්'],
];

const TAMIL_ROWS: string[][] = [
  ['அ', 'ஆ', 'இ', 'ஈ', 'உ', 'ஊ', 'எ', 'ஏ', 'ஐ', 'ஒ', 'ஓ', 'ஔ'],
  ['க', 'ங', 'ச', 'ஞ', 'ட', 'ண', 'த', 'ந', 'ப', 'ம'],
  ['ய', 'ர', 'ல', 'வ', 'ழ', 'ள', 'ற', 'ன'],
  ['ஜ', 'ஷ', 'ஸ', 'ஹ', 'க்ஷ', 'ஸ்ரீ'],
  ['ா', 'ி', 'ீ', 'ு', 'ூ', 'ெ', 'ே', 'ை', 'ொ', 'ோ', 'ௌ', '்'],
];

export default function OnScreenKeyboard({
  layout,
  onInsert,
  onClose,
}: OnScreenKeyboardProps) {
  const [current, setCurrent] = useState<KeyboardLayout>(layout);

  useEffect(() => {
    setCurrent(layout);
  }, [layout]);

  const rows = useMemo(
    () => (current === 'si' ? SINHALA_ROWS : TAMIL_ROWS),
    [current]
  );

  return (
    <div
      role="dialog"
      aria-label="On-screen keyboard"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      className="fixed inset-x-0 bottom-0 z-[65] bg-white border-t border-gray-200 shadow-2xl px-3 pt-3"
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="inline-flex rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setCurrent('si')}
              className={`px-3 py-1 text-xs font-bold rounded-md ${
                current === 'si' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              සිංහල
            </button>
            <button
              type="button"
              onClick={() => setCurrent('ta')}
              className={`px-3 py-1 text-xs font-bold rounded-md ${
                current === 'ta' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              தமிழ்
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-xs font-medium"
          >
            Close
          </button>
        </div>

        <div className="space-y-1.5">
          {rows.map((row, i) => (
            <div key={i} className="flex flex-wrap justify-center gap-1">
              {row.map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => onInsert(ch)}
                  className="min-w-[2.25rem] h-10 px-2 text-lg bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 active:bg-gray-200"
                >
                  {ch}
                </button>
              ))}
            </div>
          ))}
          <div className="flex justify-center gap-1 pt-1">
            <button
              type="button"
              onClick={() => onInsert(' ')}
              className="flex-1 max-w-sm h-10 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 text-xs text-gray-600"
            >
              Space
            </button>
            <button
              type="button"
              onClick={() => onInsert('\b')}
              className="h-10 px-4 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 text-xs text-gray-600"
            >
              ⌫
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
