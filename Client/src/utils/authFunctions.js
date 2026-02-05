import { signInUser, signOutUser } from '../Auth';

export const handleSignIn = async (email, password, setIsAuthModalOpen) => {
  await signInUser(email, password);
  setIsAuthModalOpen(false);
};

export const handleSignOut = () => {
  signOutUser();
};

// Check if the current user has admin privileges via custom claims
export const checkIsAdmin = async (user) => {
  if (!user) return false;
  
  try {
    const tokenResult = await user.getIdTokenResult();
    return tokenResult.claims.admin === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};
