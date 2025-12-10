import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBWffURf2K0vWxDv3kr8x2v1FtnnhSAjwM",
  authDomain: "financeapp-13f67.firebaseapp.com",
  projectId: "financeapp-13f67",
  storageBucket: "financeapp-13f67.firebasestorage.app",
  messagingSenderId: "83328545198",
  appId: "1:83328545198:web:7634bc775c25574852983f",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
