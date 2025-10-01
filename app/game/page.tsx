"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDoc,
  doc,
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

const firebaseConfig = {
  apiKey: "AIzaSyBtsOBlh52YZagsLXp9_dcCq4qhkHBSWnU",
  authDomain: "thepub-sigma.firebaseapp.com",
  projectId: "thepub-sigma",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

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

// Helper functions
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
  while (emojis.length < maxLevels) emojis.push("❓");
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
  if (user) {
    return user.uid;
  }
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

  const guessInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Set background and font
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

  // Firebase Auth
  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) signInAnonymously(auth);
    });
  }, []);

  // Fetch daily players
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

  // Timer
  useEffect(() => {
    if (!timerActive || gameOver) return;
    timerRef.current = setInterval(() => setElapsedTime((t) => t + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, gameOver]);

  // Start timer on first level
  useEffect(() => {
    if (currentLevel === 1 && !timerActive && players.length > 0) setTimerActive(true);
  }, [currentLevel, players.length, timerActive]);

  // Stats history
  useEffect(() => {
    const history =
      typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("scoreHistory") || "[]")
        : [];
    setStatsHistory(history);
  }, [showStats, gameOver]);

  // Fetch cloud avg
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

  // Save score history
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

  // Record score in Firestore
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

  // Game logic
  const player = players[currentLevel - 1];

  const handleSubmitGuess = () => {
    if (!player || gameOver) return;
    const guess = guessInputRef.current?.value.trim().toLowerCase() || "";
    const correctName = player.name.toLowerCase();
    setFeedback("");
    let result = false;
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

  // Stats modal
  const closeStats = () => setShowStats(false);

  return (
    <div className="font-montserrat" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .font-montserrat { font-family: 'Montserrat', sans-serif; }
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
        .share-buttons-row {
          display: flex;
          flex-direction: row;
          gap: 14px;
          justify-content: center;
          align-items: center;
        }
        .game-card {
          background: rgba(70,38,19,0.93);
          padding: 1.5rem;
          border-radius: 18px;
          box-shadow: 0 6px 32px rgba(0,0,0,0.18);
          max-width: 410px;
          width: 100%;
          border: 2px solid #facc15;
          position: relative;
        }
        .navbar {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
          justify-content: center;
          margin-bottom: 1.2rem;
        }
        .navbar a {
          flex: 1 1 120px;
          background: #d97706;
          color: #fff;
          font-weight: bold;
          padding: 0.7rem 0.6rem;
          border-radius: 10px;
          border: 2px solid #facc15;
          text-decoration: none;
          box-shadow: 0 2px 10px #0002;
          text-align: center;
          transition: background 0.16s, transform 0.12s;
          font-size: 1rem;
        }
        .navbar a:hover {
          background: #b45309;
          transform: scale(1.05);
        }
        .player-img-card {
          position: relative;
          width: 100%;
          max-width: 220px;
          height: 170px;
          margin: 0 auto 1.2rem auto;
          border-radius: 14px;
          overflow: hidden;
          border: 2px solid #facc15;
          background: #222;
        }
        .player-img-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .guess-input {
          width: 100%;
          padding: 1rem;
          background: rgba(146, 64, 14, 0.93);
          color: #fff;
          border: 2px solid #facc15;
          border-radius: 10px;
          margin-bottom: 1rem;
          font-size: 1.08rem;
        }
        .submit-btn,
        .next-btn,
        .again-btn {
          width: 100%;
          max-width: 200px;
          margin-left: auto;
          margin-right: auto;
          background: #d97706;
          color: #fff;
          font-weight: bold;
          padding: 0.95rem 0.2rem 0.8rem 0.2rem;
          border-radius: 12px;
          margin-top: 0.7rem;
          text-decoration: none;
          border: 2px solid #facc15;
          box-shadow: 0 2px 10px #0002;
          font-size: 1.1rem;
          transition: background 0.16s, transform 0.12s;
          text-align: center;
          cursor: pointer;
          display: block;
        }
        .submit-btn:hover,
        .next-btn:hover,
        .again-btn:hover {
          background: #b45309;
          transform: scale(1.03);
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
          .game-card, .modal-content { max-width: 97vw; padding-left: 0.15rem; padding-right: 0.15rem; }
          .player-img-card { max-width: 93vw; height: 37vw; min-height: 110px; }
        }
      `}</style>
      <header
        style={{
          width: "100%",
          maxWidth: 410,
          background: "rgba(146, 64, 14, 0.93)",
          color: "#fde68a",
          textAlign: "center",
          padding: "0.9rem 0.2rem",
          border: "2px solid #facc15",
          borderRadius: 16,
          marginBottom: "1.3rem",
          fontWeight: "bold",
          fontSize: "1.18rem",
          boxShadow: "0 2px 12px #0003"
        }}
      >
        <p style={{ margin: 0 }}>New Games Daily at Midnight Eastern</p>
      </header>
      <div className="game-card">
        <div className="navbar">
          <Link href="/" className="">Home</Link>
          <Link href="/news" className="">News</Link>
          <Link href="/trivia-game" className="">Trivia</Link>
          <Link href="/college-game" className="">College</Link>
        </div>
        <h1 style={{ color: "#fde68a", fontSize: "2rem", fontWeight: "bold", marginBottom: "1rem" }}>Who is This?</h1>
        <p style={{ color: "#fde68a", fontSize: "1.08rem" }}>
          Level: <span>{currentLevel}</span>/{maxLevels}
        </p>
        <div className="player-img-card">
          {player && (
            <img
              src={player.image}
              alt="Athlete"
              onError={() => setImageError(true)}
              onLoad={() => setImageError(false)}
              style={{ display: imageError ? "none" : "block" }}
            />
          )}
        </div>
        {imageError && (
          <p className="feedback" style={{ color: "#ffb4b4" }}>
            Image failed to load. Keep guessing!
          </p>
        )}
        {!gameOver && player && (
          <>
            <input
              ref={guessInputRef}
              type="text"
              placeholder="Who's this athlete?"
              className="guess-input"
              autoComplete="off"
              onKeyDown={e => {
                if (e.key === "Enter") handleSubmitGuess();
              }}
              disabled={gameOver}
            />
            <button className="submit-btn" onClick={handleSubmitGuess} disabled={gameOver}>
              Submit Answer
            </button>
          </>
        )}
        {gameOver && (
          <>
            <button className="again-btn" onClick={handlePlayAgain}>Play Again</button>
            <button className="again-btn" style={{marginTop:"8px"}} onClick={()=>setShowStats(true)}>View Stats</button>
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
