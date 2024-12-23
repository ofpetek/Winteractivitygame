// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDHrzjbxex98xvu4OPNqXLrMasvP5kWldU",
  authDomain: "winteractivitygame.firebaseapp.com",
  projectId: "winteractivitygame",
  storageBucket: "winteractivitygame.firebasestorage.app",
  messagingSenderId: "608211133627",
  appId: "1:608211133627:web:ebfd57d406d73c4f2ef59e",
  measurementId: "G-8EDVRK7DE6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const db = getFirestore(app);

export { app, storage, db };
