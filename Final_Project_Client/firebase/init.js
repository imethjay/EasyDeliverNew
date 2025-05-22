// Firebase App (the core Firebase SDK) is always required and must be listed first
import { initializeApp } from 'firebase/app';

// Add the Firebase products that you want to use
import { 
  initializeAuth, 
  getReactNativePersistence 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDCPGQPwVcfDEkHNPqby3_8d0U9Yv3k2EI",
  authDomain: "imethjay-70734.firebaseapp.com",
  databaseURL: "https://imethjay-70734-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "imethjay-70734",
  storageBucket: "imethjay-70734.appspot.com",
  messagingSenderId: "609742212576",
  appId: "1:609742212576:web:1555302c07558b9d132f85",
  measurementId: "G-XX4SB1RC3Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage for persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore
const db = getFirestore(app);

// Initialize Storage
const storage = getStorage(app);

// Initialize Analytics
let analytics;
if (app.name && typeof window !== 'undefined') {
  const { getAnalytics } = require('firebase/analytics');
  analytics = getAnalytics(app);
}

export { auth, db, storage, analytics };
export default app;
