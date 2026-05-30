export const LEVELS = ['OL', 'AL', 'Undergraduate', 'Masters', 'Other'] as const;

export const CATEGORIES = [
  'Mathematics',
  'Science',
  'Physics',
  'Chemistry',
  'Biology',
  'IT',
  'Computer Science',
  'Engineering',
  'Business',
  'Medicine',
  'Language',
  'Arts',
  'Other',
] as const;

export const MEDIUMS = ['Sinhala', 'Tamil', 'English'] as const;

export const MODES = ['online', 'in-person', 'hybrid', 'either'] as const;

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export const formatDate = (date: Date | any): string => {
  const d = date instanceof Date ? date : date.toDate();
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatDateTime = (date: Date | any): string => {
  const d = date instanceof Date ? date : date.toDate();
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const getLevelLabel = (level: string): string => {
  const labels: Record<string, string> = {
    'OL': 'O/L (Ordinary Level)',
    'AL': 'A/L (Advanced Level)',
    'Undergraduate': 'Undergraduate',
    'Masters': 'Masters',
    'Other': 'Other',
  };
  return labels[level] || level;
};

export const friendlyAuthError = (code?: string, message?: string): string => {
  const map: Record<string, string> = {
    'auth/invalid-credential': 'Invalid email or password. Please try again.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/too-many-requests': 'Too many attempts. Please wait and try again later.',
    'auth/user-disabled': 'Your account has been disabled. Contact support.',
    'auth/email-already-in-use': 'This email is already registered.',
    'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
    'unavailable': 'Service temporarily unavailable. Please try again later.',
  };
  if (code && map[code]) return map[code];
  // Fallback: if message contains Firebase prefix
  if (message && /Firebase: Error/.test(message)) {
    return 'Something went wrong. Please try again.';
  }
  return message || 'Something went wrong. Please try again.';
};
