const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sharp = require('sharp');
const path = require('path');
const os = require('os');
const fs = require('fs-extra');

/**
 * Automatically generate optimized image variants when an image is uploaded
 * This reduces bandwidth by creating:
 * - WebP compressed versions (smaller file size)
 * - Thumbnail (256px) - for distant viewing
 * - Medium (1024px) - for medium distance
 * - Original preserved for close viewing
 */
exports.generateImageVariants = functions.storage.object().onFinalize(async (object) => {
  const fileBucket = object.bucket;
  const filePath = object.name;
  const contentType = object.contentType;

  // Only process images in the 'images/' folder
  if (!filePath.startsWith('images/')) {
    console.log('Not in images folder, skipping');
    return null;
  }

  // Don't process already generated variants
  if (filePath.includes('_thumb') || filePath.includes('_medium')) {
    console.log('Already a variant, skipping');
    return null;
  }

  // Only process image files
  if (!contentType || !contentType.startsWith('image/')) {
    console.log('Not an image, skipping');
    return null;
  }

  // Skip processing GIFs to preserve animation
  // Just mark them in Firestore without creating variants
  if (contentType === 'image/gif') {
    console.log('GIF detected, skipping optimization to preserve animation');
    const db = admin.firestore();
    const fileName = path.basename(filePath);
    const imagesRef = db.collection('images');
    const snapshot = await imagesRef.where('name', '==', fileName).limit(1).get();
    
    if (!snapshot.empty) {
      const docRef = snapshot.docs[0].ref;
      await docRef.update({
        isGif: true,
        variantsGenerated: false, // No variants for GIFs
        contentType: 'image/gif'
      });
      console.log('Firestore updated to mark GIF:', fileName);
    }
    return null;
  }

  const bucket = admin.storage().bucket(fileBucket);
  const fileName = path.basename(filePath);
  const fileNameWithoutExt = path.parse(fileName).name;
  const fileDir = path.dirname(filePath);

  const tempFilePath = path.join(os.tmpdir(), fileName);
  const metadata = {
    contentType: 'image/webp',
    cacheControl: 'public, max-age=31536000', // Cache for 1 year
  };

  try {
    // Download original image
    await bucket.file(filePath).download({ destination: tempFilePath });
    console.log('Image downloaded to', tempFilePath);

    // Get image metadata to check dimensions
    const imageMetadata = await sharp(tempFilePath).metadata();
    console.log('Original dimensions:', imageMetadata.width, 'x', imageMetadata.height);

    // Generate thumbnail (256px max dimension) - WebP format
    const thumbPath = path.join(os.tmpdir(), `${fileNameWithoutExt}_thumb.webp`);
    await sharp(tempFilePath)
      .resize(256, 256, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 75 })
      .toFile(thumbPath);

    const thumbUploadPath = `${fileDir}/${fileNameWithoutExt}_thumb.webp`;
    const thumbToken = require('crypto').randomUUID();
    await bucket.upload(thumbPath, {
      destination: thumbUploadPath,
      metadata: {
        contentType: 'image/webp',
        cacheControl: 'public, max-age=31536000',
        metadata: {
          firebaseStorageDownloadTokens: thumbToken
        }
      }
    });
    console.log('Thumbnail uploaded to', thumbUploadPath);

    // Generate medium size (1024px max dimension) - WebP format  
    // Only if original is larger than 1024px
    let mediumToken = null;
    const mediumUploadPath = `${fileDir}/${fileNameWithoutExt}_medium.webp`;
    if (imageMetadata.width > 1024 || imageMetadata.height > 1024) {
      const mediumPath = path.join(os.tmpdir(), `${fileNameWithoutExt}_medium.webp`);
      await sharp(tempFilePath)
        .resize(1024, 1024, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 85 })
        .toFile(mediumPath);

      mediumToken = require('crypto').randomUUID();
      await bucket.upload(mediumPath, {
        destination: mediumUploadPath,
        metadata: {
          contentType: 'image/webp',
          cacheControl: 'public, max-age=31536000',
          metadata: {
            firebaseStorageDownloadTokens: mediumToken
          }
        }
      });
      console.log('Medium size uploaded to', mediumUploadPath);

      // Cleanup
      await fs.remove(mediumPath);
    }

    // Set cache headers on original file too
    await bucket.file(filePath).setMetadata({
      cacheControl: 'public, max-age=31536000'
    });

    // Store variant URLs in Firestore using Firebase download URLs
    const db = admin.firestore();
    
    // Construct Firebase Storage download URLs using the tokens we created
    const thumbUrl = `https://firebasestorage.googleapis.com/v0/b/${fileBucket}/o/${encodeURIComponent(thumbUploadPath)}?alt=media&token=${thumbToken}`;

    let mediumUrl = null;
    if (mediumToken) {
      mediumUrl = `https://firebasestorage.googleapis.com/v0/b/${fileBucket}/o/${encodeURIComponent(mediumUploadPath)}?alt=media&token=${mediumToken}`;
    }

    // Find the document by filename instead of URL (more reliable)
    const imagesRef = db.collection('images');
    const snapshot = await imagesRef.where('name', '==', fileName).limit(1).get();
    
    if (!snapshot.empty) {
      const docRef = snapshot.docs[0].ref;
      await docRef.update({
        thumbnailUrl: thumbUrl,
        mediumUrl: mediumUrl,
        variantsGenerated: true
      });
      console.log('Firestore updated with variant URLs');
    } else {
      console.log('Warning: Could not find Firestore document for', fileName);
    }

    // Cleanup temp files
    await fs.remove(tempFilePath);
    await fs.remove(thumbPath);

    console.log('Image optimization complete');
    return null;

  } catch (error) {
    console.error('Error generating image variants:', error);
    // Cleanup on error
    try {
      await fs.remove(tempFilePath);
    } catch (e) {
      // Ignore cleanup errors
    }
    throw error;
  }
});
