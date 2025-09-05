import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBtsOBlh52YZagsLXp9_dcCq4qhkHBSWnU",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "thepub-sigma",
  storageBucket: "thepub-sigma.appspot.com",
  messagingSenderId: "108972507038",
  appId: "1:108972507038:web:4503cbe63cb3f7a3e4e08f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
