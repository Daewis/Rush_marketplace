import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  memoryLocalCache,
  Firestore,
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

let db: Firestore;
try {
  db = initializeFirestore(app, {
    localCache: memoryLocalCache(),
    experimentalAutoDetectLongPolling: true,
  }, firebaseConfigJson.firestoreDatabaseId || '(default)');
} catch (e) {
  try {
    db = getFirestore(app, firebaseConfigJson.firestoreDatabaseId || '(default)');
  } catch (err2) {
    db = getFirestore(app);
  }
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Safe wrapper for getDoc with a 2.5s timeout to prevent hanging when offline or firestore connection fails
async function getDocSafe(docRef: any): Promise<any> {
  try {
    const timeoutPromise = new Promise((resolve) =>
      setTimeout(() => resolve({ exists: () => false, data: () => null }), 2000)
    );
    const result: any = await Promise.race([getDoc(docRef), timeoutPromise]);
    return result || { exists: () => false, data: () => null };
  } catch (err) {
    console.warn('Firestore getDoc notice (operating in offline/memory mode):', err);
    return { exists: () => false, data: () => null };
  }
}

// Safe wrapper for setDoc with timeout
async function setDocSafe(docRef: any, data: any, options?: any): Promise<boolean> {
  try {
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(false), 2000));
    await Promise.race([setDoc(docRef, data, options), timeoutPromise]);
    return true;
  } catch (err) {
    console.warn('Firestore setDoc notice (operating in offline/memory mode):', err);
    return false;
  }
}

export {
  app,
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  getDocSafe,
  setDocSafe,
  updateDoc,
  serverTimestamp
};
export type { FirebaseUser };
