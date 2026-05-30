# Quick Start Guide

## Prerequisites
- Node.js 18+ installed
- A Firebase account
- Git (optional)

## 5-Minute Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Firebase (5 minutes)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project" or use existing project
3. Enable **Email/Password** authentication:
   - Go to Authentication → Sign-in method
   - Enable "Email/Password"
4. Create **Firestore Database**:
   - Go to Firestore Database
   - Click "Create database"
   - Start in **test mode** (we'll add security rules next)
   - Choose a region close to Sri Lanka (asia-south1 recommended)

### 3. Get Firebase Config

1. Go to Project Settings (gear icon)
2. Scroll to "Your apps" section
3. Click the web icon (</>)
4. Copy the config values

### 4. Create `.env.local`

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and paste your Firebase config:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc...

UPLOADS_DIR=./uploads
MAX_FILE_SIZE=10485760
```

### 5. Deploy Security Rules

1. Copy contents of `firestore.rules`
2. Go to Firestore → Rules tab
3. Paste and click "Publish"

### 6. Create Uploads Folder

```bash
mkdir uploads
```

### 7. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

## First Steps

### Create Admin Account

1. Register via the UI (choose "Teacher" or "Student")
2. Go to Firebase Console → Firestore → `users` collection
3. Find your user document
4. Edit `role` field to `"admin"`

### Create Test Content

**As Teacher:**
1. Register as teacher
2. Go to Dashboard → Create Course
3. Add course details and publish

**As Student:**
1. Register as student
2. Browse courses
3. Enroll in a course

## Troubleshooting

### "Missing or insufficient permissions"
- Make sure you deployed the security rules from `firestore.rules`
- Check that you're logged in

### "Firebase not configured"
- Verify `.env.local` has all required variables
- Restart the dev server: `npm run dev`

### File uploads not working
- Ensure `uploads/` directory exists
- Check file size is under 10MB
- Verify file type is PDF or image

### Firestore indexes missing
Firebase will prompt you with a link to create required indexes automatically when you first query collections.

## Production Deployment

### Option 1: Vercel (Easy, but limited file storage)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
```

⚠️ **Note**: Vercel has serverless limitations. For production file uploads, consider:
- Switching to Firebase Storage
- Using a VPS or container platform

### Option 2: VPS/Container (Recommended for file uploads)

**Railway, Render, or DigitalOcean:**
1. Connect your GitHub repo
2. Add environment variables
3. Deploy with persistent volume for `uploads/`

## Next Steps

- Customize categories in course/offer pages
- Add your branding/logo
- Invite beta testers
- Set up email notifications
- Integrate payment gateway for premium courses

## Support

For issues, check:
- README.md (full documentation)
- Firebase Console for error logs
- Browser console for client errors

Happy teaching and learning! 🎓
