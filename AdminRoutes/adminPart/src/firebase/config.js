// Import Firebase SDK
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration - same as client app
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

// Initialize Auth
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Storage
const storage = getStorage(app);

export { auth, db, storage };
export default app; 