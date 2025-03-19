import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// ✅ Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAJKjIHKiZmHxg9MYviBpKdBupSF5Qz_1E",
  authDomain: "workhive-46464.firebaseapp.com",
  projectId: "workhive-46464",
  storageBucket: "workhive-46464.appspot.com",
  messagingSenderId: "292232767053",
  appId: "1:292232767053:web:84bbaa642a9d1c84e99e04",
  measurementId: "G-GDW5NNKZ8S"
};

// ✅ Initialiser Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ✅ Fonction pour enregistrer un utilisateur
export const registerUser = async (username, email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 🔹 Ajouter l'utilisateur à Firestore
    await addDoc(collection(db, "users"), {
      uid: user.uid,
      username: username,
      email: email,
    });

    // 🔹 Stocker la session utilisateur
    const userData = { uid: user.uid, username, email };
    if (Platform.OS === "web") {
      localStorage.setItem("loggedInUser", JSON.stringify(userData));
    } else {
      await AsyncStorage.setItem("loggedInUser", JSON.stringify(userData));
    }

    return { success: true, user: userData };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ✅ Fonction pour connecter un utilisateur
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 🔹 Récupérer les infos de Firestore
    const q = query(collection(db, "users"), where("uid", "==", user.uid));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();

      // 🔹 Stocker la session utilisateur
      if (Platform.OS === "web") {
        localStorage.setItem("loggedInUser", JSON.stringify(userData));
      } else {
        await AsyncStorage.setItem("loggedInUser", JSON.stringify(userData));
      }

      return { success: true, user: userData };
    }
    return { success: false, error: "User not found in Firestore" };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ✅ Fonction pour récupérer l’utilisateur actuellement connecté
export const getCurrentUser = async () => {
  try {
    const storedUser = Platform.OS === "web"
      ? localStorage.getItem("loggedInUser")
      : await AsyncStorage.getItem("loggedInUser");

    return storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    console.error("❌ Error fetching user:", error);
    return null;
  }
};

// ✅ Fonction pour déconnecter l’utilisateur
export const logoutUser = async () => {
  await signOut(auth);
  if (Platform.OS === "web") {
    localStorage.removeItem("loggedInUser");
  } else {
    await AsyncStorage.removeItem("loggedInUser");
  }
};

// ✅ Fonction pour sauvegarder une image de profil
export const uploadProfileImage = async (uri, userId) => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, `profileImages/${userId}.jpg`);

    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error("❌ Error uploading image:", error);
    return null;
  }
};
