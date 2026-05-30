# <img src="docs/icons/lucide/graduation-cap.svg" width="30" valign="middle"> Kuppi - Learning Platform for Sri Lankan Students

<div align="center">

![Kuppi Logo](https://img.shields.io/badge/Kuppi-Learning%20Platform-6366f1?style=for-the-badge&logo=graduation-cap&logoColor=white)

**A comprehensive web platform connecting students and teachers across O/L, A/L, University, and Masters levels in Sri Lanka** 

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange?style=flat-square&logo=firebase)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

[Features](#features) • [Screenshots](#screenshots) • [Installation](#installation) • [User Guide](#user-guide) • [API Reference](#api-reference)

<br>

<img src="screenshots/local/desktop/01-home.png" alt="Kuppi — home page" width="860">

</div>

---

## <img src="docs/icons/lucide/list.svg" width="24" valign="middle"> Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Screenshots](#screenshots)
4. [Tech Stack](#tech-stack)
5. [Installation](#installation)
6. [User Guide](#user-guide)
   - [Getting Started](#getting-started)
   - [For Students](#for-students)
   - [For Teachers](#for-teachers)
   - [For Administrators](#for-administrators)
7. [Messaging System](#messaging-system)
8. [Video Calling](#video-calling)
9. [File Management](#file-management)
10. [API Reference](#api-reference)
11. [Deployment](#deployment)
12. [Troubleshooting](#troubleshooting)
13. [Contributing](#contributing)

---

## <img src="docs/icons/lucide/target.svg" width="24" valign="middle"> Overview

Kuppi is a full-featured educational platform designed specifically for the Sri Lankan education system. It provides a seamless environment for:

- **Students** to find courses, connect with teachers, access learning materials, download past papers, ask questions, and use exam tools
- **Teachers** to create courses, offer services, share resources, and manage students
- **Parents** to follow their child's learning and stay informed
- **Administrators** to oversee the platform and make announcements

Beyond the marketplace, Kuppi bundles a free, trilingual (English / Sinhala / Tamil) **exam resource hub** — past papers, a Z-score calculator, university cut-off marks, a Grade 5 Scholarship hub, A/L stream guidance, and a community Q&A.

```
┌─────────────────────────────────────────────────────────────────┐
│                        KUPPI PLATFORM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │  STUDENTS   │◄──►│  MESSAGING  │◄──►│  TEACHERS   │        │
│   └─────────────┘    │   & VIDEO   │    └─────────────┘        │
│         │            └─────────────┘           │                │
│         │                   ▲                  │                │
│         ▼                   │                  ▼                │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │   COURSES   │◄──►│   FIREBASE  │◄──►│   OFFERS    │        │
│   │  & REQUESTS │    │  FIRESTORE  │    │ & MATERIALS │        │
│   └─────────────┘    └─────────────┘    └─────────────┘        │
│                             ▲                                   │
│                             │                                   │
│                      ┌─────────────┐                           │
│                      │    ADMIN    │                           │
│                      │  DASHBOARD  │                           │
│                      └─────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## <img src="docs/icons/lucide/sparkles.svg" width="24" valign="middle"> Features

### <img src="docs/icons/lucide/graduation-cap.svg" width="22" valign="middle"> For Students

| | Feature | Description |
|:--:|---------|-------------|
| <img src="docs/icons/lucide/book-open.svg" width="18"> | **Course Browser** | Browse and filter courses by level (O/L, A/L, University, Masters), category, and medium |
| <img src="docs/icons/lucide/download.svg" width="18"> | **Material Downloads** | Access and download study materials (PDFs, images) |
| <img src="docs/icons/lucide/video.svg" width="18"> | **Live Sessions** | Join live sessions via integrated meeting links |
| <img src="docs/icons/lucide/square-pen.svg" width="18"> | **Learn Requests** | Post requests to find specific teachers or subjects |
| <img src="docs/icons/lucide/message-circle.svg" width="18"> | **Direct Messaging** | Chat with teachers in real-time |
| <img src="docs/icons/lucide/video.svg" width="18"> | **Video Calls** | One-on-one video calls with teachers |
| <img src="docs/icons/lucide/circle-help.svg" width="18"> | **Q&A** | Ask exam questions and get answers from students and tutors |
| <img src="docs/icons/lucide/users.svg" width="18"> | **Study Buddies** | Find study partners matched by level, district, and shared subjects |
| <img src="docs/icons/lucide/globe.svg" width="18"> | **Trilingual Support** | English, Sinhala, and Tamil language options |

### <img src="docs/icons/lucide/presentation.svg" width="22" valign="middle"> For Teachers

| | Feature | Description |
|:--:|---------|-------------|
| <img src="docs/icons/lucide/library.svg" width="18"> | **Course Creation** | Create comprehensive courses with modules |
| <img src="docs/icons/lucide/upload.svg" width="18"> | **Material Upload** | Upload PDFs and images (lossless storage) |
| <img src="docs/icons/lucide/calendar.svg" width="18"> | **Live Scheduling** | Schedule live sessions (Zoom, Google Meet, Jitsi) |
| <img src="docs/icons/lucide/megaphone.svg" width="18"> | **Teaching Offers** | Advertise your teaching services |
| <img src="docs/icons/lucide/file-text.svg" width="18"> | **Community Uploads** | Share past papers, model papers, and marking schemes |
| <img src="docs/icons/lucide/users.svg" width="18"> | **Student Management** | View enrolled students and communicate |
| <img src="docs/icons/lucide/message-circle.svg" width="18"> | **Messaging** | Real-time chat with students |
| <img src="docs/icons/lucide/video.svg" width="18"> | **Video Calls** | Video conferencing with students |

### <img src="docs/icons/lucide/users.svg" width="22" valign="middle"> For Parents

| | Feature | Description |
|:--:|---------|-------------|
| <img src="docs/icons/lucide/layout-dashboard.svg" width="18"> | **Parent Dashboard** | Follow your child's learning activity |
| <img src="docs/icons/lucide/megaphone.svg" width="18"> | **Announcements** | Stay informed with platform updates |

### <img src="docs/icons/lucide/shield-check.svg" width="22" valign="middle"> For Administrators

| | Feature | Description |
|:--:|---------|-------------|
| <img src="docs/icons/lucide/layout-dashboard.svg" width="18"> | **Dashboard** | Overview of platform statistics |
| <img src="docs/icons/lucide/user-cog.svg" width="18"> | **User Management** | Manage student, teacher, and parent accounts |
| <img src="docs/icons/lucide/clipboard-list.svg" width="18"> | **Content Moderation** | Review and manage courses, offers, requests |
| <img src="docs/icons/lucide/megaphone.svg" width="18"> | **Announcements** | Post platform-wide announcements |

### <img src="docs/icons/lucide/ruler.svg" width="22" valign="middle"> Study Resources & Exam Tools

Free, trilingual (English / Sinhala / Tamil) resources for the Sri Lankan exam system — no login required to browse.

| | Feature | Description |
|:--:|---------|-------------|
| <img src="docs/icons/lucide/file-text.svg" width="18"> | **Past Papers Archive** | Free O/L, A/L, and Grade 5 Scholarship past papers, model papers, and marking schemes — sourced from the Department of Examinations, Sri Lanka |
| <img src="docs/icons/lucide/handshake.svg" width="18"> | **Community Papers** | Past papers and resources uploaded and curated by Kuppi teachers and students |
| <img src="docs/icons/lucide/calculator.svg" width="18"> | **Z-Score Calculator** | Estimate your A/L Z-score from raw marks using published subject means and standard deviations |
| <img src="docs/icons/lucide/graduation-cap.svg" width="18"> | **UGC Cut-off Marks** | Browse minimum Z-score cut-offs for universities and courses, filterable by stream, district, and subject |
| <img src="docs/icons/lucide/trophy.svg" width="18"> | **Grade 5 Scholarship Hub** | Past papers, model papers, and exam guidance for the Grade 5 Scholarship Examination |
| <img src="docs/icons/lucide/compass.svg" width="18"> | **A/L Streams Guide** | Explore Physical Science, Biological Science, Commerce, Arts, and Technology streams — subjects, careers, and tutors |

### <img src="docs/icons/lucide/lock.svg" width="22" valign="middle"> Authentication & Platform

| | Feature | Description |
|:--:|---------|-------------|
| <img src="docs/icons/lucide/mail.svg" width="18"> | **Email OTP Sign-In** | Passwordless login via one-time codes sent by email |
| <img src="docs/icons/logos/google-icon.svg" width="16"> | **Google Sign-In** | One-tap sign-in with a Google account |
| <img src="docs/icons/lucide/globe.svg" width="18"> | **Trilingual UI** | Full English, Sinhala, and Tamil interface |
| <img src="docs/icons/lucide/trending-up.svg" width="18"> | **SEO & AdSense** | Server-rendered metadata, sitemap, and optional Google AdSense integration |

---

## <img src="docs/icons/lucide/image.svg" width="24" valign="middle"> Screenshots

> Desktop views of the live app. The full set — including mobile and the teacher workspace — lives in [`screenshots/`](screenshots/).

<table>
  <tr>
    <td align="center" width="50%"><img src="screenshots/local/desktop/02-streams.png" width="420"><br><b>A/L Streams Guide</b></td>
    <td align="center" width="50%"><img src="screenshots/local/desktop/03-courses.png" width="420"><br><b>Course Marketplace</b></td>
  </tr>
  <tr>
    <td align="center"><img src="screenshots/local/desktop/04-past-papers.png" width="420"><br><b>Past Papers Archive</b></td>
    <td align="center"><img src="screenshots/local/desktop/05-z-score.png" width="420"><br><b>Z-Score Calculator</b></td>
  </tr>
  <tr>
    <td align="center"><img src="screenshots/local/desktop/06-ugc-cutoffs.png" width="420"><br><b>UGC Cut-off Marks</b></td>
    <td align="center"><img src="screenshots/local/desktop/07-scholarship.png" width="420"><br><b>Grade 5 Scholarship Hub</b></td>
  </tr>
  <tr>
    <td align="center"><img src="screenshots/local/desktop/08-qa.png" width="420"><br><b>Community Q&amp;A</b></td>
    <td align="center"><img src="screenshots/local/desktop/15-auth-login.png" width="420"><br><b>Sign In — Email OTP &amp; Google</b></td>
  </tr>
</table>

---

## <img src="docs/icons/lucide/wrench.svg" width="24" valign="middle"> Tech Stack

```
┌────────────────────────────────────────────────────────────┐
│                      FRONTEND                              │
├────────────────────────────────────────────────────────────┤
│  Next.js 14 (App Router)  │  TypeScript  │  Tailwind CSS  │
│  i18n: English / Sinhala / Tamil  │  Google AdSense       │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│                      BACKEND                               │
├────────────────────────────────────────────────────────────┤
│  Firebase Auth (Email OTP + Google)  │  Firebase Admin SDK │
│  Cloud Firestore  │  Nodemailer (OTP)  │  WebRTC (Video)   │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│                      STORAGE                               │
├────────────────────────────────────────────────────────────┤
│  Server Filesystem (Lossless)  │  Firestore (Metadata)    │
└────────────────────────────────────────────────────────────┘
```

---

## <img src="docs/icons/lucide/rocket.svg" width="24" valign="middle"> Installation

### Prerequisites

- **Node.js** 18.x or higher
- **npm** or **yarn**
- **Firebase Account** (free tier works)
- **Git**

### Step 1: Clone the Repository

```bash
git clone https://github.com/gaveen99/kuppi.git
cd kuppi
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Firebase Setup

#### 3.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Add Project"**
3. Enter project name (e.g., "kuppi-learning")
4. Disable Google Analytics (optional)
5. Click **"Create Project"**

```
┌─────────────────────────────────────────────────────────────┐
│                  Firebase Console                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    [+ Add Project]                                          │
│                                                             │
│    Project name: kuppi-learning                             │
│    ☐ Enable Google Analytics                                │
│                                                             │
│    [Create Project]                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 3.2 Enable Authentication

1. In Firebase Console, go to **Build → Authentication**
2. Click **"Get Started"**
3. Select **"Email/Password"** provider
4. Enable **"Email/Password"** toggle
5. Click **"Save"**

```
┌─────────────────────────────────────────────────────────────┐
│              Authentication → Sign-in method                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    Provider           Status                                │
│    ─────────────────────────────                           │
│    ✅ Email/Password   Enabled                              │
│    ☐ Google           Disabled                              │
│    ☐ Facebook         Disabled                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 3.3 Create Firestore Database

1. Go to **Build → Firestore Database**
2. Click **"Create Database"**
3. Select **"Start in test mode"** (we'll add rules later)
4. Choose your region (asia-south1 for Sri Lanka)
5. Click **"Enable"**

#### 3.4 Get Firebase Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll down to **"Your apps"**
3. Click **"Web"** icon (</>) 
4. Register app name (e.g., "kuppi-web")
5. Copy the configuration object

```javascript
// Your Firebase config will look like this:
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "kuppi-learning.firebaseapp.com",
  projectId: "kuppi-learning",
  storageBucket: "kuppi-learning.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### Step 4: Environment Configuration

Create `.env.local` file in the root directory:

```bash
# Create from example
cp .env.local.example .env.local
```

Edit `.env.local` with your Firebase credentials:

```env
# Firebase Configuration (client — NEXT_PUBLIC_* is exposed to the browser)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Public site URL (SEO metadata, sitemap, OpenGraph)
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Firebase Admin (SERVER-ONLY) — mints custom tokens for OTP sign-in.
# Project Settings → Service accounts → Generate new private key.
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"

# SMTP for sending OTP / contact emails (Gmail App Password example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail_address@gmail.com
SMTP_PASS=your_app_password_here
MAIL_FROM="Kuppi <your_gmail_address@gmail.com>"
CONTACT_INBOX=you@example.com

# File Upload Configuration
UPLOADS_DIR=./uploads
MAX_FILE_SIZE=10485760

# Google AdSense (optional — leave blank to show dev placeholders)
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX

# WebRTC TURN Server (Optional - for video calls behind NAT)
NEXT_PUBLIC_TURN_SERVER_URL=
NEXT_PUBLIC_TURN_SERVER_USERNAME=
NEXT_PUBLIC_TURN_SERVER_CREDENTIAL=
```

> ℹ️ See `.env.local.example` for the full, commented list of variables. Never commit real secrets — `.env*.local` and `.env.production` are gitignored.

### Step 5: Deploy Firestore Security Rules

1. Go to **Firestore Database → Rules**
2. Copy contents from `firestore.rules`
3. Paste and click **"Publish"**

```
┌─────────────────────────────────────────────────────────────┐
│                  Firestore Rules Editor                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  rules_version = '2';                                       │
│  service cloud.firestore {                                  │
│    match /databases/{database}/documents {                  │
│      // Users collection                                    │
│      match /users/{userId} {                                │
│        allow read: if request.auth != null;                 │
│        allow write: if request.auth.uid == userId;          │
│      }                                                      │
│      // ... more rules                                      │
│    }                                                        │
│  }                                                          │
│                                                             │
│  [Publish]                                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Step 6: Create Required Indexes

Firebase will prompt you to create indexes when needed. You can also create them manually:

| Collection | Fields | Order |
|------------|--------|-------|
| `courses` | `isPublished`, `level`, `createdAt` | Asc, Asc, Desc |
| `teacherOffers` | `isActive`, `createdAt` | Asc, Desc |
| `learnRequests` | `isActive`, `createdAt` | Asc, Desc |
| `messages` | `conversationId`, `sentAt` | Asc, Asc |
| `conversations` | `participantIds`, `lastMessageAt` | Array, Desc |
| `videoCalls` | `status`, `participantIds` | Asc, Array |

### Step 7: Create Uploads Directory

```bash
mkdir -p uploads
```

### Step 8: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## <img src="docs/icons/lucide/book-open.svg" width="24" valign="middle"> User Guide

### Getting Started

#### Registration

```
┌─────────────────────────────────────────────────────────────┐
│                    Create Account                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Full Name:     [____________________]                      │
│                                                             │
│  Email:         [____________________]                      │
│                                                             │
│  Password:      [____________________]                      │
│                                                             │
│  I am a:        ○ Student    ● Teacher                      │
│                                                             │
│  Phone:         [____________________]                      │
│                                                             │
│               [Create Account]                              │
│                                                             │
│  Already have an account? Login                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

1. Click **"Register"** in the navigation bar
2. Fill in your details:
   - **Full Name**: Your display name
   - **Email**: Valid email address
   - **Password**: Minimum 6 characters
   - **Role**: Select Student or Teacher
   - **Phone**: Contact number (optional)
3. Click **"Create Account"**
4. You'll be automatically logged in

#### Login

1. Click **"Login"** in the navigation bar
2. Enter your email and password
3. Click **"Sign In"**

---

### For Students

#### <img src="docs/icons/lucide/library.svg" width="20" valign="middle"> Browsing Courses

```
┌─────────────────────────────────────────────────────────────┐
│                    Browse Courses                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Filters:                                                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Level    ▼  │ │ Category ▼  │ │ Medium   ▼  │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📘 Mathematics A/L                                   │   │
│  │ By: John Teacher                                     │   │
│  │ Level: A/L  │  Category: Mathematics                 │   │
│  │ ⭐ 4.5  │  👥 25 students                            │   │
│  │                                    [View Course]     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📗 Physics O/L                                       │   │
│  │ By: Jane Instructor                                  │   │
│  │ Level: O/L  │  Category: Science                     │   │
│  │ ⭐ 4.8  │  👥 42 students                            │   │
│  │                                    [View Course]     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

1. Navigate to **"Courses"** from the menu
2. Use filters to narrow down:
   - **Level**: O/L, A/L, University, Masters
   - **Category**: Mathematics, Science, Languages, etc.
   - **Medium**: English, Sinhala, Tamil
3. Click **"View Course"** to see details

#### <img src="docs/icons/lucide/book-open.svg" width="20" valign="middle"> Course Details & Enrollment

```
┌─────────────────────────────────────────────────────────────┐
│                  Mathematics A/L                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  👤 Teacher: John Teacher                                   │
│  📧 Contact: john@example.com                               │
│                                                             │
│  📝 Description:                                            │
│  Complete A/L Mathematics course covering Pure Mathematics, │
│  Applied Mathematics, and Statistics.                       │
│                                                             │
│  📋 Modules:                                                │
│  ├── 📁 Module 1: Algebra                                   │
│  │   ├── 📄 Introduction.pdf                                │
│  │   └── 📄 Exercises.pdf                                   │
│  ├── 📁 Module 2: Calculus                                  │
│  │   └── 📄 Derivatives.pdf                                 │
│  └── 📁 Module 3: Statistics                                │
│                                                             │
│  📅 Live Sessions:                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Dec 15, 2025 - 4:00 PM │ Topic: Integration        │   │
│  │                              [Join Meeting]         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [💬 Message Teacher]  [Enroll in Course]                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

1. Click on a course to view details
2. See available modules and materials
3. Download materials by clicking on files
4. Click **"Enroll in Course"** to enroll
5. Click **"Message Teacher"** to start a conversation

#### <img src="docs/icons/lucide/square-pen.svg" width="20" valign="middle"> Posting Learn Requests

```
┌─────────────────────────────────────────────────────────────┐
│                  Post Learn Request                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Subject:       [Combined Mathematics_________]             │
│                                                             │
│  Level:         [A/L ▼]                                     │
│                                                             │
│  Category:      [Mathematics ▼]                             │
│                                                             │
│  Medium:        [English ▼]                                 │
│                                                             │
│  Description:                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Looking for a teacher who can help with Complex     │   │
│  │ Numbers and Differential Equations. Prefer          │   │
│  │ weekend sessions.                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Budget:        [Rs. 2000/hour______________]               │
│                                                             │
│                    [Post Request]                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

1. Go to **"Learn"** → **"Post Request"**
2. Fill in the subject details
3. Describe what you're looking for
4. Add your budget (optional)
5. Click **"Post Request"**

---

### For Teachers

#### <img src="docs/icons/lucide/library.svg" width="20" valign="middle"> Creating a Course

```
┌─────────────────────────────────────────────────────────────┐
│                   Create New Course                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Course Title:  [____________________]                      │
│                                                             │
│  Description:                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Level:         [Select Level ▼]                            │
│                 ○ O/L  ○ A/L  ○ University  ○ Masters       │
│                                                             │
│  Category:      [Select Category ▼]                         │
│                                                             │
│  Medium:        [Select Medium ▼]                           │
│                                                             │
│  Price:         [Rs. ____________]                          │
│                                                             │
│                 [Create Course]                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Step-by-Step:**

1. Go to **Teacher Dashboard**
2. Click **"Create New Course"**
3. Fill in basic information:
   - **Title**: Clear, descriptive name
   - **Description**: What students will learn
   - **Level**: Educational level
   - **Category**: Subject area
   - **Medium**: Teaching language
   - **Price**: Course fee (optional)
4. Click **"Create Course"**

#### <img src="docs/icons/lucide/folder.svg" width="20" valign="middle"> Adding Modules & Materials

```
┌─────────────────────────────────────────────────────────────┐
│                    Manage Course                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Modules:                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ + Add New Module                                    │   │
│  │                                                     │   │
│  │ Module Name:  [Introduction to Calculus___]         │   │
│  │                                                     │   │
│  │ Upload Material: [Choose File] PDF, Images only     │   │
│  │                                                     │   │
│  │               [Add Module]                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Current Modules:                                           │
│  ├── 📁 Module 1: Basics                                   │
│  │   ├── 📄 lecture-notes.pdf        [🗑️ Delete]          │
│  │   └── 🖼️ diagram.png              [🗑️ Delete]          │
│  └── 📁 Module 2: Advanced                                 │
│      └── 📄 exercises.pdf            [🗑️ Delete]          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

1. Open your course for editing
2. Scroll to **"Modules"** section
3. Enter module name
4. Click **"Choose File"** to upload materials
5. Click **"Add Module"**

**Supported File Types:**
- <img src="docs/icons/lucide/file-text.svg" width="16" valign="middle"> PDF documents (`.pdf`)
- <img src="docs/icons/lucide/image.svg" width="16" valign="middle"> Images (`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`)
- <img src="docs/icons/lucide/package.svg" width="16" valign="middle"> Max file size: 10MB per file

#### <img src="docs/icons/lucide/calendar.svg" width="20" valign="middle"> Scheduling Live Sessions

```
┌─────────────────────────────────────────────────────────────┐
│                  Schedule Live Session                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Session Title: [Integration Techniques_______]             │
│                                                             │
│  Date:          [2025-12-15]  Time: [16:00]                │
│                                                             │
│  Duration:      [60 minutes ▼]                              │
│                                                             │
│  Meeting Link:                                              │
│  [https://meet.google.com/abc-defg-hij_______]             │
│                                                             │
│  Description:                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ We'll cover integration by parts and substitution   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                 [Schedule Session]                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

1. In course editor, go to **"Live Sessions"**
2. Enter session details
3. Paste your meeting link (Google Meet, Zoom, Jitsi)
4. Click **"Schedule Session"**

#### <img src="docs/icons/lucide/megaphone.svg" width="20" valign="middle"> Creating Teaching Offers

```
┌─────────────────────────────────────────────────────────────┐
│                  Post Teaching Offer                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Title:         [Expert A/L Mathematics Tutor___]           │
│                                                             │
│  Subject:       [Combined Mathematics__________]            │
│                                                             │
│  Level:         [A/L ▼]                                     │
│                                                             │
│  Category:      [Mathematics ▼]                             │
│                                                             │
│  Description:                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 10+ years experience teaching A/L Combined Maths.   │   │
│  │ Specializing in helping students achieve A grades.  │   │
│  │ Flexible timing, online and in-person available.    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Rate:          [Rs. 1500/hour_________________]            │
│                                                             │
│                  [Post Offer]                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

1. Go to **"Teach"** page
2. Click **"Post New Offer"**
3. Describe your teaching services
4. Set your rate
5. Click **"Post Offer"**

---

### For Administrators

#### Accessing Admin Dashboard

1. First, create an account (register as teacher or student)
2. Go to Firebase Console → Firestore → `users` collection
3. Find your user document
4. Change the `role` field from `"student"` or `"teacher"` to `"admin"`

```javascript
// Before
{
  "name": "Admin User",
  "email": "admin@example.com",
  "role": "teacher",  // Change this
  ...
}

// After
{
  "name": "Admin User",
  "email": "admin@example.com",
  "role": "admin",    // To this
  ...
}
```

#### Admin Dashboard Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   Admin Dashboard                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 Platform Statistics                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 👥 Users │  │ 📚 Cours │  │ 📢 Offer │  │ 📝 Reque │   │
│  │   156    │  │    42    │  │    28    │  │    35    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  ⚡ Quick Actions                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [📣 Create Announcement] [👥 Manage Users]          │   │
│  │ [📚 Manage Courses] [📝 Manage Content]             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  📋 Recent Activity                                         │
│  • New user registered: John Student                        │
│  • Course published: Physics O/L                            │
│  • New offer posted: Chemistry A/L Tutor                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Creating Announcements

```
┌─────────────────────────────────────────────────────────────┐
│                  Create Announcement                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Title:         [Platform Maintenance Notice____]           │
│                                                             │
│  Type:          ○ Info  ● Warning  ○ Important              │
│                                                             │
│  Content:                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ The platform will be undergoing maintenance on      │   │
│  │ December 20th from 2:00 AM to 4:00 AM. Some         │   │
│  │ features may be temporarily unavailable.            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                  [Publish Announcement]                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## <img src="docs/icons/lucide/message-circle.svg" width="24" valign="middle"> Messaging System

### Features

- <img src="docs/icons/lucide/circle-check.svg" width="16" valign="middle"> **Real-time messaging** with instant updates
- <img src="docs/icons/lucide/circle-check.svg" width="16" valign="middle"> **Read receipts** (single tick = sent, double tick = delivered, blue = read)
- <img src="docs/icons/lucide/circle-check.svg" width="16" valign="middle"> **Message editing** (with "edited" indicator)
- <img src="docs/icons/lucide/circle-check.svg" width="16" valign="middle"> **Message deletion** (30-minute window)
- <img src="docs/icons/lucide/circle-check.svg" width="16" valign="middle"> **File attachments** (up to 5 files per message)
- <img src="docs/icons/lucide/circle-check.svg" width="16" valign="middle"> **Image previews** inline in chat
- <img src="docs/icons/lucide/circle-check.svg" width="16" valign="middle"> **Video calling** directly from chat

### Message Interface

```
┌─────────────────────────────────────────────────────────────┐
│  💬 Chat with John Teacher                    [📹 Video]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                              ┌───────────────────────────┐ │
│                              │ Hi, I need help with     │ │
│                              │ calculus problems.       │ │
│                              │              2:30 PM ✓✓  │ │
│                              └───────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────┐                             │
│  │ Sure! What specific       │                             │
│  │ topic are you stuck on?   │                             │
│  │ 2:32 PM                   │                             │
│  └───────────────────────────┘                             │
│                                                             │
│                              ┌───────────────────────────┐ │
│                              │ 🖼️ [problem.png]          │ │
│                              │ This integration problem  │ │
│                              │              2:35 PM ✓✓🔵 │ │
│                              └───────────────────────────┘ │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  📎 [________________Type a message___________] [Send]     │
└─────────────────────────────────────────────────────────────┘
```

### Message Status Indicators

| Icon | Meaning |
|------|---------|
| ✓ | Message sent |
| ✓✓ | Message delivered |
| ✓✓ (blue) | Message read |
| *(edited)* | Message was edited |
| <img src="docs/icons/lucide/ban.svg" width="18" valign="middle"> | Message was deleted |

### Sending Attachments

1. Click the **<img src="docs/icons/lucide/paperclip.svg" width="16" valign="middle"> paperclip** icon
2. Select up to **5 files** (max 10MB each)
3. Preview selected files
4. Add optional text message
5. Click **Send**

### Editing Messages

1. Hover over your message
2. Click the **⋮ menu** icon
3. Select **"Edit"**
4. Modify your message
5. Press **"Save"**

### Deleting Messages

<img src="docs/icons/lucide/triangle-alert.svg" width="16" valign="middle"> **Important**: Messages can only be deleted within **30 minutes** of sending.

1. Hover over your message
2. Click the **⋮ menu** icon
3. Select **"Delete"**
4. Message will show as "This message was deleted"

---

## <img src="docs/icons/lucide/video.svg" width="24" valign="middle"> Video Calling

### Features

- <img src="docs/icons/lucide/circle-check.svg" width="16" valign="middle"> **One-on-one video calls**
- <img src="docs/icons/lucide/circle-check.svg" width="16" valign="middle"> **Pre-call preview** (see yourself before joining)
- <img src="docs/icons/lucide/circle-check.svg" width="16" valign="middle"> **Camera toggle** (on/off)
- <img src="docs/icons/lucide/circle-check.svg" width="16" valign="middle"> **Microphone toggle** (mute/unmute)
- <img src="docs/icons/lucide/circle-check.svg" width="16" valign="middle"> **Screen sharing**
- <img src="docs/icons/lucide/circle-check.svg" width="16" valign="middle"> **Incoming call notifications** with ringtone
- <img src="docs/icons/lucide/circle-check.svg" width="16" valign="middle"> **Call status** (connecting, ringing, active)

### Starting a Video Call

```
┌─────────────────────────────────────────────────────────────┐
│                    Pre-Call Screen                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              ┌─────────────────────────┐                   │
│              │                         │                   │
│              │     📹 Your Preview     │                   │
│              │                         │                   │
│              │    [Your video here]    │                   │
│              │                         │                   │
│              └─────────────────────────┘                   │
│                                                             │
│              Calling: John Teacher                          │
│                                                             │
│         [🎥 Camera On]    [Start Call]                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

1. Open a conversation
2. Click the **<img src="docs/icons/lucide/video.svg" width="16" valign="middle"> Video** button
3. Preview your camera (toggle on/off)
4. Click **"Start Call"**

### During a Call

```
┌─────────────────────────────────────────────────────────────┐
│                     Video Call                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │                                                     │   │
│  │              Remote Video (Large)                   │   │
│  │                                                     │   │
│  │                                                     │   │
│  │                                   ┌──────────┐     │   │
│  │                                   │ You      │     │   │
│  │                                   │ (small)  │     │   │
│  │                                   └──────────┘     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│        [🎤 Mute]  [📹 Video]  [📺 Share]  [📴 End]         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Call Controls

| Button | Action |
|--------|--------|
| <img src="docs/icons/lucide/mic.svg" width="18" valign="middle"> | Toggle microphone (mute/unmute) |
| <img src="docs/icons/lucide/video.svg" width="18" valign="middle"> | Toggle camera (on/off) |
| <img src="docs/icons/lucide/screen-share.svg" width="18" valign="middle"> | Share your screen |
| <img src="docs/icons/lucide/phone-off.svg" width="18" valign="middle"> | End the call |

### Receiving a Call

```
┌─────────────────────────────────────────────────────────────┐
│                   Incoming Call                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                      📞 🔔                                  │
│                                                             │
│               John Teacher is calling...                    │
│                                                             │
│         [✅ Accept]           [❌ Decline]                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- Click **"Accept"** to answer with video
- Click **"Decline"** to reject the call

---

## <img src="docs/icons/lucide/folder.svg" width="24" valign="middle"> File Management

### Upload Specifications

| Property | Value |
|----------|-------|
| Max file size | 10MB per file |
| Max files per message | 5 files |
| Allowed types | PDF, JPG, JPEG, PNG, GIF, WEBP |
| Storage | Server filesystem (lossless) |

### File Storage Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    File Upload Flow                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   User uploads file                                         │
│         │                                                   │
│         ▼                                                   │
│   ┌─────────────┐                                          │
│   │ Validate    │ ── File type check                       │
│   │ File        │ ── Size limit check                      │
│   └─────────────┘                                          │
│         │                                                   │
│         ▼                                                   │
│   ┌─────────────┐                                          │
│   │ Generate    │ ── UUID-based filename                   │
│   │ Unique Name │ ── Prevents collisions                   │
│   └─────────────┘                                          │
│         │                                                   │
│         ▼                                                   │
│   ┌─────────────┐      ┌─────────────┐                     │
│   │ Save to     │ ──── │ /uploads/   │                     │
│   │ Filesystem  │      │ directory   │                     │
│   └─────────────┘      └─────────────┘                     │
│         │                                                   │
│         ▼                                                   │
│   ┌─────────────┐                                          │
│   │ Return URL  │ ── /api/files/{filename}                 │
│   └─────────────┘                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Accessing Files

Files are served through the API route:
```
GET /api/files/{filename}
```

- Images are displayed inline
- Other files trigger download

---

## <img src="docs/icons/lucide/settings.svg" width="24" valign="middle"> API Reference

### File Upload

**Endpoint:** `POST /api/upload`

**Request:**
```bash
curl -X POST \
  -F "file=@document.pdf" \
  http://localhost:3000/api/upload
```

**Response:**
```json
{
  "success": true,
  "file": {
    "filename": "a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf",
    "originalFileName": "document.pdf",
    "filePath": "/uploads/a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf",
    "fileSize": 1024000,
    "mimeType": "application/pdf"
  }
}
```

### File Download

**Endpoint:** `GET /api/files/[filename]`

**Example:**
```bash
curl http://localhost:3000/api/files/a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf
```

---

## <img src="docs/icons/lucide/upload.svg" width="24" valign="middle"> Deployment

### Production with PM2

```bash
# Build the application
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs kuppi

# Restart
pm2 restart kuppi
```

### Environment Variables for Production

```env
# Production .env
NODE_ENV=production
PORT=3000

# Firebase (same as development)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# File uploads
UPLOADS_DIR=/var/www/kuppi/uploads
MAX_FILE_SIZE=10485760

# TURN Server (recommended for production video calls)
NEXT_PUBLIC_TURN_SERVER_URL=turn:your-turn-server.com:3478
NEXT_PUBLIC_TURN_SERVER_USERNAME=username
NEXT_PUBLIC_TURN_SERVER_CREDENTIAL=password
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Handle file uploads
    client_max_body_size 10M;
}
```

### Deployment Checklist

- [ ] Environment variables configured
- [ ] Firestore security rules deployed
- [ ] Required indexes created
- [ ] Uploads directory created with write permissions
- [ ] TURN server configured (for video calls)
- [ ] SSL certificate installed
- [ ] PM2 configured for auto-restart
- [ ] Nginx configured as reverse proxy
- [ ] Backup strategy in place

---

## <img src="docs/icons/lucide/circle-help.svg" width="24" valign="middle"> Troubleshooting

### Common Issues

#### "Firebase: No Firebase App '[DEFAULT]' has been created"

**Solution:** Check your `.env.local` file has all required Firebase variables.

#### Video calls not connecting

**Possible causes:**
1. **NAT/Firewall issues** - Set up a TURN server
2. **Browser permissions** - Allow camera/microphone access
3. **HTTPS required** - Video calls require HTTPS in production

#### File upload fails

**Check:**
1. `uploads` directory exists and has write permissions
2. File size is under 10MB
3. File type is allowed (PDF, images)

#### Messages not updating in real-time

**Solutions:**
1. Check Firestore indexes are created
2. Verify Firestore security rules
3. The system will automatically fall back to polling mode

### Debug Mode

Enable debug logging:

```javascript
// In browser console
localStorage.setItem('debug', 'true');
```

---

## <img src="docs/icons/lucide/handshake.svg" width="24" valign="middle"> Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for functions
- Write meaningful commit messages

---

## <img src="docs/icons/lucide/file-text.svg" width="24" valign="middle"> License

This project is open source and available under the [MIT License](LICENSE).

---

## <img src="docs/icons/lucide/mail.svg" width="24" valign="middle"> Support

- **Issues:** [GitHub Issues](https://github.com/gaveen99/kuppi/issues)
- **Discussions:** [GitHub Discussions](https://github.com/gaveen99/kuppi/discussions)

---

<div align="center">

**Built with <img src="docs/icons/lucide/heart.svg" width="15" valign="middle"> for Sri Lankan students and educators**

[<img src="docs/icons/lucide/arrow-up.svg" width="14" valign="middle"> Back to Top](#kuppi---learning-platform-for-sri-lankan-students)

</div>
