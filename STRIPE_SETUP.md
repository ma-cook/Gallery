# Stripe Payment Integration Setup Guide

This guide will help you set up the Stripe payment system for your gallery application.

## Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Firebase CLI installed (`npm install -g firebase-tools`)
3. Firebase project initialized

## Setup Steps

### 1. Get Your Stripe Keys

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy your **Publishable key** (starts with `pk_test_...`)
3. Copy your **Secret key** (starts with `sk_test_...`)

### 2. Configure Client-Side Stripe Key

Open `Client/src/components/PaymentModal.jsx` and replace the placeholder:

```javascript
const stripePromise = loadStripe('pk_test_YOUR_PUBLISHABLE_KEY_HERE');
```

Replace `pk_test_YOUR_PUBLISHABLE_KEY_HERE` with your actual publishable key.

### 3. Install Firebase Functions Dependencies

```bash
cd functions
npm install
```

### 4. Configure Firebase Functions with Stripe Secret Key

Set your Stripe secret key in Firebase:

```bash
firebase functions:config:set stripe.secret_key="sk_test_YOUR_SECRET_KEY_HERE"
```

### 5. Set Up Stripe Webhook Secret (for production)

1. In Stripe Dashboard, go to Developers → Webhooks
2. Add endpoint: `https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/stripeWebhook`
3. Select events to listen to:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.payment_failed`
4. Copy the webhook signing secret
5. Set it in Firebase:

```bash
firebase functions:config:set stripe.webhook_secret="whsec_YOUR_WEBHOOK_SECRET"
```

### 6. Deploy Firebase Functions

```bash
firebase deploy --only functions
```

### 7. Update Request Schema

When creating a completed request in the admin RequestsModal, make sure to include a `price` field:

```javascript
{
  status: 'completed',
  completedImageUrl: downloadURL,
  price: 50, // Price in dollars
  paymentStatus: 'pending'
}
```

## Testing

### Test Mode
- Use test credit cards from Stripe: https://stripe.com/docs/testing
- Example: `4242 4242 4242 4242` (any future expiry, any CVC)

### Local Development

For local testing with Firebase emulators:

```bash
cd functions
npm run serve
```

Then update the functions region in `firebaseFunctions.js` to use the local emulator.

## How It Works

1. **User clicks "Pay" button** → Opens PaymentModal
2. **PaymentModal** calls `createCheckoutSession` Cloud Function
3. **Cloud Function** creates Stripe session and returns `clientSecret`
4. **Embedded Checkout** renders using the `clientSecret`
5. **User completes payment** → Stripe sends webhook to `stripeWebhook`
6. **Webhook handler** updates Firestore with `paymentStatus: 'paid'`
7. **User can now download** the full resolution image

## Data Structure

### Request Document Schema

```
users/{userId}/requests/{requestId}:
  - name: string
  - email: string
  - description: string
  - status: 'open' | 'in progress' | 'completed'
  - completedImageUrl: string (when completed)
  - price: number (dollars, e.g., 50)
  - paymentStatus: 'pending' | 'paid' | 'expired'
  - stripeSessionId: string
  - paymentIntentId: string (after payment)
  - paidAt: timestamp
```

## Troubleshooting

### "Failed to initialize payment"
- Check Firebase Functions logs: `firebase functions:log`
- Verify Stripe secret key is set correctly
- Ensure request exists and has required fields

### Webhook not working
- Verify webhook secret is correct
- Check webhook endpoint URL matches deployed function
- Review Stripe Dashboard → Developers → Webhooks for failed attempts

### Payment completes but status doesn't update
- Check webhook is properly configured
- Review Firebase Functions logs
- Ensure metadata (requestId, userId) is being passed correctly

## Security Notes

- Never expose your Stripe secret key in client-side code
- Always validate requests on the server (Cloud Function)
- Use Firebase Security Rules to protect user request data
- The webhook endpoint validates Stripe signatures to prevent tampering

## Production Checklist

- [ ] Switch to live Stripe keys (remove `_test_`)
- [ ] Update webhook endpoint to production URL
- [ ] Test full payment flow end-to-end
- [ ] Set up Firestore security rules
- [ ] Configure proper CORS settings
- [ ] Enable proper error logging and monitoring

## Support

For issues:
- Stripe Docs: https://stripe.com/docs
- Firebase Functions: https://firebase.google.com/docs/functions
