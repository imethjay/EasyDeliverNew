import { initializeApp } from 'firebase/app';
import { Platform } from 'react-native';

import { 
  initializeAuth, 
  getReactNativePersistence 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Initialize Realtime Database
const rtdb = getDatabase(app);

// Initialize Analytics
let analytics = null;
try {
  if (Platform.OS === 'web' && app.name) {
    const { getAnalytics, isSupported } = require('firebase/analytics');
    isSupported().then(supported => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    }).catch(err => {
      console.log('Analytics not supported:', err.message);
    });
  }
} catch (error) {
  console.log('Error initializing analytics:', error);
}

export { auth, db, storage, rtdb, analytics };
export default app;
