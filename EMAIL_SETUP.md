# Firebase Email Extension Setup

This guide will help you set up email notifications for commission completions.

## Prerequisites

- Firebase Blaze plan (required for extensions)
- SMTP service credentials (SendGrid, Mailgun, Gmail, etc.)

## Install the Extension

### Option 1: Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com) → Your Project
2. Navigate to **Extensions** in the left sidebar
3. Click **Explore Extensions Hub**
4. Search for **"Trigger Email"** (by Firebase)
5. Click **Install**
6. Configure the extension:

   | Setting | Value |
   |---------|-------|
   | **Cloud Functions location** | Same as your other functions (e.g., `us-central1`) |
   | **SMTP connection URI** | See below for your provider |
   | **Email documents collection** | `mail` |
   | **Default FROM address** | Your verified email (e.g., `noreply@yourdomain.com`) |
   | **Default REPLY-TO address** | Your contact email (optional) |

### Option 2: Firebase CLI

```bash
firebase ext:install firebase/firestore-send-email --project=YOUR_PROJECT_ID
```

## SMTP Configuration

### SendGrid (Recommended)

1. Create account at [sendgrid.com](https://sendgrid.com)
2. Go to **Settings** → **API Keys** → Create API Key
3. Use this connection URI:
   ```
   smtps://apikey:YOUR_SENDGRID_API_KEY@smtp.sendgrid.net:465
   ```
4. Verify your sender email in SendGrid

### Gmail (For Testing Only)

1. Enable 2FA on your Google account
2. Generate an App Password: [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Use this connection URI:
   ```
   smtps://your.email@gmail.com:YOUR_APP_PASSWORD@smtp.gmail.com:465
   ```

**Note:** Gmail has daily sending limits (500/day). Use SendGrid for production.

### Mailgun

```
smtps://postmaster@YOUR_DOMAIN:YOUR_API_KEY@smtp.mailgun.org:465
```

## Deploy the Cloud Function

After installing the extension, deploy your updated functions:

```bash
cd Client/functions
npm install
cd ..
firebase deploy --only functions,firestore:rules
```

## How It Works

1. Admin uploads completed artwork in the Requests Modal
2. The request status changes to `completed`
3. Cloud Function `sendCompletionEmail` triggers
4. A document is written to the `mail` collection with email details
5. Firebase Email Extension picks up the document and sends the email
6. User receives notification with preview and link to pay/download

## Email Template

The completion email includes:
- Personalized greeting using the customer's name
- Artwork preview image (low-res)
- Call-to-action button to visit the site
- Request ID for reference

## Testing

1. Create a test commission request with your own email
2. Have an admin mark it as completed
3. Check your inbox (and spam folder) for the email
4. Check Firebase Console → Firestore → `mail` collection for delivery status

## Troubleshooting

### Emails not sending

1. Check `mail` collection in Firestore for error messages in document fields
2. Verify SMTP credentials are correct
3. Check Cloud Functions logs:
   ```bash
   firebase functions:log --only sendCompletionEmail
   ```

### Extension not processing

1. Ensure the extension is installed and enabled
2. Check that `mail` collection name matches extension config
3. Verify Cloud Functions location matches extension location

### Email in spam

1. Configure SPF/DKIM records for your domain
2. Use a verified sender address
3. Consider using a dedicated email service like SendGrid

## Environment Variables (Optional)

Set your site URL for the email CTA button:

```bash
# In functions/.env or Firebase config
SITE_URL=https://your-gallery-site.web.app
```

Or set via Firebase config:
```bash
firebase functions:config:set site.url="https://your-gallery-site.web.app"
```

## Costs

- Firebase Email Extension: Free
- SendGrid: Free tier includes 100 emails/day
- Cloud Functions: Included in Firebase usage
