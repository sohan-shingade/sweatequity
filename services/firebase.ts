import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCSvdSD4mXrMPr_k1A4Z3Cs6NbZaMeBugc",
  authDomain: "sweatequity-2861d.firebaseapp.com",
  projectId: "sweatequity-2861d",
  storageBucket: "sweatequity-2861d.firebasestorage.app",
  messagingSenderId: "1047607505734",
  appId: "1:1047607505734:web:dc72e269bf401b5fdeab47",
  measurementId: "G-EY3L0SLM7B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);

// Export services used by the app
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);