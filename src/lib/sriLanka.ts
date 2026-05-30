// Sri Lanka-specific reference data used across the platform.

export const SL_DISTRICTS = [
  'Ampara',
  'Anuradhapura',
  'Badulla',
  'Batticaloa',
  'Colombo',
  'Galle',
  'Gampaha',
  'Hambantota',
  'Jaffna',
  'Kalutara',
  'Kandy',
  'Kegalle',
  'Kilinochchi',
  'Kurunegala',
  'Mannar',
  'Matale',
  'Matara',
  'Monaragala',
  'Mullaitivu',
  'Nuwara Eliya',
  'Polonnaruwa',
  'Puttalam',
  'Ratnapura',
  'Trincomalee',
  'Vavuniya',
] as const;

export type SLDistrict = (typeof SL_DISTRICTS)[number];

// A/L subject streams — these determine which subject combos are valid
export const AL_STREAMS = [
  'Physical Science',
  'Biological Science',
  'Commerce',
  'Arts',
  'Technology (Engineering)',
  'Technology (Biosystems)',
  'Common',
] as const;

export type ALStream = (typeof AL_STREAMS)[number];

// Common A/L subjects by stream
export const AL_STREAM_SUBJECTS: Record<ALStream, string[]> = {
  'Physical Science': [
    'Combined Mathematics',
    'Physics',
    'Chemistry',
    'Information & Communication Technology',
  ],
  'Biological Science': ['Biology', 'Physics', 'Chemistry', 'Agriculture'],
  Commerce: [
    'Business Studies',
    'Accounting',
    'Economics',
    'Business Statistics',
  ],
  Arts: [
    'Sinhala',
    'Tamil',
    'English',
    'History',
    'Geography',
    'Political Science',
    'Logic',
    'Buddhism',
    'Hinduism',
    'Islam',
    'Christianity',
    'Sociology',
    'Media',
    'Drama',
    'Dance',
    'Music',
    'Art',
  ],
  'Technology (Engineering)': [
    'Engineering Technology',
    'Science for Technology',
    'Information & Communication Technology',
  ],
  'Technology (Biosystems)': [
    'Bio-systems Technology',
    'Science for Technology',
    'Information & Communication Technology',
  ],
  Common: ['General English', 'General Information Technology'],
};

// O/L and A/L exam countdown targets — update once a year with real dates
// (approximate windows; the government publishes exact dates ~2 months before).
export interface ExamTarget {
  id: string;
  label: string;
  target: string; // ISO date
}

export const EXAM_TARGETS: ExamTarget[] = [
  { id: 'ol-2026', label: 'G.C.E. O/L 2026', target: '2026-12-02' },
  { id: 'al-2026', label: 'G.C.E. A/L 2026', target: '2026-08-03' },
  {
    id: 'scholarship-2026',
    label: 'Grade 5 Scholarship 2026',
    target: '2026-08-16',
  },
];

// Sri Lanka public / Poya holidays — minimal set for 2026 to drive scheduler warnings.
// This is NOT a replacement for the official gazette; update annually.
// Each entry is ISO date string YYYY-MM-DD.
export interface SLHoliday {
  date: string;
  name: string;
  kind: 'poya' | 'public' | 'religious' | 'bank';
}

export const SL_HOLIDAYS_2026: SLHoliday[] = [
  { date: '2026-01-02', name: 'Duruthu Full Moon Poya Day', kind: 'poya' },
  { date: '2026-01-15', name: 'Tamil Thai Pongal Day', kind: 'public' },
  { date: '2026-02-04', name: 'Independence Day', kind: 'public' },
  { date: '2026-02-01', name: 'Navam Full Moon Poya Day', kind: 'poya' },
  { date: '2026-03-03', name: 'Medin Full Moon Poya Day', kind: 'poya' },
  { date: '2026-03-20', name: 'Id-Ul-Fitr (Ramazan Festival)', kind: 'religious' },
  { date: '2026-04-01', name: 'Bak Full Moon Poya Day', kind: 'poya' },
  { date: '2026-04-03', name: 'Good Friday', kind: 'religious' },
  { date: '2026-04-13', name: 'Sinhala & Tamil New Year Eve', kind: 'public' },
  { date: '2026-04-14', name: 'Sinhala & Tamil New Year Day', kind: 'public' },
  { date: '2026-05-01', name: 'May Day (Labour Day)', kind: 'public' },
  { date: '2026-05-01', name: 'Vesak Full Moon Poya Day', kind: 'poya' },
  { date: '2026-05-02', name: 'Day following Vesak Poya', kind: 'public' },
  { date: '2026-05-27', name: 'Id-Ul-Alha (Hajj Festival)', kind: 'religious' },
  { date: '2026-05-31', name: 'Poson Full Moon Poya Day', kind: 'poya' },
  { date: '2026-06-29', name: 'Esala Full Moon Poya Day', kind: 'poya' },
  { date: '2026-07-29', name: 'Nikini Full Moon Poya Day', kind: 'poya' },
  { date: '2026-08-27', name: 'Binara Full Moon Poya Day', kind: 'poya' },
  { date: '2026-08-25', name: 'Milad-un-Nabi (Holy Prophet Birthday)', kind: 'religious' },
  { date: '2026-09-26', name: 'Vap Full Moon Poya Day', kind: 'poya' },
  { date: '2026-10-25', name: 'Il Full Moon Poya Day', kind: 'poya' },
  { date: '2026-11-08', name: 'Deepavali Festival Day', kind: 'religious' },
  { date: '2026-11-24', name: 'Unduvap Full Moon Poya Day', kind: 'poya' },
  { date: '2026-12-25', name: 'Christmas Day', kind: 'religious' },
];

const HOLIDAY_LOOKUP = new Map<string, SLHoliday>(
  SL_HOLIDAYS_2026.map((h) => [h.date, h])
);

export function getHolidayOn(date: Date | string | undefined): SLHoliday | null {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return null;
  const iso = d.toISOString().slice(0, 10);
  return HOLIDAY_LOOKUP.get(iso) ?? null;
}

export function isHoliday(date: Date | string | undefined): boolean {
  return getHolidayOn(date) !== null;
}

// UGC approximate minimum cut-off Z-scores by popular course (indicative,
// based on 2023/2024 admissions — the real table is published yearly).
export interface UgcCutoff {
  course: string;
  universities: string[];
  district: string;
  minZScore: number;
  year: number;
  stream: ALStream | 'Any';
}

export const UGC_CUTOFFS_SAMPLE: UgcCutoff[] = [
  { course: 'Medicine', universities: ['Colombo'], district: 'Colombo', minZScore: 1.9498, year: 2024, stream: 'Biological Science' },
  { course: 'Medicine', universities: ['Peradeniya'], district: 'Kandy', minZScore: 1.9218, year: 2024, stream: 'Biological Science' },
  { course: 'Medicine', universities: ['Sri Jayewardenepura'], district: 'Colombo', minZScore: 1.9116, year: 2024, stream: 'Biological Science' },
  { course: 'Medicine', universities: ['Kelaniya'], district: 'Gampaha', minZScore: 1.8936, year: 2024, stream: 'Biological Science' },
  { course: 'Medicine', universities: ['Ruhuna'], district: 'Galle', minZScore: 1.8527, year: 2024, stream: 'Biological Science' },
  { course: 'Medicine', universities: ['Jaffna'], district: 'Jaffna', minZScore: 1.7502, year: 2024, stream: 'Biological Science' },
  { course: 'Engineering', universities: ['Moratuwa'], district: 'Colombo', minZScore: 2.0151, year: 2024, stream: 'Physical Science' },
  { course: 'Engineering', universities: ['Peradeniya'], district: 'Kandy', minZScore: 1.8842, year: 2024, stream: 'Physical Science' },
  { course: 'Engineering', universities: ['Ruhuna'], district: 'Galle', minZScore: 1.7021, year: 2024, stream: 'Physical Science' },
  { course: 'Engineering', universities: ['Jaffna'], district: 'Jaffna', minZScore: 1.6450, year: 2024, stream: 'Physical Science' },
  { course: 'Computer Science', universities: ['Colombo'], district: 'Colombo', minZScore: 1.8932, year: 2024, stream: 'Physical Science' },
  { course: 'Information Technology', universities: ['Moratuwa'], district: 'Colombo', minZScore: 1.9511, year: 2024, stream: 'Physical Science' },
  { course: 'Law', universities: ['Colombo'], district: 'Colombo', minZScore: 1.7841, year: 2024, stream: 'Arts' },
  { course: 'Management', universities: ['Colombo'], district: 'Colombo', minZScore: 1.7104, year: 2024, stream: 'Commerce' },
  { course: 'Architecture', universities: ['Moratuwa'], district: 'Colombo', minZScore: 1.6823, year: 2024, stream: 'Physical Science' },
  { course: 'Agriculture', universities: ['Peradeniya'], district: 'Kandy', minZScore: 1.3211, year: 2024, stream: 'Biological Science' },
  { course: 'Nursing', universities: ['Colombo'], district: 'Colombo', minZScore: 1.6921, year: 2024, stream: 'Biological Science' },
  { course: 'Dental Science', universities: ['Peradeniya'], district: 'Kandy', minZScore: 1.8817, year: 2024, stream: 'Biological Science' },
];

// Popular Sri Lankan school "tuition class" vocabulary — tag courses for discoverability.
export const CLASS_TYPES = [
  'Theory',
  'Revision',
  'Paper Class',
  'Seminar',
  'Individual',
  'Group',
] as const;

export type ClassType = (typeof CLASS_TYPES)[number];
