import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  collectionGroup,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytesResumable, // Add this import
  deleteObject,
  getDownloadURL,
} from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from './firebase';

export const fetchImages = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'images'));
    const seenUrls = new Set(); // Track unique URLs to prevent duplicates
    const images = [];
    
    for (const docSnapshot of querySnapshot.docs) {
      const data = docSnapshot.data();
      const url = data.url;
      
      // Skip if no URL or URL already seen (duplicate)
      if (!url || typeof url !== 'string' || seenUrls.has(url)) {
        continue;
      }
      
      seenUrls.add(url);
      images.push({ 
        id: docSnapshot.id, 
        url: url,
        thumbnailUrl: data.thumbnailUrl,
        mediumUrl: data.mediumUrl,
      });
    }
    
    return images;
  } catch (error) {
    console.error('Error fetching images:', error);
    return [];
  }
};

/**
 * Clean up orphaned image documents (documents pointing to deleted storage files)
 * This will validate each image URL and delete documents for non-existent files
 */
export const cleanupOrphanedImages = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'images'));
    const docs = querySnapshot.docs;
    
    let deletedCount = 0;
    const seenUrls = new Set();
    const deletePromises = [];
    
    for (const docSnapshot of docs) {
      const data = docSnapshot.data();
      const url = data.url;
      
      // Delete if no URL
      if (!url) {
        deletePromises.push(
          deleteDoc(doc(db, 'images', docSnapshot.id))
            .then(() => {
              console.log(`Deleted document ${docSnapshot.id} (no URL)`);
              deletedCount++;
            })
        );
        continue;
      }
      
      // Delete duplicates (keep first occurrence)
      if (seenUrls.has(url)) {
        deletePromises.push(
          deleteDoc(doc(db, 'images', docSnapshot.id))
            .then(() => {
              console.log(`Deleted duplicate document ${docSnapshot.id}`);
              deletedCount++;
            })
        );
        continue;
      }
      
      seenUrls.add(url);
      
      // Skip expensive URL validation - Firebase Storage URLs are reliable
      // If you need to validate URLs, do it manually with a separate function
    }
    
    // Wait for all deletions to complete
    await Promise.all(deletePromises);
    
    if (deletedCount > 0) {
      console.log(`Cleanup complete. Deleted ${deletedCount} orphaned/duplicate documents.`);
    } else {
      console.log('No orphaned or duplicate documents found.');
    }
    return deletedCount;
  } catch (error) {
    console.error('Error during cleanup:', error);
    return 0;
  }
};

export const handleFileChange = (file, user, setImages) => {
  // Changed 'event' to 'file'
  if (!file) return;

  const storage = getStorage();
  const storageRef = ref(storage, `images/${file.name}`);
  const uploadTask = uploadBytesResumable(storageRef, file);

  uploadTask.on(
    'state_changed',
    (snapshot) => {
      // Handle progress - App.jsx will handle displaying progress for the current file
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
    },
    (error) => {
      // Handle error
    },
    async () => {
      // Handle successful upload
      try {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        // Detect if file is a GIF
        const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
        const imageDoc = {
          url: downloadURL,
          name: file.name, // Storing the file name
          uploadedAt: new Date(),
          userId: user ? user.uid : null, // Optionally store user ID
          isGif: isGif, // Track if this is a GIF file
          contentType: file.type, // Store content type
        };
        const docRef = await addDoc(collection(db, 'images'), imageDoc);

        const newImageData = {
          url: downloadURL,
          id: docRef.id,
          name: file.name,
        };
        setImages((prevImages) => {
          const updatedImages = [...prevImages, newImageData];
          return updatedImages;
        });
      } catch (error) {}
    }
  );

  return uploadTask;
};

export const deleteImage = async (imageId, imageUrl) => {
  const db = getFirestore();
  await deleteDoc(doc(db, 'images', imageId));

  const storage = getStorage();
  const storageRef = ref(storage, imageUrl);
  await deleteObject(storageRef);
};

export const saveColor = async (backgroundColor) => {
  const db = getFirestore();
  await setDoc(doc(db, 'settings', 'backgroundColor'), {
    backgroundColor: backgroundColor,
  });
};

export const fetchColor = async () => {
  const db = getFirestore();
  const docRef = doc(db, 'settings', 'backgroundColor');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().backgroundColor;
  } else {
    return 'black'; // default color
  }
};

export const saveOrbColor = async (color) => {
  const db = getFirestore();
  await setDoc(doc(db, 'settings', 'glowColor'), {
    glowColor: color,
  });
};

export const fetchOrbColor = async () => {
  const db = getFirestore();
  const docRef = doc(db, 'settings', 'glowColor');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().glowColor;
  } else {
    return '#fff4d2'; // default color
  }
};

export const saveTitleOrbColor = async (titleOrbColor) => {
  const db = getFirestore();
  await setDoc(doc(db, 'settings', 'titleOrbColor'), {
    orbColor: titleOrbColor,
  });
};

export const fetchTitleOrbColor = async () => {
  const db = getFirestore();
  const docRef = doc(db, 'settings', 'titleOrbColor');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().orbColor;
  } else {
    return '#fff4d2'; // default color
  }
};

export const saveTextColor = async (textColor) => {
  const db = getFirestore();
  await setDoc(doc(db, 'settings', 'textColor'), {
    textColor: textColor,
  });
};

export const fetchTextColor = async () => {
  const db = getFirestore();
  const docRef = doc(db, 'settings', 'textColor');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().textColor;
  } else {
    return '#fff4d2'; // default color
  }
};

export const saveTitleColor = async (titleColor) => {
  const db = getFirestore();
  await setDoc(doc(db, 'settings', 'titleColor'), {
    titleColor: titleColor,
  });
};

export const fetchTitleColor = async () => {
  const db = getFirestore();
  const docRef = doc(db, 'settings', 'titleColor');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().titleColor;
  } else {
    return '#fff4d2'; // default color
  }
};

export const saveButtonPrimaryColor = async (buttonPrimaryColor) => {
  const db = getFirestore();
  await setDoc(doc(db, 'settings', 'buttonPrimaryColor'), {
    buttonPrimaryColor: buttonPrimaryColor,
  });
};

export const fetchButtonPrimaryColor = async () => {
  const db = getFirestore();
  const docRef = doc(db, 'settings', 'buttonPrimaryColor');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().buttonPrimaryColor;
  } else {
    return '#fff4d2'; // default color
  }
};

export const saveButtonSecondaryColor = async (buttonSecondaryColor) => {
  const db = getFirestore();
  await setDoc(doc(db, 'settings', 'buttonSecondaryColor'), {
    buttonSecondaryColor: buttonSecondaryColor,
  });
};

export const fetchButtonSecondaryColor = async () => {
  const db = getFirestore();
  const docRef = doc(db, 'settings', 'buttonSecondaryColor');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().buttonSecondaryColor;
  } else {
    return 'rgba(0, 0, 0, 0.6)'; // default color
  }
};

export const saveBackgroundBlurriness = async (blurriness) => {
  const db = getFirestore();
  await setDoc(doc(db, 'settings', 'backgroundBlurriness'), {
    backgroundBlurriness: blurriness,
  });
};

export const fetchBackgroundBlurriness = async () => {
  const db = getFirestore();
  const docRef = doc(db, 'settings', 'backgroundBlurriness');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().backgroundBlurriness;
  } else {
    return 0.02; // default value
  }
};

export const saveBackgroundIntensity = async (intensity) => {
  const db = getFirestore();
  await setDoc(doc(db, 'settings', 'backgroundIntensity'), {
    backgroundIntensity: intensity,
  });
};

export const fetchBackgroundIntensity = async () => {
  const db = getFirestore();
  const docRef = doc(db, 'settings', 'backgroundIntensity');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().backgroundIntensity;
  } else {
    return 0.08; // default value
  }
};

export const handleHdrFileUpload = async (file) => {
  try {
    const storage = getStorage();
    // Store HDR files in a dedicated folder
    const storageRef = ref(storage, `environment/${file.name}`);
    
    // Upload the file
    const uploadTask = await uploadBytesResumable(storageRef, file);
    const downloadURL = await getDownloadURL(uploadTask.ref);
    
    // Save the URL to Firestore
    await saveHdrFileUrl(downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading HDR file:', error);
    throw error;
  }
};

export const saveHdrFileUrl = async (url) => {
  const db = getFirestore();
  await setDoc(doc(db, 'settings', 'hdrFileUrl'), {
    hdrFileUrl: url,
  });
};

export const fetchHdrFileUrl = async () => {
  const db = getFirestore();
  const docRef = doc(db, 'settings', 'hdrFileUrl');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().hdrFileUrl;
  } else {
    return '/syferfontein_1d_clear_puresky_4k.hdr'; // default HDR file
  }
};

// Request functions
export const createRequest = async (requestData, exampleImageFile = null) => {
  try {
    if (!requestData.userId) {
      throw new Error('User ID is required to create a request');
    }

    let exampleImageUrl = null;

    // Upload example image if provided
    if (exampleImageFile) {
      const storage = getStorage();
      const timestamp = Date.now();
      const storageRef = ref(storage, `requests/examples/${requestData.userId}/${timestamp}_${exampleImageFile.name}`);
      
      const uploadTask = await uploadBytesResumable(storageRef, exampleImageFile);
      exampleImageUrl = await getDownloadURL(uploadTask.ref);
    }

    const docRef = await addDoc(
      collection(db, 'users', requestData.userId, 'requests'),
      {
        ...requestData,
        ...(exampleImageUrl && { exampleImageUrl }),
        status: 'open',
        createdAt: serverTimestamp(),
      }
    );
    return docRef.id;
  } catch (error) {
    console.error('Error creating request:', error);
    throw error;
  }
};

export const fetchRequests = async () => {
  try {
    // Use collectionGroup to fetch all requests from all users
    const q = query(collectionGroup(db, 'requests'));
    const querySnapshot = await getDocs(q);
    const requests = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      userId: doc.ref.parent.parent.id, // Get userId from parent path
      ...doc.data(),
    }));
    // Sort by createdAt client-side to avoid needing a collection group index
    return requests.sort((a, b) => {
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return b.createdAt.seconds - a.createdAt.seconds;
    });
  } catch (error) {
    console.error('Error fetching requests:', error);
    throw error;
  }
};

export const updateRequestStatus = async (userId, requestId, status) => {
  try {
    const requestRef = doc(db, 'users', userId, 'requests', requestId);
    await updateDoc(requestRef, { status });
  } catch (error) {
    console.error('Error updating request status:', error);
    throw error;
  }
};

export const deleteRequest = async (userId, requestId) => {
  try {
    const requestRef = doc(db, 'users', userId, 'requests', requestId);
    await deleteDoc(requestRef);
  } catch (error) {
    console.error('Error deleting request:', error);
    throw error;
  }
};

export const fetchUserRequests = async (userId) => {
  try {
    const q = query(
      collection(db, 'users', userId, 'requests'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching user requests:', error);
    throw error;
  }
};

export const checkUserHasRequests = async (userId) => {
  try {
    if (!userId) return false;
    const q = query(collection(db, 'users', userId, 'requests'));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking user requests:', error);
    return false;
  }
};

// Upload completed request image to collection
export const uploadCompletedRequestImage = async (userId, requestId, file, requestData) => {
  try {
    const storage = getStorage();
    const timestamp = Date.now();
    const storageRef = ref(storage, `collection/${userId}/${timestamp}_${file.name}`);
    
    // Upload the file
    const uploadTask = await uploadBytesResumable(storageRef, file);
    const downloadURL = await getDownloadURL(uploadTask.ref);
    
    // Create the collection document
    const collectionDoc = {
      url: downloadURL,
      name: file.name,
      uploadedAt: serverTimestamp(),
      requestId: requestId,
      requestName: requestData.name || '',
      requestDescription: requestData.description || '',
    };
    
    // Add to users/{userId}/collection
    await addDoc(collection(db, 'users', userId, 'collection'), collectionDoc);
    
    // Update request status to completed and add the image URL
    const requestRef = doc(db, 'users', userId, 'requests', requestId);
    await updateDoc(requestRef, { 
      status: 'completed',
      completedImageUrl: downloadURL,
      completedAt: serverTimestamp()
    });
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading completed request image:', error);
    throw error;
  }
};

// Stripe Payment Functions
export const createCheckoutSession = async (data) => {
  try {
    const functions = getFunctions();
    const createSession = httpsCallable(functions, 'createCheckoutSession');
    const result = await createSession(data);
    return result.data;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

// Fetch Stripe products from catalog
export const getStripeProducts = async () => {
  try {
    const functions = getFunctions();
    const getProducts = httpsCallable(functions, 'getStripeProducts');
    const result = await getProducts();
    return result.data.products;
  } catch (error) {
    console.error('Error fetching Stripe products:', error);
    throw error;
  }
};
