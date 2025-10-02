"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
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

type Athlete = {
  name: string;
  college: string;
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
function getCurrentUserId(user: User | null) {
  if (user) {
    return user.uid;
  }
  let anonId = localStorage.getItem("anonUserId");
  if (!anonId) {
    anonId = "anon-" + Math.random().toString(36).substring(2, 15);
    localStorage.setItem("anonUserId", anonId);
  }
  return anonId;
}
const emojiShareMessage = (results: boolean[]): string => {
  const emojis: string[] = results.map((r) => (r ? "✅" : "❌"));
  while (emojis.length < maxLevels) emojis.push("❓");
  return emojis.join("");
};

const CollegeGuess: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [answerResults, setAnswerResults] = useState<boolean[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [showStats, setShowStats] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [statsHistory, setStatsHistory] = useState<HistoryEntry[]>([]);
  const [cloudAvg, setCloudAvg] = useState<number | null>(null);
  const [clipboardMsg, setClipboardMsg] = useState("Copy to Clipboard");
  const [showShare, setShowShare] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const guessInputRef = useRef<HTMLInputElement>(null);

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

  // Auth state
  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) signInAnonymously(auth);
    });
  }, []);

  // Fetch athletes for today
  useEffect(() => {
    const fetchDailyAthletes = async () => {
      const dateKey = getTodayEasternMidnight();
      const docRef = doc(db, "dailyCollegeAthletes", dateKey);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && Array.isArray(docSnap.data().athletes)) {
        setAthletes(docSnap.data().athletes);
      } else {
        setAthletes([]);
      }
    };
    fetchDailyAthletes();
  }, []);

  // Timer logic
  useEffect(() => {
    if (!timerActive) return;
    timerRef.current = setInterval(() => {
      setElapsedTime((t) => t + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive]);

  // Stats history local
  useEffect(() => {
    const history =
      JSON.parse(localStorage.getItem("collegeGameHistory") || "[]") as HistoryEntry[];
    setStatsHistory(history);
  }, [showStats, gameOver]);

  // Cloud average
  useEffect(() => {
    if (!user) return;
    const fetchCloudAvg = async () => {
      const docRef = doc(db, "collegeAverages", getCurrentUserId(user));
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setCloudAvg(docSnap.data().averageScore);
      }
    };
    fetchCloudAvg();
  }, [user, showStats]);

  // Save game history locally
  const saveScoreHistory = (score: number, time: number) => {
    const history = JSON.parse(
      localStorage.getItem("collegeGameHistory") || "[]"
    ) as HistoryEntry[];
    history.push({
      score,
      time,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem("collegeGameHistory", JSON.stringify(history));
    setStatsHistory(history);
  };

  // Save score to Firestore
  const recordCollegeGameScore = async (score: number, time: number) => {
    try {
      const userId = getCurrentUserId(user);
      await addDoc(collection(db, "collegeGameScores"), {
        userId,
        score,
        time,
        playedAt: new Date().toISOString(),
      });
      await updateCollegeAverageScore(userId);
    } catch (err) {}
  };

  // Update average score in Firestore
  const updateCollegeAverageScore = async (userId: string) => {
    try {
      const q = query(
        collection(db, "collegeGameScores"),
        where("userId", "==", userId)
      );
      const snap = await getDocs(q);
      let total = 0,
        count = 0;
      snap.forEach((doc) => {
        total += doc.data().score;
        count += 1;
      });
      const avg = count === 0 ? 0 : total / count;
      await setDoc(doc(db, "collegeAverages", userId), {
        userId,
        averageScore: avg,
        lastUpdated: new Date().toISOString(),
        gamesPlayed: count,
      });
    } catch (err) {}
  };

  // Share logic
  const homepage = typeof window !== "undefined" ? window.location.origin + "/college-game.html" : "";
  const generateShareText = (results: boolean[]) => {
    return `${emojiShareMessage(results)} <a href="${homepage}" class="share-link-ball" target="_blank">Do you know ball?</a>`;
  };
  const generateClipboardText = (results: boolean[]) => {
    return `${emojiShareMessage(results)} Do you know ball? ${homepage}`;
  };
  const generateSmsLink = (results: boolean[]) => {
    const msg = `${emojiShareMessage(results)} Do you know ball? ${homepage}`;
    return "sms:?body=" + encodeURIComponent(msg);
  };

  // Game logic
  const athlete = athletes[currentLevel - 1];

  const handleSubmitGuess = () => {
    if (!athlete || gameOver) return;
    const guess = guessInputRef.current?.value.trim().toLowerCase() || "";
    const correctCollege = athlete.college.toLowerCase();
    setFeedback("");
    if (guess === correctCollege) {
      setScore((s) => s + 5);
      setFeedback("Nailed it! +5 points! 🏀");
      setAnswerResults((arr) => [...arr, true]);
      setTimerActive(false);
    } else {
      const distance = getLevenshteinDistance(guess, correctCollege);
      if (distance <= 2 && guess.length > 0) {
        setFeedback("So close! Try again, you're off by a letter or two!");
        if (guessInputRef.current) guessInputRef.current.value = "";
        return;
      } else {
        setFeedback(`Swing and a miss! It was ${athlete.college}.`);
        setAnswerResults((arr) => [...arr, false]);
        setTimerActive(false);
      }
    }
  };

  const handleNextLevel = () => {
    if (currentLevel < maxLevels) {
      setCurrentLevel((lvl) => lvl + 1);
      setFeedback("");
      setTimerActive(true);
      if (guessInputRef.current) guessInputRef.current.value = "";
    } else {
      setGameOver(true);
      setShowShare(true);
      setTimerActive(false);
      saveScoreHistory(score, elapsedTime);
      recordCollegeGameScore(score, elapsedTime);
    }
  };

  // Reset game
  const handlePlayAgain = () => {
    setCurrentLevel(1);
    setScore(0);
    setAnswerResults([]);
    setElapsedTime(0);
    setFeedback("");
    setGameOver(false);
    setShowShare(false);
    setTimerActive(true);
    if (guessInputRef.current) guessInputRef.current.value = "";
  };

  // Clipboard sharing
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

  // Initial timer start
  useEffect(() => {
    if (athletes.length > 0 && !gameOver) {
      setTimerActive(true);
      setElapsedTime(0);
    }
  }, [athletes, gameOver]);

  return (
    <div className="cg-bg">
      <style>{`
        .cg-bg {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          font-family: 'Montserrat', sans-serif;
        }
        .cg-header {
          width: 100%;
          max-width: 430px;
          background: rgba(146, 64, 14, 0.93);
          color: #fde68a;
          text-align: center;
          padding: 0.9rem 0.2rem;
          border: 2px solid #facc15;
          border-radius: 16px;
          margin-bottom: 1.3rem;
          font-weight: bold;
          font-size: 1.18rem;
          box-shadow: 0 2px 12px #0003;
        }
        .cg-card {
          background: rgba(70, 38, 19, 0.93);
          padding: 1.5rem 1.2rem 2rem 1.2rem;
          border-radius: 16px;
          box-shadow: 0 6px 32px rgba(0,0,0,0.18);
          border: 2px solid #facc15;
          position: relative;
          width: 100%;
          max-width: 430px;
        }
        .cg-navbar {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
          justify-content: center;
          margin-bottom: 1.2rem;
        }
        .cg-navbar a {
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
        .cg-navbar a:hover {
          background: #b45309;
          transform: scale(1.05);
        }
        .cg-title {
          color: #fde68a;
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 1rem;
        }
        .cg-level {
          color: #fde68a;
          font-size: 1.08rem;
        }
        .cg-input {
          width: 100%;
          padding: 1rem;
          background: rgba(146, 64, 14, 0.93);
          color: #fff;
          border: 2px solid #facc15;
          border-radius: 10px;
          margin-bottom: 1rem;
          font-size: 1.08rem;
        }
        .cg-btn {
          width: 100%;
          max-width: 200px;
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
        .cg-btn.green {
          background: #22c55e;
          border-color: #16a34a;
        }
        .cg-btn.green:hover {
          background: #16a34a;
        }
        .cg-btn.red {
          background: #ef4444;
          border-color: #b91c1c;
        }
        .cg-btn.red:hover {
          background: #b91c1c;
        }
        .cg-btn:hover {
          background: #b45309;
          transform: scale(1.03);
        }
        .cg-feedback {
          text-align: center;
          margin-top: 1rem;
          font-size: 1.18rem;
          font-weight: bold;
          color: #fde68a;
          min-height: 1.3rem;
        }
        .cg-score-row {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 1.1rem;
          margin-top: 1.2rem;
        }
        .cg-timer-box {
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
        .cg-modal-bg {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .cg-modal-content {
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
        .cg-modal-content h2 {
          color: #fde68a;
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 1.1rem;
          text-align: center;
        }
        .cg-table {
          width: 100%;
          color: #fde68a;
          border-collapse: collapse;
          font-size: 1rem;
        }
        .cg-table th,
        .cg-table td {
          border: 1.5px solid #facc15;
          padding: 0.6rem 0.3rem;
          text-align: center;
        }
        .cg-table thead {
          background: #b45309;
        }
        .cg-table-row:hover {
          background: #d97706;
        }
        .cg-close-btn {
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
        .cg-close-btn:hover {
          background: #b45309;
          transform: scale(1.03);
        }
        @media (max-width: 600px) {
          .cg-header,
          .cg-card,
          .cg-modal-content {
            max-width: 97vw;
            padding-left: 0.15rem;
            padding-right: 0.15rem;
          }
        }
      `}</style>
      <div className="cg-header">
        New Games Daily at Midnight Eastern
      </div>
      <div className="cg-card" id="gameContainer">
        <div className="cg-navbar">
          <Link href="/" className="">Home</Link>
          <Link href="/news" className="">News</Link>
          <Link href="/game" className="">Players</Link>
          <Link href="/trivia-game" className="">Trivia</Link>
        </div>
        <h1 className="cg-title">College Guess</h1>
        <p className="cg-level">Level: <span>{currentLevel}</span>/{maxLevels}</p>
        {!gameOver && athlete && (
          <>
            <p className="cg-level" style={{ marginBottom: "1.3rem" }}>
              Guess the college for <span style={{ fontWeight: 700 }}>{athlete.name}</span>
            </p>
            <input
              ref={guessInputRef}
              type="text"
              placeholder="Enter college name..."
              className="cg-input"
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmitGuess();
              }}
              disabled={gameOver}
            />
            <button
              className={`cg-btn${answerResults.length === currentLevel ? " hidden" : ""}`}
              onClick={handleSubmitGuess}
              disabled={gameOver}
            >
              Submit Answer
            </button>
            <button
              className={`cg-btn green${answerResults.length !== currentLevel ? " hidden" : ""}`}
              onClick={handleNextLevel}
            >
              {currentLevel < maxLevels ? "Next Level" : "Finish"}
            </button>
          </>
        )}
        <Link
          href="/"
          className={`cg-btn red${gameOver ? "" : " hidden"}`}
        >
          Back to Home
        </Link>
        <button
          className={`cg-btn red${gameOver ? "" : " hidden"}`}
          onClick={() => setShowStats(true)}
        >
          View Stats
        </button>
        <div className="cg-feedback">{feedback}</div>
        <div className="cg-score-row">
          <div className="cg-timer-box">{formatTime(elapsedTime)}</div>
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
        <div className="cg-modal-bg">
          <div className="cg-modal-content">
            <h2>Your College Guess Stats</h2>
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
              <table className="cg-table">
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
                    <tr className="cg-table-row" key={idx}>
                      <td>{idx + 1}</td>
                      <td>{entry.score}/25</td>
                      <td>{formatTime(entry.time)}</td>
                      <td>{new Date(entry.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              className="cg-close-btn"
              onClick={() => setShowStats(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollegeGuess;
