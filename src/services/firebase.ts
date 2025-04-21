import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export const initializeFirebase = () => {
  GoogleSignin.configure({
    // You'll need to get your Web Client ID from Firebase Console
    webClientId: '730822116943-p33cr2huft9p9843v5aat2hdvs1qn4lg.apps.googleusercontent.com',
  });
};

export const signInWithGoogle = async () => {
  try {
         // Check if your device supports Google Play
         await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
         // Get the users ID token
         const signInResult = await GoogleSignin.signIn();
   
         // Try the new style of google-sign in result, from v13+ of that module
         let idToken = signInResult.data?.idToken;
         if (!idToken) {
           // if you are using older versions of google-signin, try old style result
           idToken = signInResult.idToken;
         }
         if (!idToken) {
       throw new Error('No ID token found');
     }
   
     // Create a Google credential with the token
     const googleCredential = auth.GoogleAuthProvider.credential(signInResult.data.idToken);
   
     // Sign-in the user with the credential
     return auth().signInWithCredential(googleCredential);
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    await GoogleSignin.revokeAccess();
    await GoogleSignin.signOut();
    await auth().signOut();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getCurrentUser = () => {
  return auth().currentUser;
};
