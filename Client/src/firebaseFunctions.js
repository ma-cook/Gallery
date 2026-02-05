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
import { db } from './firebase';

export const fetchImages = async () => {
  const querySnapshot = await getDocs(collection(db, 'images'));
  return querySnapshot.docs.map((doc) => ({ id: doc.id, url: doc.data().url }));
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
        const imageDoc = {
          url: downloadURL,
          name: file.name, // Storing the file name
          uploadedAt: new Date(),
          userId: user ? user.uid : null, // Optionally store user ID
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

// Request functions
export const createRequest = async (requestData) => {
  try {
    if (!requestData.userId) {
      throw new Error('User ID is required to create a request');
    }
    const docRef = await addDoc(
      collection(db, 'users', requestData.userId, 'requests'),
      {
        ...requestData,
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
