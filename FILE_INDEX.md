# Kuppi Project File Index

Complete list of all files in the project with descriptions.

## 📋 Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Project dependencies and scripts |
| `tsconfig.json` | TypeScript configuration |
| `next.config.js` | Next.js configuration |
| `tailwind.config.ts` | Tailwind CSS theme configuration |
| `postcss.config.js` | PostCSS configuration |
| `.gitignore` | Git ignore rules |
| `.env.local.example` | Environment variable template |
| `firestore.rules` | Firestore security rules |

## 📚 Documentation

| File | Purpose |
|------|---------|
| `README.md` | Complete project documentation |
| `QUICKSTART.md` | 5-minute setup guide |
| `PROJECT_SUMMARY.md` | Project overview and architecture |
| `DEPLOYMENT_CHECKLIST.md` | Pre-deployment checklist |
| `CONTRIBUTING.md` | Contribution guidelines |

## 🎨 Frontend - Pages

### Authentication
- `src/app/auth/login/page.tsx` - Login page
- `src/app/auth/register/page.tsx` - Registration page

### Dashboards
- `src/app/dashboard/student/page.tsx` - Student dashboard
- `src/app/dashboard/teacher/page.tsx` - Teacher dashboard
- `src/app/dashboard/admin/page.tsx` - Admin dashboard

### Courses
- `src/app/courses/page.tsx` - Course listing with filters
- `src/app/courses/create/page.tsx` - Create new course
- `src/app/courses/[id]/page.tsx` - Course detail page

### Marketplace
- `src/app/teach/page.tsx` - Teacher offers management
- `src/app/offers/page.tsx` - Browse teacher offers
- `src/app/learn/page.tsx` - Student learn requests

### Messaging
- `src/app/messages/page.tsx` - Messages inbox
- `src/app/messages/[id]/page.tsx` - Conversation view

### Other Pages
- `src/app/page.tsx` - Landing page
- `src/app/announcements/page.tsx` - Announcements list
- `src/app/layout.tsx` - Root layout
- `src/app/globals.css` - Global styles

## 🔧 Backend - API Routes

| File | Purpose |
|------|---------|
| `src/app/api/upload/route.ts` | File upload endpoint |
| `src/app/api/files/[filename]/route.ts` | File download endpoint |

## 🧩 Components

| File | Purpose |
|------|---------|
| `src/components/Navbar.tsx` | Navigation bar component |

## 🔐 Authentication & Context

| File | Purpose |
|------|---------|
| `src/contexts/AuthContext.tsx` | Authentication context provider |

## 📦 Libraries & Utilities

| File | Purpose |
|------|---------|
| `src/lib/firebase.ts` | Firebase configuration |
| `src/lib/utils.ts` | Utility functions |

## 📘 Types

| File | Purpose |
|------|---------|
| `src/types/index.ts` | TypeScript type definitions |

## 🔨 Scripts

| File | Purpose |
|------|---------|
| `scripts/setup.js` | Initial project setup |
| `scripts/check-env.js` | Environment validation |

## 📁 Directories

| Directory | Purpose |
|-----------|---------|
| `uploads/` | File uploads storage (gitignored) |
| `node_modules/` | NPM dependencies (gitignored) |
| `.next/` | Next.js build output (gitignored) |

## 📊 File Counts

- **Total TypeScript files**: ~30
- **Total documentation files**: 5
- **Total configuration files**: 7
- **Total React components**: ~20
- **API routes**: 2

## 🗺️ Navigation Map

```
Landing (/)
├── Auth
│   ├── Login (/auth/login)
│   └── Register (/auth/register)
│
├── Courses
│   ├── Browse (/courses)
│   ├── Create (/courses/create) [Teacher]
│   └── Detail (/courses/[id])
│
├── Dashboards
│   ├── Student (/dashboard/student)
│   ├── Teacher (/dashboard/teacher)
│   └── Admin (/dashboard/admin)
│
├── Marketplace
│   ├── Teacher Offers (/teach) [Teacher]
│   ├── Browse Offers (/offers)
│   └── Learn Requests (/learn) [Student]
│
├── Communication
│   ├── Messages (/messages)
│   └── Conversation (/messages/[id])
│
└── Content
    └── Announcements (/announcements)
```

## 🔄 Data Flow

```
User Registration
└─> AuthContext
    └─> Firestore (users collection)
        └─> Role-based redirect to dashboard

Course Creation
└─> Create Course Form
    └─> Firestore (courses collection)
        └─> Add modules (courseModules)
            └─> Upload materials (materials + files)
                └─> Schedule sessions (liveSessions)

File Upload
└─> Upload Form
    └─> API Route (/api/upload)
        └─> Server Filesystem (uploads/)
            └─> Firestore metadata (materials)

Messaging
└─> Contact Teacher/Student
    └─> Create/Find Conversation
        └─> Firestore (conversations)
            └─> Send Messages (messages)
                └─> Real-time Updates (onSnapshot)
```

## 🎯 Key Files for Customization

### Branding
- `src/components/Navbar.tsx` - Logo and navigation
- `tailwind.config.ts` - Colors and theme
- `src/app/globals.css` - Global styles

### Content
- `src/lib/utils.ts` - Categories, levels, constants
- `src/app/page.tsx` - Landing page content

### Features
- `src/types/index.ts` - Add new data types
- `firestore.rules` - Modify permissions
- API routes - Add new endpoints

## 📖 Quick Reference

### Start Development
```bash
npm run dev
```

### Setup Project
```bash
npm run setup
```

### Check Environment
```bash
npm run check-env
```

### Build for Production
```bash
npm run build
npm start
```

---

This index helps navigate the codebase. Each file is documented with inline comments for further details.
