import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";

// Add bulletin post
export async function addBulletinPost(user, message) {
  await addDoc(collection(db, "bulletin"), {
    user,
    message,
    createdAt: new Date()
  });
}

// Fetch bulletin posts
export async function getBulletinPosts() {
  const bulletinQuery = query(collection(db, "bulletin"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(bulletinQuery);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
