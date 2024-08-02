import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import { db } from './firebase';

export const fetchImages = async () => {
  const querySnapshot = await getDocs(collection(db, 'images'));
  return querySnapshot.docs.map((doc) => ({ id: doc.id, url: doc.data().url }));
};

export const handleFileChange = async (event, user, setImages) => {
  if (!user) {
    alert('You must be signed in to upload images.');
    return;
  }
  const file = event.target.files[0];
  if (!file) return;

  const storage = getStorage();
  const storageRef = ref(storage, `images/${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snapshot.ref);

  const db = getFirestore();
  const docRef = await addDoc(collection(db, 'images'), { url });

  setImages((prevImages) => [...prevImages, { id: docRef.id, url }]);
};

export const deleteImage = async (imageId, imageUrl) => {
  const db = getFirestore();
  await deleteDoc(doc(db, 'images', imageId));

  const storage = getStorage();
  const storageRef = ref(storage, imageUrl);
  await deleteObject(storageRef);
};
