import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import {
  initializeFirestore,
  memoryLocalCache,
  getFirestore,
} from "firebase/firestore";
import importedConfig from "../firebase-applet-config.json";

const firebaseConfig = {
  projectId: importedConfig?.projectId || "gen-lang-client-0293938171",
  appId: importedConfig?.appId || "1:202490401321:web:6b07a6f29612e847eac238",
  apiKey: importedConfig?.apiKey || "AIzaSyCfDfw9a-nMIhWHqiWwJf0KU-t2XSlYC-o",
  authDomain:
    importedConfig?.authDomain || "gen-lang-client-0293938171.firebaseapp.com",
  storageBucket:
    importedConfig?.storageBucket ||
    "gen-lang-client-0293938171.firebasestorage.app",
  messagingSenderId: importedConfig?.messagingSenderId || "202490401321",
  firestoreDatabaseId:
    importedConfig?.firestoreDatabaseId ||
    "ai-studio-aistudyassistant-ab39b0f1-2c34-4452-884c-df4012b20083",
};

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Initialize Firestore Database safely with memory cache to prevent BloomFilter hash errors
const dbId = firebaseConfig.firestoreDatabaseId || undefined;
let firestoreInstance;
try {
  firestoreInstance = dbId
    ? initializeFirestore(app, { localCache: memoryLocalCache() }, dbId)
    : initializeFirestore(app, { localCache: memoryLocalCache() });
} catch {
  firestoreInstance = dbId ? getFirestore(app, dbId) : getFirestore(app);
}

export const db = firestoreInstance;

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.warn("Popup blocked or failed, trying redirect...", error);
    if (
      error.code === "auth/popup-blocked" ||
      error.code === "auth/popup-closed-by-user" ||
      error.code === "auth/cancelled-popup-request"
    ) {
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (redirectErr) {
        console.error("Redirect sign in error:", redirectErr);
        throw redirectErr;
      }
    } else {
      throw error;
    }
  }
};

export const logoutUser = async () => {
  await firebaseSignOut(auth);
};

export { onAuthStateChanged };
export type { FirebaseUser };
