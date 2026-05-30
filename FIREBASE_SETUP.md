# Firebase Setup Instructions

## The "client is offline" error means Firebase services aren't enabled yet.

Follow these steps to fix it:

## 1. Enable Firebase Authentication

1. Go to: https://console.firebase.google.com/project/your-project-id/authentication
2. Click **"Get started"** or **"Sign-in method"** tab
3. Enable **Email/Password** authentication:
   - Click on "Email/Password"
   - Toggle **Enable** to ON
   - Click **Save**

## 2. Create Firestore Database

1. Go to: https://console.firebase.google.com/project/your-project-id/firestore
2. Click **"Create database"**
3. Select **"Start in production mode"** (we have security rules)
4. Choose a location (preferably closest to Sri Lanka, e.g., `asia-south1` or `asia-southeast1`)
5. Click **Create**

## 3. Deploy Security Rules

**Option A: Manual Copy (Recommended if CLI fails)**

1. Go to: https://console.firebase.google.com/project/your-project-id/firestore/rules
2. Delete everything in the editor
3. Copy the ENTIRE content below and paste it:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isUser(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    
    function isAdmin() {
      return isAuthenticated() && getUserData().role == 'admin';
    }
    
    function isTeacher() {
      return isAuthenticated() && getUserData().role == 'teacher';
    }
    
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isUser(userId);
      allow update: if isUser(userId) || isAdmin();
      allow delete: if isAdmin();
    }
    
    match /courses/{courseId} {
      allow read: if true;
      allow create: if isTeacher();
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }
    
    match /courseModules/{moduleId} {
      allow read: if isAuthenticated();
      allow create: if isTeacher();
      allow update, delete: if isAdmin();
    }
    
    match /materials/{materialId} {
      allow read: if isAuthenticated();
      allow create: if isTeacher();
      allow update, delete: if isAdmin();
    }
    
    match /liveSessions/{sessionId} {
      allow read: if isAuthenticated();
      allow create: if isTeacher();
      allow update, delete: if isAdmin();
    }
    
    match /announcements/{announcementId} {
      allow read: if true;
      allow create: if isAdmin();
      allow update, delete: if isAdmin();
    }
    
    match /enrollments/{enrollmentId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow delete: if isAdmin();
    }
    
    match /teacherOffers/{offerId} {
      allow read: if true;
      allow create: if isTeacher();
      allow update, delete: if isUser(resource.data.teacherId) || isAdmin();
    }
    
    match /learnRequests/{requestId} {
      allow read: if true;
      allow create: if isAuthenticated();
      allow update, delete: if isUser(resource.data.studentId) || isAdmin();
    }
    
    match /conversations/{conversationId} {
      allow read: if isAuthenticated() && request.auth.uid in resource.data.participantIds;
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if isAdmin();
    }
    
    match /messages/{messageId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && isUser(request.resource.data.senderId);
      allow delete: if isAdmin();
    }
  }
}
```

4. Click **Publish**

**Option B: Using Firebase CLI**

```bash
cd /home/gaveen/Downloads/kuppi
npm install -g firebase-tools
firebase login
firebase init firestore
# Select: Use existing project -> your-project-id
# Keep default firestore.rules and firestore.indexes.json
firebase deploy --only firestore:rules
```

Or manually copy the rules from `firestore.rules` to the Firebase Console:
1. Go to: https://console.firebase.google.com/project/your-project-id/firestore/rules
2. Copy contents from `firestore.rules` file
3. Click **Publish**

## 4. Verify Setup

1. Restart your dev server:
   ```bash
   npm run dev
   ```

2. Try registering a new user at: http://localhost:3000/auth/register

3. Check Firestore console to see if user document was created

## Common Issues

### Still getting "client is offline"?
- Check your internet connection
- Verify `.env.local` has correct Firebase config
- Make sure Firestore database is created (not just Authentication)
- Check browser console for detailed error messages

### "Permission denied" errors?
- Deploy the security rules from `firestore.rules`
- Make sure you're logged in before accessing protected routes

### Registration not redirecting?
- This is now fixed with the 500ms delay
- Make sure Authentication is enabled
- Check browser console for errors
