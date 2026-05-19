import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuration is now strictly environment-driven for security and deployment compatibility.
// In Netlify/Vercel, set these as Environment Variables.
// In local development, use a .env file.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  // Use the custom database ID if provided, otherwise default to '(default)'
  databaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)'
};

let app: any;
let db: any;
let auth: any;
let configError = false;

try {
  // Check for minimum required config to avoid total crash
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || firebaseConfig.apiKey === 'undefined') {
    throw new Error('Missing critical Firebase configuration.');
  }
  
  app = initializeApp(firebaseConfig);
  db = getFirestore(app, firebaseConfig.databaseId);
  auth = getAuth(app);
} catch (error) {
  console.warn('Firebase initialization failed (deferred):', error);
  configError = true;
  // Initialize with dummy objects to prevent import-time crashes
  app = null;
  db = null;
  auth = { 
    currentUser: null, 
    onAuthStateChanged: () => () => {},
    signOut: () => Promise.resolve()
  }; 
}

export { db, auth, configError, firebaseConfig };
