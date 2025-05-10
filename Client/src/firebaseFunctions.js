import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  getDoc,
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
