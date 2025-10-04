"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  addDoc,
  getDoc,
  setDoc,
  collection,
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

function normalizeWord(word: string) {
  return word
    .replace(/st\.$/i, "state")
    .replace(/st$/i, "state")
    .replace(/[\W_]+/g, "")
    .toLowerCase();
}

function wordsMatch(guess: string, answer: string) {
  const norm = (str: string) =>
    str
      .split(/\s+/)
      .filter(Boolean)
      .map(normalizeWord)
      .filter(Boolean);

  const guessWords = norm(guess);
  const answerWords = norm(answer);

  for (const gw of guessWords) {
    if (answerWords.includes(gw)) return true;
  }
  for (const aw of answerWords) {
    if (guessWords.includes(aw)) return true;
  }
  for (const gw of guessWords) {
    for (const aw of answerWords) {
      if (getLevenshteinDistance(gw, aw) <= 1) return true;
    }
  }
  return false;
}

// --- Record score in collegeGameScores and update collegeAverages ---
async function recordCollegeGameScore(user: User | null, score: number, time: number) {
  try {
    const userId = getCurrentUserId(user);
    await addDoc(collection(db, "collegeGameScores"), {
      userId,
      score,
      time,
      playedAt: new Date().toISOString(),
    });
    // Update average
    const q = query(collection(db, "collegeGameScores"), where("userId", "==", userId));
    const snap = await getDocs(q);
    let total = 0, count = 0;
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
  } catch (err) {
    // Optionally handle error
  }
}

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

  // Local Styling
  useEffect(() => {
    document.body.style.background = "#111";
    document.body.style.fontFamily = "'Montserrat', sans-serif";
    return () => {
      document.body.style.background = "";
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
    const guess = guessInputRef.current?.value.trim() || "";
    const correctCollege = athlete.college;
    setFeedback("");
    if (wordsMatch(guess, correctCollege)) {
      setScore((s) => s + 5);
      setFeedback("Nailed it! +5 points! 🏀");
      setAnswerResults((arr) => [...arr, true]);
      setTimerActive(false);
    } else {
      const distance = getLevenshteinDistance(guess.toLowerCase(), correctCollege.toLowerCase());
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
      // --- record score and update average in Firestore ---
      recordCollegeGameScore(user, score, elapsedTime);
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
          background: #111;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
        }
        .cg-header {
          margin-top: 1.7rem;
          color: #ffe146;
          font-size: 1.23rem;
          letter-spacing: 1px;
          font-weight: bold;
          text-align: center;
        }
        .cg-card {
          background: #23272c;
          box-shadow: 0 8px 40px 8px #000d2f44;
          border-radius: 2rem;
          width: 98%;
          max-width: 440px;
          padding: 2.2rem 1.5rem 2.3rem 1.5rem;
          margin: 2.5rem auto 2.2rem auto;
          border: 3px solid #e1b40c;
          position: relative;
        }
        .cg-navbar {
          display: flex;
          gap: 1.15rem;
          margin-bottom: 1rem;
          justify-content: center;
        }
        .cg-navbar a {
          color: #ffe146;
          font-weight: 600;
          text-decoration: none;
          letter-spacing: 0.5px;
          font-size: 1.1rem;
        }
        .cg-title {
          font-size: 2.2rem;
          font-weight: bold;
          color: #ffe146;
          letter-spacing: 1px;
          text-align: center;
          margin: 0.5rem 0 1.2rem 0;
        }
        .cg-level {
          font-size: 1.15rem;
          color: #ffe146a8;
          margin-bottom: 1.2rem;
          text-align: center;
        }
        .cg-player-name-wrap {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 1.3rem;
        }
        .cg-player-name {
          background: #ffe146;
          color: #23272c;
          font-size: 1.32rem;
          font-weight: bold;
          border-radius: 0.9rem;
          padding: 0.65rem 1.4rem;
          box-shadow: 0 2px 10px #ffe14633;
          letter-spacing: 1px;
        }
        .cg-input {
          width: 100%;
          font-size: 1.1rem;
          padding: 0.7rem 1.1rem;
          border-radius: 0.7rem;
          border: 2px solid #ffe146;
          background: #191c22;
          color: #ffe146;
          margin-bottom: 0.8rem;
        }
        .cg-btn {
          width: 100%;
          padding: 0.73rem 0;
          border-radius: 0.9rem;
          border: none;
          font-size: 1.1rem;
          font-weight: bold;
          color: #23272c;
          background: #ffe146;
          box-shadow: 0 2px 8px #ffe14633;
          margin-bottom: 0.7rem;
          cursor: pointer;
          transition: background 0.18s, color 0.16s, transform 0.14s;
        }
        .cg-btn.green {
          background: #7ff759;
        }
        .cg-btn.red {
          background: #ff6868;
          color: #fff;
        }
        .cg-btn.hidden {
          display: none;
        }
        .cg-feedback {
          min-height: 2.0rem;
          color: #ffe146;
          font-size: 1.13rem;
          margin: 0.9rem 0 0.3rem 0;
          text-align: center;
        }
        .cg-score-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 1rem;
          margin-bottom: 0.8rem;
        }
        .cg-timer-box {
          background: #191c22;
          color: #ffe146;
          border-radius: 0.8rem;
          padding: 0.48rem 1.1rem;
          font-weight: bold;
          font-size: 1.1rem;
          box-shadow: 0 1px 6px #ffe14622;
        }
        .score {
          color: #ffe146;
          font-weight: bold;
          font-size: 1.1rem;
        }
        .share-buttons-row {
          display: flex;
          gap: 0.9rem;
          justify-content: center;
          margin-top: 1.3rem;
        }
        .clipboard-btn, .sms-btn {
          background: #ffe146;
          color: #23272c;
          font-weight: bold;
          border-radius: 0.9rem;
          border: none;
          padding: 0.55rem 1.3rem;
          font-size: 1rem;
          cursor: pointer;
          box-shadow: 0 2px 8px #ffe14622;
        }
        .clipboard-btn:hover, .sms-btn:hover {
          background: #fffbe3;
        }
        .share-preview {
          margin-top: 1.2rem;
          color: #ffe146;
          text-align: center;
          font-size: 1.2rem;
          word-break: break-word;
        }
        .cg-modal-bg {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(20, 20, 20, 0.82);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cg-modal-content {
          background: #23272c;
          border-radius: 1.3rem;
          padding: 2.1rem 1.5rem;
          box-shadow: 0 8px 36px 0 #ffe14633;
          min-width: 320px;
          max-width: 90vw;
          position: relative;
          color: #ffe146;
        }
        .cg-close-btn {
          background: #ff6868;
          color: #fff;
          border: none;
          border-radius: 1rem;
          font-weight: bold;
          font-size: 1rem;
          padding: 0.4rem 1.1rem;
          cursor: pointer;
          box-shadow: 0 1px 4px #ffe14633;
          margin: 1.2rem auto 0 auto;
          display: block;
        }
        .cg-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 1rem;
          margin: 0 auto;
          color: #ffe146;
        }
        .cg-table th, .cg-table td {
          padding: 0.6rem 0.5rem;
          border-bottom: 1px solid #ffe1461a;
          text-align: center;
        }
        .cg-table th {
          background: #191c22;
        }
        .cg-table-row:nth-child(even) {
          background: #23272c;
        }
        .cg-table-row:nth-child(odd) {
          background: #191c22;
        }
        @media (max-width: 600px) {
          .cg-card { padding: 1rem 0.3rem; }
          .cg-modal-content { padding: 1rem 0.7rem; }
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
        <div className="cg-player-name-wrap">
          {athlete && <div className="cg-player-name">{athlete.name}</div>}
        </div>
        {!gameOver && athlete && (
          <>
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
