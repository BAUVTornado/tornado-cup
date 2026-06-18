// Gerekli Firebase fonksiyonlarını içe aktarıyoruz
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase yapılandırma bilgilerin (Senin projenin anahtarları)
const firebaseConfig = {
  apiKey: "AIzaSyDrOsEYehI794PQ3752qufzbpp1J-SIKVk",
  authDomain: "tornado-cup.firebaseapp.com",
  projectId: "tornado-cup",
  storageBucket: "tornado-cup.firebasestorage.app",
  messagingSenderId: "607509520214",
  appId: "1:607509520214:web:d899ebbbc6602df8fe40f7",
  measurementId: "G-RH2NLXGH19"
};

// Firebase'i uygulamamız için başlatıyoruz
const app = initializeApp(firebaseConfig);

// Sitede kullanacağımız servisleri dışarıya aktarıyoruz (export)
export const auth = getAuth(app);                       // Giriş sistemi için
export const googleProvider = new GoogleAuthProvider(); // Gmail ile giriş butonu için
export const db = getFirestore(app);                    // Kullanıcı adlarını kaydetmek için