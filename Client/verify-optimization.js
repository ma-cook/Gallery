/**
 * Run this script to verify your image optimization setup
 * Usage: node verify-optimization.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Your Firebase config (copy from src/firebase.js)
const firebaseConfig = {
  // Add your config here, or it will try to use environment variables
};

async function verifyOptimization() {
  console.log('🔍 Checking image optimization status...\n');

  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const imagesSnapshot = await getDocs(collection(db, 'images'));
    const images = imagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log(`📊 Found ${images.length} images in database\n`);

    let withVariants = 0;
    let withoutVariants = 0;

    images.forEach((img, index) => {
      const hasVariants = img.thumbnailUrl && img.mediumUrl;
      
      if (hasVariants) {
        withVariants++;
        console.log(`✅ Image ${index + 1}: Optimized (has variants)`);
      } else {
        withoutVariants++;
        console.log(`⚠️  Image ${index + 1}: Not optimized (missing variants)`);
        console.log(`   URL: ${img.url?.substring(0, 60)}...`);
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Optimized: ${withVariants}`);
    console.log(`⚠️  Need optimization: ${withoutVariants}`);
    console.log('='.repeat(60));

    if (withoutVariants > 0) {
      console.log('\n📝 Action Required:');
      console.log('1. Install dependencies:');
      console.log('   cd Client/functions');
      console.log('   npm install sharp fs-extra');
      console.log('');
      console.log('2. Deploy Cloud Functions:');
      console.log('   cd ..');
      console.log('   firebase deploy --only functions');
      console.log('');
      console.log('3. Re-upload existing images to generate variants');
      console.log('   OR run the batch processing function (see BANDWIDTH_OPTIMIZATION.md)');
    } else {
      console.log('\n🎉 All images are optimized!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nMake sure to:');
    console.log('1. Add your Firebase config to this file');
    console.log('2. Run: npm install firebase');
  }
}

verifyOptimization();
