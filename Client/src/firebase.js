import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyCtUFSP15M3yhj6l4g_N3EWkFQV89RLAwA',
  authDomain: 'gallery-1ede7.firebaseapp.com',
  projectId: 'gallery-1ede7',
  storageBucket: 'gallery-1ede7.appspot.com',
  messagingSenderId: '1082752692981',
  appId: '1:1082752692981:web:864f783223d7994598cbbc',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore and export
export const db = getFirestore(app);

// Initialize Storage and export
export const storage = getStorage(app);
