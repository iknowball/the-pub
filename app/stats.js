// Firebase Firestore import (if not already imported)
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const db = getFirestore();
const auth = getAuth();

export async function recordGameStat(gameType, { gamesPlayedInc = 1, correctInc = 0, bestScore = null }) {
  const user = auth.currentUser;
  if (!user) {
    alert("You must be logged in!");
    return;
  }
  const userRef = doc(db, "users", user.uid);
  const statKey = `stats.${gameType}`;
  let userSnap = await getDoc(userRef);

  // Default stat for this game type
  const defaultStat = { gamesPlayed: 0, correct: 0, bestScore: 0 };
  let newStat = defaultStat;
  if (userSnap.exists() && userSnap.data().stats && userSnap.data().stats[gameType]) {
    newStat = { ...defaultStat, ...userSnap.data().stats[gameType] };
  }
  // Update values
  newStat.gamesPlayed += gamesPlayedInc;
  newStat.correct += correctInc;
  if (bestScore !== null && bestScore > (newStat.bestScore || 0)) {
    newStat.bestScore = bestScore;
  }
  // Write atomically
  await setDoc(userRef, { stats: { [gameType]: newStat } }, { merge: true });
}
