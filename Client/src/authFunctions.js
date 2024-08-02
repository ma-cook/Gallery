import { signInUser, signOutUser } from './Auth';

export const handleSignIn = async (email, password, setIsAuthModalOpen) => {
  await signInUser(email, password);
  setIsAuthModalOpen(false);
};

export const handleSignOut = () => {
  signOutUser();
};
