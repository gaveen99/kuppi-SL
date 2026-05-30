import { Timestamp } from 'firebase/firestore';

export type UserRole = 'student' | 'teacher' | 'admin' | 'parent';
export type Level = 'OL' | 'AL' | 'Undergraduate' | 'Masters' | 'Other';
export type Medium = 'Sinhala' | 'Tamil' | 'English';
export type Mode = 'online' | 'in-person' | 'hybrid' | 'either';
export type MaterialType = 'pdf' | 'image' | 'link';
export type PreferredLanguage = 'en' | 'si' | 'ta';

export type TeacherBadge =
  | 'leading-school'
  | 'university-lecturer'
  | 'phd'
  | 'professor'
  | 'past-examiner'
  | 'verified';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  level: Level;
  fieldOfStudy: string;
  institution?: string;
  district?: string;
  preferredLanguage?: PreferredLanguage;
  medium?: Medium;
  // teacher-only
  badges?: TeacherBadge[];
  verifiedAt?: Timestamp | Date;
  // parent-only
  linkedStudentIds?: string[];
  createdAt: Timestamp | Date;
}

export type ClassType =
  | 'Theory'
  | 'Revision'
  | 'Paper Class'
  | 'Seminar'
  | 'Individual'
  | 'Group';

export interface Course {
  id: string;
  title: string;
  description: string;
  level: Level;
  category: string;
  medium?: Medium;
  district?: string;
  classType?: ClassType;
  stream?: string;
  teacherId: string;
  teacherName?: string;
  isPublished: boolean;
  isPremium: boolean;
  createdAt: Timestamp | Date;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  orderIndex: number;
  createdAt: Timestamp | Date;
}

export interface Material {
  id: string;
  courseId: string;
  moduleId: string;
  title: string;
  type: MaterialType;
  filePath?: string;
  fileSize?: number;
  mimeType?: string;
  originalFileName?: string;
  externalUrl?: string;
  // Past-paper / model-paper / marking-scheme metadata
  resourceCategory?: 'note' | 'past-paper' | 'model-paper' | 'marking-scheme';
  examYear?: number;
  subject?: string;
  level?: Level;
  medium?: Medium;
  createdAt: Timestamp | Date;
}

export interface LiveSession {
  id: string;
  courseId: string;
  title: string;
  scheduledAt: Timestamp | Date;
  meetingUrl: string;
  description?: string;
  recordingUrl?: string;
  recordingAvailable?: boolean;
  createdAt: Timestamp | Date;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: Timestamp | Date;
  createdBy: string;
  createdByName?: string;
  targetLevel?: Level;
}

export interface Enrollment {
  id: string;
  courseId: string;
  studentId: string;
  createdAt: Timestamp | Date;
}

export interface TeacherOffer {
  id: string;
  teacherId: string;
  teacherName?: string;
  title: string;
  description: string;
  level: Level;
  category: string;
  mode: Mode;
  location?: string;
  district?: string;
  medium?: Medium;
  classType?: ClassType;
  availability?: string;
  hourlyRate?: number;
  createdAt: Timestamp | Date;
  isActive: boolean;
}

export interface LearnRequest {
  id: string;
  studentId: string;
  studentName?: string;
  title: string;
  description: string;
  level: Level;
  category: string;
  preferredMode: Mode;
  location?: string;
  district?: string;
  medium?: Medium;
  createdAt: Timestamp | Date;
  isActive: boolean;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participantNames?: Record<string, string>;
  createdAt: Timestamp | Date;
  lastMessageAt: Timestamp | Date;
  lastMessagePreview?: string;
}

export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface MessageAttachment {
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  text: string;
  sentAt: Timestamp | Date;
  isRead: boolean;
  isDelivered: boolean;
  status: MessageStatus;
  attachment?: MessageAttachment;
  attachments?: MessageAttachment[]; // Support multiple attachments
  isEdited?: boolean;
  editedAt?: Timestamp | Date;
  isDeleted?: boolean;
}

// Video Call Types
export interface QAQuestion {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  subject?: string;
  level?: Level;
  medium?: Medium;
  upvotes: number;
  answerCount: number;
  answeredByTeacher: boolean;
  createdAt: Timestamp | Date;
}

export interface QAAnswer {
  id: string;
  questionId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  body: string;
  upvotes: number;
  isAccepted: boolean;
  createdAt: Timestamp | Date;
}

export interface StudyBuddyProfile {
  uid: string;
  name: string;
  level: Level;
  district?: string;
  subjects: string[];
  bio?: string;
  updatedAt: Timestamp | Date;
}

export type VideoCallStatus = 'pending' | 'ringing' | 'active' | 'ended' | 'missed' | 'declined';

export interface VideoCall {
  id: string;
  conversationId: string;
  callerId: string;
  callerName: string;
  receiverId: string;
  receiverName: string;
  roomId?: string;
  callSecret?: string;
  status: VideoCallStatus;
  startedAt?: Timestamp | Date;
  endedAt?: Timestamp | Date;
  createdAt: Timestamp | Date;
}
