// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAavN_3Od05GdknEWQ9d0rMjB5KVJJaXlU",
  authDomain: "triska-dfaa8.firebaseapp.com",
  projectId: "triska-dfaa8",
  storageBucket: "triska-dfaa8.firebasestorage.app",
  messagingSenderId: "446810685135",
  appId: "1:446810685135:web:0f48728cfeade2fa8a41ba"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);