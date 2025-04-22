// firebaseConfig.js (doit uniquement initialiser et exporter auth/db/storage)

import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ Configuration Firebase
const firebaseConfig = {
  apiKey: 'AIzaSyAJKjIHKiZmHxg9MYviBpKdBupSF5Qz_1E',
  authDomain: 'workhive-46464.firebaseapp.com',
  projectId: 'workhive-46464',
  storageBucket: 'workhive-46464.appspot.com',
  messagingSenderId: '292232767053',
  appId: '1:292232767053:web:84bbaa642a9d1c84e99e04',
  measurementId: 'G-GDW5NNKZ8S'
};

const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore with settings to suppress BloomFilter warning
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
});

const storage = getStorage(app);

export { auth, db, storage };
