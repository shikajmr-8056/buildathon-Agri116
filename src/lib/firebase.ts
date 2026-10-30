// Firebase configuration for Smart Polyhouse (Hardware Node: smart-polyhouse-dc97b)
import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyA0v6MgduPFUY1wOdDmvXkklP8ocWVnreE",
  authDomain: "smart-polyhouse-dc97b.firebaseapp.com",
  databaseURL:
    "https://smart-polyhouse-dc97b-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "smart-polyhouse-dc97b",
  storageBucket: "smart-polyhouse-dc97b.firebasestorage.app",
};

// Prevent re-initialisation during hot-module reloads
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getDatabase(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// Authenticate with the hardware operator account to ensure full read/write permission
if (typeof window !== "undefined") {
  signInWithEmailAndPassword(auth, "polyhouse299@gmail.com", "Polyhouse@123")
    .then((userCredential) => {
      console.log("Firebase Hardware Auth authenticated successfully as:", userCredential.user.email);
    })
    .catch((err) => {
      console.warn("Firebase Auth notice:", err.message);
    });
}
