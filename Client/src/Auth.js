import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';

const auth = getAuth();

export const signInUser = async (email, password) => {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    console.log('User signed in');
  } catch (error) {
    console.error('Error signing in: ', error.message);
  }
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
    console.log('User signed out');
  } catch (error) {
    console.error('Error signing out: ', error.message);
  }
};
