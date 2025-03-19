import { initializeApp } from "firebase/app";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut 
} from "firebase/auth";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence } from "firebase/auth/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// ✅ Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAJKjIHKiZmHxg9MYviBpKdBupSF5Qz_1E",
    authDomain: "workhive-46464.firebaseapp.com",
    projectId: "workhive-46464",
    storageBucket: "workhive-46464.appspot.com",
    messagingSenderId: "292232767053",
    appId: "1:292232767053:web:84bbaa642a9d1c84e99e04",
};

// ✅ Initialize Firebase App
const app = initializeApp(firebaseConfig);

// ✅ Fix: Enable Auth Persistence for Mobile
const auth = Platform.OS === "web"
    ? getAuth(app)  // Standard auth for web
    : initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
    });

const db = getFirestore(app);

export { auth, db };
