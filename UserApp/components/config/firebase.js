// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDCPGQPwVcfDEkHNPqby3_8d0U9Yv3k2EI",
  authDomain: "imethjay-70734.firebaseapp.com",
  databaseURL: "https://imethjay-70734-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "imethjay-70734",
  storageBucket: "imethjay-70734.firebasestorage.app",
  messagingSenderId: "609742212576",
  appId: "1:609742212576:web:1555302c07558b9d132f85",
  measurementId: "G-XX4SB1RC3Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Storage
export const storage = getStorage(app);

// Initialize Analytics
let analytics;
if (app.name && typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { analytics };

// Log Firebase initialization
console.log('Firebase initialized successfully');