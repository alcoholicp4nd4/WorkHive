import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, addDoc, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from './firebaseConfig';

// ✅ Fonction pour enregistrer un utilisateur
export const registerUser = async (username, email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 🔹 Créer les données utilisateur avec isProvider: false
    const userData = {
      uid: user.uid,
      username: username,
      email: email,
      isProvider: false,
    };

    // 🔹 Ajouter l'utilisateur à Firestore
    await addDoc(collection(db, "users"), userData);
    console.log("✅ User created:", userData);

    // 🔹 Stocker la session utilisateur
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

export const updateUserToProvider = async (uid) => {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { isProvider: true });
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

export const updateUserProfileImage = async (uid, imageUrl) => {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { profileImage: imageUrl });
};