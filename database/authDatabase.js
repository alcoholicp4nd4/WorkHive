import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from './firebaseConfig';

// REGISTER USER
export const registerUser = async (username, email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const { uid } = userCredential.user;

    const userData = {
      uid,
      username,
      email,
      isProvider: false,
      role: "user",
      createdAt: Date.now(),
    };

    await setDoc(doc(db, "users", uid), userData);

    const storageKey = Platform.OS === "web" ? "loggedInUser" : `loggedInUser`;
    const stringified = JSON.stringify(userData);
    if (Platform.OS === "web") localStorage.setItem(storageKey, stringified);
    else await AsyncStorage.setItem(storageKey, stringified);

    return { success: true, user: userData };
  } catch (error) {
    console.error("❌ registerUser error:", error);
    return { success: false, error: error.message };
  }
};

// LOGIN USER
export const loginUser = async (email, password) => {
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    const uid = user.uid;

    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) throw new Error("User profile missing");

    const userData = snap.data();
    const storageKey = Platform.OS === "web" ? "loggedInUser" : `loggedInUser`;
    const stringified = JSON.stringify(userData);
    if (Platform.OS === "web") localStorage.setItem(storageKey, stringified);
    else await AsyncStorage.setItem(storageKey, stringified);

    const isAdmin = userData.role === "admin";
    return { success: true, user: userData, ...(isAdmin && { isAdmin: true }) };
  } catch (error) {
    console.error("❌ loginUser error:", error);
    return { success: false, error: error.message };
  }
};

// GET CURRENT USER
export const getCurrentUser = async () => {
  try {
    const storageKey = Platform.OS === "web" ? "loggedInUser" : `loggedInUser`;
    const raw = Platform.OS === "web"
      ? localStorage.getItem(storageKey)
      : await AsyncStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("❌ getCurrentUser error:", error);
    return null;
  }
};

// LOGOUT
export const logoutUser = async () => {
  try {
    await signOut(auth);
    const storageKey = Platform.OS === "web" ? "loggedInUser" : `loggedInUser`;
    if (Platform.OS === "web") localStorage.removeItem(storageKey);
    else await AsyncStorage.removeItem(storageKey);
  } catch (err) {
    console.error("❌ logoutUser error:", err);
  }
};

// MAKE PROVIDER
export const updateUserToProvider = async (uid) => {
  try {
    await updateDoc(doc(db, "users", uid), { isProvider: true });
  } catch (err) {
    console.error("❌ updateUserToProvider error:", err);
  }
};

// UPLOAD PROFILE IMAGE (IMGBB)
export const uploadProfileImage = async (fileUri, uid) => {
  try {
    const response = await fetch(fileUri);
    const blob = await response.blob();
    const base64 = await new Promise((res, rej) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => res(reader.result.split(",")[1]);
      reader.onerror = rej;
    });

    const form = new FormData();
    form.append("key", "590d8c2489661a30ea77153c3d94cb7e");
    form.append("image", base64);

    const res = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: form,
    });
    const json = await res.json();
    return json.success ? json.data.url : null;
  } catch (err) {
    console.error("❌ uploadProfileImage error:", err);
    return null;
  }
};

// UPLOAD DOCUMENTS (IMAGES TO IMGBB, OTHERS TO GOFILE)
export const uploadDocument = async (fileUri, uid, filename) => {
  try {
    const isImage = /\.(jpg|jpeg|png|gif)$/i.test(filename);
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) throw new Error('File does not exist locally.');

    if (isImage) {
      console.log("🖼 Uploading image doc to ImgBB...");
      return await uploadProfileImage(fileUri, uid);
    }

    console.log("📄 Uploading document to Gofile...");
    const form = new FormData();
    form.append('file', {
      uri: fileUri,
      name: filename,
      type: 'application/octet-stream',
    });

    const res = await fetch("https://store1.gofile.io/uploadFile", {
      method: "POST",
      headers: {
        "Content-Type": "multipart/form-data",
      },
      body: form,
    });

    const json = await res.json();
    if (json.status !== "ok") {
      throw new Error("Gofile upload failed: " + (json?.status || 'unknown status'));
    }

    return json.data.downloadPage || json.data.directLink;
  } catch (err) {
    console.error("❌ uploadDocument error:", err.message || err);
    return null;
  }
};

// UPDATE USER PROFILE
export const updateUserProfile = async (uid, data) => {
  try {
    await updateDoc(doc(db, "users", uid), data);
    const current = await getCurrentUser();
    const updated = { ...current, ...data };
    const storageKey = Platform.OS === "web" ? "loggedInUser" : `loggedInUser`;
    const str = JSON.stringify(updated);
    if (Platform.OS === "web") localStorage.setItem(storageKey, str);
    else await AsyncStorage.setItem(storageKey, str);
    return true;
  } catch (err) {
    console.error("❌ updateUserProfile error:", err);
    return false;
  }
};
