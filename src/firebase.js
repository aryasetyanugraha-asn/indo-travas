// Import fungsi dari SDK Firebase
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Konfigurasi Firebase Anda
// Dapatkan data ini dari: Firebase Console -> Project Settings -> General -> Your Apps -> SDK Setup
const firebaseConfig = {
  apiKey: "AIzaSyBzQwMZSq8ZAd--_pcRvaGkHp0tEq9SFOQ",
  authDomain: "indotravas.firebaseapp.com",
  projectId: "indotravas",
  storageBucket: "indotravas.firebasestorage.app",
  messagingSenderId: "805900654184",
  appId: "1:805900654184:web:010331d0f1822d43078ddd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export layanan agar bisa dipakai di file lain
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
