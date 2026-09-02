import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  enableIndexedDbPersistence
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with robust multi-tab offline persistence
let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, firebaseConfig.firestoreDatabaseId || '(default)');
} catch (e) {
  // Fallback for environment constraints if already initialized
  try {
    firestoreInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
  } catch (err) {
    firestoreInstance = getFirestore(app);
  }
}

export const db = firestoreInstance;
export default app;
