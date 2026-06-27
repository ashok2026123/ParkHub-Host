import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBFXRLesk1jU56fSzmR0kjoNmLM_b_EfjU",
  authDomain: "parkhub-2343e.firebaseapp.com",
  databaseURL: "https://parkhub-2343e-default-rtdb.firebaseio.com",
  projectId: "parkhub-2343e",
  storageBucket: "parkhub-2343e.firebasestorage.app",
  messagingSenderId: "196449294246",
  appId: "1:196449294246:web:72aed588d08313144fe167",
  measurementId: "G-VFMRV78X7J"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
};
