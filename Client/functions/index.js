const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe')(functions.config().stripe?.secret_key || process.env.STRIPE_SECRET_KEY);

admin.initializeApp();

// Import image optimization functions
const { generateImageVariants } = require('./imageOptimization');
exports.generateImageVariants = generateImageVariants;

/**
 * Create a Stripe Checkout Session
 * Called from the client to initialize payment
 */
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  try {
    const { requestId, userId, price, requestName, requestDescription, returnUrl } = data;

    // Validate required parameters
    if (!requestId || !userId || !price) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required parameters: requestId, userId, or price'
      );
    }

    // Verify the request exists and belongs to the user
    const requestRef = admin.firestore()
      .doc(`users/${userId}/requests/${requestId}`);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Request not found'
      );
    }

    // Get the request data to check if already paid
    const requestData = requestDoc.data();
    if (requestData.paymentStatus === 'paid') {
      throw new functions.https.HttpsError(
        'already-exists',
        'This request has already been paid for'
      );
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Artwork: ${requestName || 'Custom Request'}`,
              description: requestDescription || 'Full resolution artwork download',
            },
            unit_amount: Math.round(price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      return_url: returnUrl || 'http://localhost:5173',
      metadata: {
        requestId,
        userId,
        type: 'artwork_purchase',
      },
    });

    // Update request with session info
    await requestRef.update({
      stripeSessionId: session.id,
      paymentStatus: 'pending',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      clientSecret: session.client_secret,
      sessionId: session.id,
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to create checkout session',
      error.message
    );
  }
});

/**
 * Webhook handler for Stripe events
 * This should be called by Stripe when payment events occur
 */
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = functions.config().stripe?.webhook_secret || process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { requestId, userId } = session.metadata;

      if (requestId && userId) {
        try {
          // Update the request status to paid
          await admin.firestore()
            .doc(`users/${userId}/requests/${requestId}`)
            .update({
              paymentStatus: 'paid',
              paidAt: admin.firestore.FieldValue.serverTimestamp(),
              paymentIntentId: session.payment_intent,
              stripeSessionId: session.id,
            });

          console.log(`Payment completed for request ${requestId}`);
        } catch (error) {
          console.error('Error updating request after payment:', error);
        }
      }
      break;
    }

    case 'checkout.session.expired': {
      const session = event.data.object;
      const { requestId, userId } = session.metadata;

      if (requestId && userId) {
        try {
          await admin.firestore()
            .doc(`users/${userId}/requests/${requestId}`)
            .update({
              paymentStatus: 'expired',
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

          console.log(`Checkout session expired for request ${requestId}`);
        } catch (error) {
          console.error('Error updating request after expiration:', error);
        }
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      console.log('Payment failed:', paymentIntent.id);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});
