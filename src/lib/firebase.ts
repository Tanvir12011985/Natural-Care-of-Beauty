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
  // If your Firebase project uses a custom database ID, set it here.
  databaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)'
};

let app;
let db: any;
let auth: any;
let configError = false;

try {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error('Missing critical Firebase configuration (API Key or Project ID).');
  }
  app = initializeApp(firebaseConfig);
  db = getFirestore(app, firebaseConfig.databaseId);
  auth = getAuth(app);
} catch (error) {
  console.error('Firebase initialization failed:', error);
  configError = true;
  // Initialize with null/proxies to prevent immediate app crashes on import
  app = null;
  db = null;
  auth = { currentUser: null, onAuthStateChanged: () => () => {} }; 
}

export { db, auth, configError };
