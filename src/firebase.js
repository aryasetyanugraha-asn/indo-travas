// Import fungsi dari SDK Firebase
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Konfigurasi Firebase Anda
// Dapatkan data ini dari: Firebase Console -> Project Settings -> General -> Your Apps -> SDK Setup
const firebaseConfig = {
  apiKey: "API_KEY_FIREBASE_ANDA",
  authDomain: "id-project-anda.firebaseapp.com",
  projectId: "id-project-anda",
  storageBucket: "id-project-anda.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export layanan agar bisa dipakai di file lain
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
