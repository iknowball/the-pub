import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";

// Add news post
export async function addNewsPost(title, content) {
  await addDoc(collection(db, "news"), {
    title,
    content,
    createdAt: new Date()
  });
}

// Fetch news posts
export async function getNewsPosts() {
  const newsQuery = query(collection(db, "news"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(newsQuery);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
