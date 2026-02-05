# Admin Setup Guide

Your gallery now uses Firebase Custom Claims to manage admin privileges. This is the secure, recommended approach that doesn't require hardcoding user IDs.

## How It Works

- Users with the `admin: true` custom claim can see Upload and Settings buttons
- Regular users can only view the gallery
- Admin status is checked when users sign in

## Setting Up an Admin User

You have two options to grant admin privileges:

### Option 1: Firebase Console (Easiest)

Unfortunately, Firebase Console doesn't support setting custom claims directly. Use Option 2 instead.

### Option 2: Using Firebase Admin SDK (Recommended)

Create a Node.js script to set admin privileges:

1. **Install Firebase Admin SDK** (in a separate admin folder or project):

```bash
npm install firebase-admin
```

2. **Get your Firebase Admin Service Account Key**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project: `gallery-1ede7`
   - Click the gear icon → Project Settings
   - Go to "Service Accounts" tab
   - Click "Generate New Private Key"
   - Save the JSON file securely (DO NOT commit to Git!)

3. **Create and run this script** (`setAdmin.js`):

```javascript
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(
  readFileSync('./serviceAccountKey.json', 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Replace with the email of the user you want to make admin
const userEmail = 'your-email@example.com';

admin.auth().getUserByEmail(userEmail)
  .then((user) => {
    return admin.auth().setCustomUserClaims(user.uid, { admin: true });
  })
  .then(() => {
    console.log(`✅ Successfully granted admin privileges to ${userEmail}`);
    console.log('User must sign out and sign in again for changes to take effect.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
```

4. **Run the script**:

```bash
node setAdmin.js
```

5. **User must sign out and sign in again** for the admin status to take effect.

### Option 3: Firebase Cloud Function (Advanced)

Create a callable Cloud Function that only you can trigger:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.setAdminClaim = functions.https.onCall(async (data, context) => {
  // Check if request is made by an existing admin (or add other auth checks)
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can grant admin privileges'
    );
  }

  const { email } = data;
  
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    
    return { message: `Successfully granted admin to ${email}` };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

## Checking Admin Status

To verify if a user is an admin, you can check their token:

```javascript
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const user = auth.currentUser;

if (user) {
  const tokenResult = await user.getIdTokenResult();
  console.log('Is admin:', tokenResult.claims.admin === true);
}
```

## Revoking Admin Privileges

To remove admin access from a user:

```javascript
admin.auth().getUserByEmail(userEmail)
  .then((user) => {
    return admin.auth().setCustomUserClaims(user.uid, { admin: false });
  })
  .then(() => {
    console.log('Admin privileges revoked');
  });
```

## Security Notes

- ✅ Custom claims are secure and verified by Firebase
- ✅ Claims are included in the user's ID token
- ✅ No need to hardcode user IDs in your client code
- ⚠️ Keep your service account key secure (add to `.gitignore`)
- ⚠️ Users must sign out and sign in again after claim changes
- ⚠️ Custom claims are limited to 1000 bytes per user

## Testing

1. Sign in with a regular account → Upload/Settings buttons should NOT appear
2. Set admin claim for your account using the script above
3. Sign out and sign in again
4. Upload/Settings buttons should now appear
