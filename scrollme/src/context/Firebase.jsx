// Google sign-in through Firebase Authentication. Disabled unless the
// REACT_APP_FIREBASE_* variables are set; the API verifies the ID token
// (FIREBASE_PROJECT_ID) and opens a normal store session.
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

export const isGoogleSignInEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

// Loaded on demand so the Firebase SDK is not part of the main bundle.
export const getGoogleIdToken = async () => {
  if (!isGoogleSignInEnabled) throw new Error('Google sign-in is not configured');
  const [{ initializeApp, getApps }, { getAuth, GoogleAuthProvider, signInWithPopup }] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
  ]);
  const app = getApps()[0] || initializeApp(firebaseConfig);
  const result = await signInWithPopup(getAuth(app), new GoogleAuthProvider());
  return result.user.getIdToken();
};
