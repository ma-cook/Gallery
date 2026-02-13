const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe')(functions.config().stripe?.secret_key || process.env.STRIPE_SECRET_KEY);
const sharp = require('sharp');
const path = require('path');
const os = require('os');
const fs = require('fs-extra');

admin.initializeApp();

// Import image optimization functions
const { generateImageVariants } = require('./imageOptimization');
exports.generateImageVariants = generateImageVariants;

/**
 * Generate a low-res preview when a completed artwork is uploaded to collection_fullres/
 * Stores preview in collection_previews/ and updates the Firestore request document
 */
exports.generateCompletedPreview = functions.storage.object().onFinalize(async (object) => {
  const fileBucket = object.bucket;
  const filePath = object.name;
  const contentType = object.contentType;

  // Only process images in the 'collection_fullres/' folder
  if (!filePath.startsWith('collection_fullres/')) {
    return null;
  }

  // Only process image files
  if (!contentType || !contentType.startsWith('image/')) {
    return null;
  }

  const bucket = admin.storage().bucket(fileBucket);
  const fileName = path.basename(filePath);
  const fileNameWithoutExt = path.parse(fileName).name;
  // Extract userId from path: collection_fullres/{userId}/{filename}
  const pathParts = filePath.split('/');
  const userId = pathParts[1];

  const tempFilePath = path.join(os.tmpdir(), fileName);

  try {
    // Download original image
    await bucket.file(filePath).download({ destination: tempFilePath });

    // Generate low-res preview (400px max, low quality WebP)
    const previewPath = path.join(os.tmpdir(), `${fileNameWithoutExt}_preview.webp`);
    await sharp(tempFilePath)
      .resize(400, 400, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 40 })
      .toFile(previewPath);

    // Upload preview to collection_previews/
    const previewUploadPath = `collection_previews/${userId}/${fileNameWithoutExt}_preview.webp`;
    const previewToken = require('crypto').randomUUID();
    await bucket.upload(previewPath, {
      destination: previewUploadPath,
      metadata: {
        contentType: 'image/webp',
        cacheControl: 'public, max-age=31536000',
        metadata: {
          firebaseStorageDownloadTokens: previewToken,
        },
      },
    });

    const previewUrl = `https://firebasestorage.googleapis.com/v0/b/${fileBucket}/o/${encodeURIComponent(previewUploadPath)}?alt=media&token=${previewToken}`;

    // Find the request document that references this file and update it with the preview URL
    const db = admin.firestore();
    const requestsSnapshot = await db.collectionGroup('requests')
      .where('completedImagePath', '==', filePath)
      .limit(1)
      .get();

    if (!requestsSnapshot.empty) {
      const requestDoc = requestsSnapshot.docs[0];
      await requestDoc.ref.update({
        completedPreviewUrl: previewUrl,
      });
      console.log('Preview generated and Firestore updated for:', filePath);
    } else {
      console.log('Warning: No request document found for:', filePath);
    }

    // Cleanup
    await fs.remove(tempFilePath);
    await fs.remove(previewPath);

    return null;
  } catch (error) {
    console.error('Error generating completed preview:', error);
    try { await fs.remove(tempFilePath); } catch (e) { /* ignore */ }
    throw error;
  }
});

/**
 * Get a signed download URL for the full-resolution completed artwork
 * Only accessible after payment is confirmed
 */
exports.getFullResDownloadUrl = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { requestId } = data;
  const userId = context.auth.uid;

  if (!requestId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing requestId');
  }

  // Verify request exists, belongs to user, and is paid
  const requestRef = admin.firestore().doc(`users/${userId}/requests/${requestId}`);
  const requestDoc = await requestRef.get();

  if (!requestDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Request not found');
  }

  const requestData = requestDoc.data();
  if (requestData.paymentStatus !== 'paid') {
    throw new functions.https.HttpsError('permission-denied', 'Payment required to download full resolution');
  }

  if (!requestData.completedImagePath) {
    throw new functions.https.HttpsError('not-found', 'No completed image available');
  }

  // Generate a download URL using a Firebase Storage download token
  const bucket = admin.storage().bucket();
  const file = bucket.file(requestData.completedImagePath);

  // Get or create a download token for the file
  const [metadata] = await file.getMetadata();
  let token = metadata.metadata && metadata.metadata.firebaseStorageDownloadTokens;
  
  if (!token) {
    // Generate a new token and set it
    token = require('crypto').randomUUID();
    await file.setMetadata({
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    });
  }

  const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(requestData.completedImagePath)}?alt=media&token=${token}`;

  return { downloadUrl };
});

/**
 * Fetch all active products and their prices from Stripe
 * Called from the client to populate product selection
 */
exports.getStripeProducts = functions.https.onCall(async (data, context) => {
  try {
    // Fetch all active products with their default prices
    const products = await stripe.products.list({
      active: true,
      expand: ['data.default_price'],
    });

    // Transform products to include price information
    const productsWithPrices = await Promise.all(
      products.data.map(async (product) => {
        // Fetch all prices for this product
        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
        });

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          images: product.images,
          metadata: product.metadata,
          prices: prices.data.map((price) => ({
            id: price.id,
            currency: price.currency,
            unit_amount: price.unit_amount,
            type: price.type,
          })),
        };
      })
    );

    return { products: productsWithPrices };
  } catch (error) {
    console.error('Error fetching Stripe products:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to fetch products',
      error.message
    );
  }
});

/**
 * Create a new product in Stripe with a price
 * Admin only
 */
exports.createStripeProduct = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  // Verify user is admin via custom claims
  if (!context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'User must be an admin'
    );
  }

  try {
    const { name, description, price, currency, imageUrl } = data;

    if (!name || !price || !currency) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required parameters: name, price, or currency'
      );
    }

    // Create the product
    const product = await stripe.products.create({
      name,
      description: description || '',
      images: imageUrl ? [imageUrl] : [],
    });

    // Create the price for the product
    const priceObj = await stripe.prices.create({
      product: product.id,
      currency: currency.toLowerCase(),
      unit_amount: Math.round(price * 100), // Convert to cents
    });

    return {
      productId: product.id,
      priceId: priceObj.id,
    };
  } catch (error) {
    console.error('Error creating Stripe product:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to create product',
      error.message
    );
  }
});

/**
 * Delete a product from Stripe (archive it)
 * Admin only
 */
exports.deleteStripeProduct = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  // Verify user is admin via custom claims
  if (!context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'User must be an admin'
    );
  }

  try {
    const { productId } = data;

    if (!productId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing productId'
      );
    }

    // Archive (soft delete) the product in Stripe
    await stripe.products.update(productId, {
      active: false,
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting Stripe product:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to delete product',
      error.message
    );
  }
});

/**
 * Create a Stripe Checkout Session
 * Called from the client to initialize payment
 */
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  try {
    const { requestId, userId, price, priceId, requestName, requestDescription, returnUrl } = data;

    // Validate required parameters - either priceId (from catalog) or price (dynamic)
    if (!requestId || !userId || (!price && !priceId)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required parameters: requestId, userId, and either price or priceId'
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
    // Use priceId from catalog if available, otherwise create dynamic price
    const sessionConfig = {
      ui_mode: 'embedded',
      redirect_on_completion: 'if_required',
      payment_method_types: ['card'],
      line_items: priceId
        ? [
            {
              price: priceId, // Use existing price from catalog
              quantity: 1,
            },
          ]
        : [
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
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

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

/**
 * Send email notification when a request is marked as completed
 * This works with Firebase Email Extension (Trigger Email)
 * When a request status changes to 'completed', a document is written to the 'mail' collection
 */
exports.sendCompletionEmail = functions.firestore
  .document('users/{userId}/requests/{requestId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const { userId, requestId } = context.params;

    // Only proceed if status just changed to 'completed'
    if (beforeData.status === 'completed' || afterData.status !== 'completed') {
      return null;
    }

    // Only send if user has an email
    const userEmail = afterData.email;
    if (!userEmail) {
      console.log('No email found for request, skipping notification');
      return null;
    }

    try {
      // Get the preview URL if available
      const previewUrl = afterData.completedPreviewUrl || '';
      const productName = afterData.productName || 'your commissioned artwork';
      const userName = afterData.name || 'there';

      // Create email document for Firebase Email Extension
      await admin.firestore().collection('mail').add({
        to: userEmail,
        message: {
          subject: 'Your Artwork is Ready! 🎨',
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #111;">Your Artwork is Complete!</h1>
      </div>
      
      <!-- Body -->
      <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #444;">
        Hi ${userName},
      </p>
      <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #444;">
        Great news! <strong>${productName}</strong> has been completed and is ready for you to view.
      </p>
      
      ${previewUrl ? `
      <!-- Preview Image -->
      <div style="margin: 24px 0; text-align: center;">
        <img src="${previewUrl}" alt="Artwork Preview" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #eee;" />
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #999;">Preview (low resolution)</p>
      </div>
      ` : ''}
      
      <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #444;">
        To download the full-resolution version, simply visit our website and complete the payment for your commission.
      </p>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${process.env.SITE_URL || 'https://your-gallery-site.web.app'}" style="display: inline-block; padding: 14px 32px; background: #111; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
          View Your Artwork
        </a>
      </div>
      
      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #666;">
        Thank you for your commission! If you have any questions, feel free to reach out to us.
      </p>
      
      <!-- Footer -->
      <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #eee; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #999;">
          This email was sent regarding your commission request (ID: ${requestId})
        </p>
      </div>
    </div>
  </div>
</body>
</html>
          `,
          text: `Hi ${userName},\n\nGreat news! ${productName} has been completed and is ready for you to view.\n\nTo download the full-resolution version, visit our website and complete the payment for your commission.\n\nThank you for your commission!\n\nRequest ID: ${requestId}`,
        },
      });

      console.log(`Completion email queued for ${userEmail} (request: ${requestId})`);
      return null;
    } catch (error) {
      console.error('Error sending completion email:', error);
      return null;
    }
  });
