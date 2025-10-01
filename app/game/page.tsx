"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  getDoc,
  doc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  setDoc,
} from "firebase/firestore";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  User,
} from "firebase/auth";
import { getStorage, ref as storageRef, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBtsOBlh52YZagsLXp9_dcCq4qhkHBSWnU",
  authDomain: "thepub-sigma.firebaseapp.com",
  projectId: "thepub-sigma",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

type Player = {
  image: string;
  name: string;
};
type HistoryEntry = {
  score: number;
  time: number;
  timestamp: string;
};

const maxLevels = 5;

function getTodayEasternMidnight() {
  const now = new Date();
  const nyString = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  const nyDate = new Date(nyString);
  nyDate.setHours(0, 0, 0, 0);
  return nyDate.toISOString().slice(0, 10);
}
function getLevenshteinDistance(a: string, b: string) {
  const matrix = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1,
        matrix[j][i - 1] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}
function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
}
function emojiShareMessage(results: boolean[]): string {
  const emojis: string[] = results.map((r) => (r ? "✅" : "❌"));
  while (emojis.length < maxLevels) (emojis as string[]).push("❓");
  return emojis.join("");
}
function generateShareText(results: boolean[]) {
  const homepage = typeof window !== "undefined" ? window.location.origin + "/game" : "";
  return `${emojiShareMessage(results)} <a href="${homepage}" class="share-link-ball" target="_blank">Do you know ball?</a>`;
}
function generateClipboardText(results: boolean[]) {
  const homepage = typeof window !== "undefined" ? window.location.origin + "/game" : "";
  return `${emojiShareMessage(results)} Do you know ball? ${homepage}`;
}
function generateSmsLink(results: boolean[]) {
  const homepage = typeof window !== "undefined" ? window.location.origin + "/game" : "";
  const msg = `${emojiShareMessage(results)} Do you know ball? ${homepage}`;
  return "sms:?body=" + encodeURIComponent(msg);
}
function getCurrentUserId(user: User | null) {
  if (user) return user.uid;
  let anonId = typeof window !== "undefined" ? localStorage.getItem("anonUserId") : null;
  if (!anonId) {
    anonId = "anon-" + Math.random().toString(36).substring(2, 15);
    if (typeof window !== "undefined") {
      localStorage.setItem("anonUserId", anonId);
    }
  }
  return anonId;
}

const GuessThePlayer: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [answerResults, setAnswerResults] = useState<boolean[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [clipboardMsg, setClipboardMsg] = useState("Copy to Clipboard");
  const [imageError, setImageError] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [statsHistory, setStatsHistory] = useState<HistoryEntry[]>([]);
  const [cloudAvg, setCloudAvg] = useState<number | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  const guessInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Styling
  useEffect(() => {
    document.body.style.backgroundImage =
      "url('https://awolvision.com/cdn/shop/articles/sports_bar_awolvision.jpg?v=1713302733&width=1500')";
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundAttachment = "fixed";
    document.body.style.backgroundColor = "#451a03";
    document.body.style.fontFamily = "'Montserrat', sans-serif";
    return () => {
      document.body.style.backgroundImage = "";
      document.body.style.backgroundSize = "";
      document.body.style.backgroundPosition = "";
      document.body.style.backgroundAttachment = "";
      document.body.style.backgroundColor = "";
      document.body.style.fontFamily = "";
    };
  }, []);

  // Auth
  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) signInAnonymously(auth);
    });
  }, []);

  // Load daily players
  useEffect(() => {
    const fetchDailyPlayers = async () => {
      const dateKey = getTodayEasternMidnight();
      const docRef = doc(db, "dailyPlayers", dateKey);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && Array.isArray(docSnap.data().players)) {
        setPlayers(docSnap.data().players);
      } else {
        setPlayers([]);
      }
    };
    fetchDailyPlayers();
  }, []);

  // Get image download URL if needed
  const player = players[currentLevel - 1];
  useEffect(() => {
    let isMounted = true;
    if (!player?.image) {
      setImgUrl(null);
      return;
    }
    // If player.image is already an https url, use it; otherwise, assume Firebase Storage path
    if (player.image.startsWith("http")) {
      setImgUrl(player.image);
    } else {
      getDownloadURL(storageRef(storage, player.image))
        .then((url) => { if (isMounted) setImgUrl(url); })
        .catch(() => { if (isMounted) setImgUrl(null); });
    }
    return () => { isMounted = false; };
  }, [player]);

  // Timer logic
  useEffect(() => {
    if (players.length > 0 && !gameOver && !timerActive) setTimerActive(true);
  }, [players, gameOver, timerActive]);
  useEffect(() => {
    if (!timerActive) return;
    timerRef.current = setInterval(() => setElapsedTime(e => e + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive]);

  useEffect(() => {
    const history =
      typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("scoreHistory") || "[]")
        : [];
    setStatsHistory(history);
  }, [showStats, gameOver]);

  useEffect(() => {
    if (!user) return;
    const fetchCloudAvg = async () => {
      const docRef = doc(db, "userAverages", getCurrentUserId(user));
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setCloudAvg(docSnap.data().averageScore);
      }
    };
    fetchCloudAvg();
  }, [user, showStats]);

  const saveScoreHistory = (score: number, time: number) => {
    if (typeof window === "undefined") return;
    const history = JSON.parse(localStorage.getItem("scoreHistory") || "[]") as HistoryEntry[];
    history.push({
      score,
      time,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem("scoreHistory", JSON.stringify(history));
    setStatsHistory(history);
  };

  const recordGameScore = async (score: number, time: number) => {
    try {
      const userId = getCurrentUserId(user);
      await addDoc(collection(db, "gameScores"), {
        userId,
        score,
        time,
        playedAt: new Date().toISOString(),
      });
      await updateUserAverageScore(userId);
    } catch (err) {}
  };
  const updateUserAverageScore = async (userId: string) => {
    try {
      const q = query(collection(db, "gameScores"), where("userId", "==", userId));
      const snap = await getDocs(q);
      let total = 0,
        count = 0;
      snap.forEach((doc) => {
        total += doc.data().score;
        count += 1;
      });
      const avg = count === 0 ? 0 : total / count;
      await setDoc(doc(db, "userAverages", userId), {
        userId,
        averageScore: avg,
        lastUpdated: new Date().toISOString(),
        gamesPlayed: count,
      });
    } catch (err) {}
  };

  const handleSubmitGuess = () => {
    if (!player || gameOver) return;
    const guess = guessInputRef.current?.value.trim().toLowerCase() || "";
    const correctName = player.name.toLowerCase();
    setFeedback("");
    if (guess === correctName) {
      setScore((s) => s + 5);
      setFeedback("Nailed it! +5 points! 🏀");
      setAnswerResults((arr) => [...arr, true]);
    } else {
      const distance = getLevenshteinDistance(guess, correctName);
      if (distance <= 2 && guess.length > 0) {
        setFeedback("So close! Try again, you're off by a letter or two!");
        if (guessInputRef.current) guessInputRef.current.value = "";
        return;
      } else {
        setFeedback(`Swing and a miss! It was ${player.name}.`);
        setAnswerResults((arr) => [...arr, false]);
      }
    }
    if (guess === correctName || getLevenshteinDistance(guess, correctName) > 2) {
      setTimeout(() => {
        if (currentLevel < maxLevels) {
          setCurrentLevel((lvl) => lvl + 1);
          setFeedback("");
          setImageError(false);
          if (guessInputRef.current) guessInputRef.current.value = "";
        } else {
          setGameOver(true);
          setShowShare(true);
          setTimerActive(false);
          saveScoreHistory(score, elapsedTime);
          recordGameScore(score, elapsedTime);
        }
      }, 700);
    }
  };

  const handlePlayAgain = () => {
    setCurrentLevel(1);
    setScore(0);
    setAnswerResults([]);
    setElapsedTime(0);
    setFeedback("");
    setGameOver(false);
    setShowShare(false);
    setImageError(false);
    setTimerActive(true);
    if (guessInputRef.current) guessInputRef.current.value = "";
  };

  const handleClipboard = () => {
    const textToCopy = generateClipboardText(answerResults);
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        setClipboardMsg("Copied!");
        setTimeout(() => setClipboardMsg("Copy to Clipboard"), 1200);
      })
      .catch(() => {
        setClipboardMsg("Copy Failed");
        setTimeout(() => setClipboardMsg("Copy to Clipboard"), 1200);
      });
  };

  const closeStats = () => setShowStats(false);

  return (
    <div className="gtp-bg">
      <style>{`
        .gtp-bg {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: url('https://awolvision.com/cdn/shop/articles/sports_bar_awolvision.jpg?v=1713302733&width=1500') center/cover fixed no-repeat;
          font-family: 'Montserrat', Arial, sans-serif;
        }
        .gtp-card {
          background: rgba(146, 84, 14, 0.93);
          border: 3px solid #ffc233;
          border-radius: 22px;
          box-shadow: 0 8px 32px #0003;
          padding: 2.2rem 1.2rem 2.4rem 1.2rem;
          max-width: 420px;
          width: 95vw;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .gtp-nav-row {
          width: 100%;
          display: flex;
          gap: 1.1rem;
          justify-content: center;
          margin-bottom: 1.2rem;
        }
        .gtp-nav-btn {
          background: #ea9800;
          color: #fff;
          font-weight: bold;
          font-size: 1.25rem;
          border: 2px solid #ffc233;
          border-radius: 14px;
          padding: 0.7rem 2.2rem;
          margin-bottom: 0.2rem;
          box-shadow: 0 2px 10px #0002;
          cursor: pointer;
          text-align: center;
          text-decoration: none;
          transition: background 0.13s, color 0.13s, transform 0.12s;
          flex: 1 1 0;
          min-width: 0;
        }
        .gtp-nav-btn:hover {
          background: #e0a92b;
          color: #fffbe7;
          transform: scale(1.02);
        }
        .gtp-title {
          color: #ffe066;
          font-size: 2.5rem;
          font-weight: 900;
          text-align: center;
          margin-bottom: 0.5rem;
          letter-spacing: 0.02em;
        }
        .gtp-level {
          color: #ffe066;
          font-size: 1.3rem;
          font-weight: 700;
          text-align: center;
          margin-bottom: 1.3rem;
        }
        .gtp-img-wrap {
          background: #442200;
          border: 3px solid #ffc233;
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 1.5rem;
          width: 100%;
          max-width: 340px;
          height: 240px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .gtp-img-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .gtp-input {
          width: 100%;
          background: #ad6e1b;
          border: 2.5px solid #ffc233;
          color: #ffe066;
          border-radius: 14px;
          font-size: 1.2rem;
          padding: 1rem 1.2rem;
          margin-bottom: 1.3rem;
          font-weight: 500;
        }
        .gtp-input::placeholder {
          color: #ffe066cc;
          opacity: 1;
        }
        .gtp-submit-btn {
          width: 100%;
          background: #ea9800;
          color: #fff;
          font-size: 1.35rem;
          font-weight: bold;
          padding: 1.1rem 0;
          border-radius: 14px;
          border: 2px solid #ffc233;
          box-shadow: 0 2px 12px #0002;
          cursor: pointer;
          margin-bottom: 0.7rem;
          margin-top: 0;
          transition: background 0.16s, transform 0.13s;
        }
        .gtp-submit-btn:hover {
          background: #e0a92b;
          color: #fffbe7;
          transform: scale(1.04);
        }
        .feedback {
          text-align: center;
          margin-top: 1rem;
          font-size: 1.18rem;
          font-weight: bold;
          color: #fde68a;
          min-height: 1.3rem;
        }
        .score-row {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 1.1rem;
          margin-top: 1.2rem;
        }
        .timer-box {
          background: rgba(146, 64, 14, 0.93);
          color: #fde68a;
          border: 2px solid #facc15;
          border-radius: 8px;
          padding: 0.45rem 0.95rem;
          font-weight: bold;
          font-size: 1rem;
        }
        .share-buttons-row {
          display: flex;
          flex-direction: row;
          gap: 14px;
          justify-content: center;
          align-items: center;
        }
        .clipboard-btn, .sms-btn {
          background: #f9e38f;
          color: #533e1f;
          font-weight: bold;
          border-radius: 8px;
          border: 2px solid #cfb467;
          padding: 7px 18px;
          cursor: pointer;
          box-shadow: 0 2px 8px #cfb46733;
          margin-top: 8px;
          margin-bottom: 8px;
          transition: background 0.2s, color 0.2s;
          display: inline-block;
        }
        .clipboard-btn:hover, .sms-btn:hover {
          background: #fffbe7;
          color: #b88340;
        }
        .share-preview {
          font-size: 1.15rem;
          color: #f9e38f;
          font-weight: bold;
          margin-top: 10px;
          margin-bottom: 6px;
          text-align: center;
          word-break: break-word;
        }
        .share-link-ball {
          color: #ffd700;
          text-decoration: underline;
          font-size: 1.15rem;
          font-weight: bold;
          margin-left: 6px;
          cursor: pointer;
        }
        .share-link-ball:hover {
          color: #ffbb33;
          text-decoration: underline;
        }
        .modal-bg {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: rgba(146, 64, 14, 0.97);
          border-radius: 18px;
          box-shadow: 0 6px 32px rgba(0,0,0,0.18);
          padding: 2.2rem 1.2rem 2.2rem 1.2rem;
          width: 100%;
          max-width: 430px;
          border: 2px solid #facc15;
          color: #fde68a;
          position: relative;
        }
        .modal-content h2 {
          color: #fde68a;
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 1.1rem;
          text-align: center;
        }
        .stats-table {
          width: 100%;
          color: #fde68a;
          border-collapse: collapse;
          font-size: 1rem;
        }
        .stats-table th,
        .stats-table td {
          border: 1.5px solid #facc15;
          padding: 0.6rem 0.3rem;
          text-align: center;
        }
        .stats-table thead {
          background: #b45309;
        }
        .stats-table tr:hover {
          background: #d97706;
        }
        .close-btn {
          width: 100%;
          background: #d97706;
          color: #fff;
          font-weight: bold;
          padding: 0.9rem 0.2rem 0.7rem 0.2rem;
          border-radius: 12px;
          margin-top: 1.3rem;
          text-decoration: none;
          border: 2px solid #facc15;
          box-shadow: 0 2px 10px #0002;
          font-size: 1.1rem;
          cursor: pointer;
          transition: background 0.16s, transform 0.12s;
        }
        .close-btn:hover {
          background: #b45309;
          transform: scale(1.03);
        }
        @media (max-width: 600px) {
          .gtp-card, .modal-content { max-width: 97vw; padding-left: 0.15rem; padding-right: 0.15rem; }
          .gtp-img-wrap { max-width: 98vw; height: 34vw; min-height: 120px;}
          .gtp-nav-row { flex-direction: column; gap: 0.7rem; }
          .gtp-nav-btn { width: 100%; }
        }
      `}</style>
      <div className="gtp-card">
        <div className="gtp-nav-row">
          <Link href="/" className="gtp-nav-btn">Home</Link>
          <Link href="/news" className="gtp-nav-btn">News</Link>
          <Link href="/trivia-game" className="gtp-nav-btn">Trivia</Link>
          <Link href="/college-game" className="gtp-nav-btn">College</Link>
        </div>
        <div className="gtp-title">Who is This?</div>
        <div className="gtp-level">Level: {currentLevel}/{maxLevels}</div>
        <div className="gtp-img-wrap">
          {imgUrl && (
            <img
              src={imgUrl}
              alt="Athlete"
              onError={() => setImageError(true)}
              onLoad={() => setImageError(false)}
              style={{ display: imageError ? "none" : "block" }}
            />
          )}
        </div>
        {!gameOver && player && (
          <>
            <input
              ref={guessInputRef}
              type="text"
              placeholder="Who's this athlete?"
              className="gtp-input"
              autoComplete="off"
              onKeyDown={e => {
                if (e.key === "Enter") handleSubmitGuess();
              }}
              disabled={gameOver}
            />
            <button className="gtp-submit-btn" onClick={handleSubmitGuess} disabled={gameOver}>
              Submit Answer
            </button>
          </>
        )}
        {gameOver && (
          <>
            <button className="gtp-submit-btn" onClick={handlePlayAgain}>Play Again</button>
            <button className="gtp-submit-btn" style={{marginTop:"8px"}} onClick={()=>setShowStats(true)}>View Stats</button>
          </>
        )}
        <div className="feedback">{feedback}</div>
        <div className="score-row">
          <div className="timer-box">{formatTime(elapsedTime)}</div>
          <div className="score">Score: <span>{score}</span>/25</div>
        </div>
        <div className="share-buttons-row" style={{ marginTop: 16, display: showShare ? "flex" : "none" }}>
          <button className="clipboard-btn" onClick={handleClipboard}>
            {clipboardMsg}
          </button>
          <a className="sms-btn" href={generateSmsLink(answerResults)} target="_blank" rel="noopener noreferrer">
            Send as SMS
          </a>
        </div>
        <div
          className="share-preview"
          style={{ display: showShare ? "block" : "none" }}
          dangerouslySetInnerHTML={{ __html: generateShareText(answerResults) }}
        />
      </div>
      {showStats && (
        <div className="modal-bg">
          <div className="modal-content">
            <h2>Your Pub Quiz Stats</h2>
            <p style={{ textAlign: "center", marginBottom: "1.2rem", fontSize: "1.15rem" }}>
              {cloudAvg !== null
                ? `Average Score (cloud): ${cloudAvg.toFixed(1)}/25`
                : `Average Score (local): ${
                  statsHistory.length > 0
                    ? (
                        statsHistory.reduce((sum, e) => sum + e.score, 0) /
                        statsHistory.length
                      ).toFixed(1)
                    : "0"
                }/25`}
            </p>
            <div style={{ overflowX: "auto" }}>
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>Attempt</th>
                    <th>Score</th>
                    <th>Time</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {statsHistory.map((entry, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>{entry.score}/25</td>
                      <td>{formatTime(entry.time)}</td>
                      <td>
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="close-btn" onClick={closeStats}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuessThePlayer;
