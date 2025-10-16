"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  initializeApp
} from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  User,
} from "firebase/auth";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBtsOBlh52YZagsLXp9_dcCq4qhkHBSWnU",
  authDomain: "thepub-sigma.firebaseapp.com",
  projectId: "thepub-sigma",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

type TriviaQuestion = {
  question: string;
  answer: string;
  imageUrl?: string;
};
type HistoryEntry = {
  score: number;
  time: number;
  timestamp: string;
};

function getEasternMidnightDateKey() {
  const now = new Date();
  const nyString = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  const nyDate = new Date(nyString);
  nyDate.setHours(0, 0, 0, 0);
  return nyDate.toISOString().slice(0, 10);
}

const MAX_QUESTIONS = 4;

async function getDailyQuestions() {
  const dateKey = getEasternMidnightDateKey();
  const docRef = doc(db, "dailyQuestions", dateKey);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists() && Array.isArray(docSnap.data().questions)) {
    return docSnap.data().questions.slice(0, MAX_QUESTIONS) as TriviaQuestion[];
  } else {
    return [];
  }
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

async function recordRideBusGameScore(score: number, time: number, user: User | null) {
  try {
    const userId = getCurrentUserId(user);
    await addDoc(collection(db, "rideBusGameScores"), {
      userId: userId,
      score: score,
      time: time,
      playedAt: new Date().toISOString(),
    });
    await updateRideBusAverageScore(userId);
  } catch (err) {}
}
async function updateRideBusAverageScore(userId: string) {
  try {
    const q = query(collection(db, "rideBusGameScores"), where("userId", "==", userId));
    const snap = await getDocs(q);
    let total = 0, count = 0;
    snap.forEach((doc) => {
      total += doc.data().score;
      count += 1;
    });
    const avg = count === 0 ? 0 : total / count;
    await setDoc(doc(db, "rideBusAverages", userId), {
      userId: userId,
      averageScore: avg,
      lastUpdated: new Date().toISOString(),
      gamesPlayed: count,
    });
  } catch (err) {}
}
async function fetchRideBusAverageScore(userId: string) {
  try {
    const docRef = doc(db, "rideBusAverages", userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().averageScore;
    }
    return null;
  } catch (err) {
    return null;
  }
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
function emojiShareMessage(results: boolean[]) {
  const emojis: string[] = results.map(r => r ? "✅" : "❌");
  while (emojis.length < MAX_QUESTIONS) emojis.push("❓");
  return emojis.join("");
}
function generateShareText(results: boolean[], score?: number) {
  const homepage = typeof window !== "undefined" ? window.location.origin + "/ride-the-bus" : "";
  const emojiMsg = emojiShareMessage(results);
  const scoreNum = typeof score === "number" ? score : results.filter(r => r).length * 5;
  return `${emojiMsg} <a href="${homepage}" class="share-link-ball" target="_blank">I scored ${scoreNum} out of 20 in Ride the Bus! Try today's game: ${homepage}</a>`;
}
function generateClipboardText(results: boolean[], score?: number) {
  const homepage = typeof window !== "undefined" ? window.location.origin + "/ride-the-bus" : "";
  const emojiMsg = emojiShareMessage(results);
  const scoreNum = typeof score === "number" ? score : results.filter(r => r).length * 5;
  return `${emojiMsg} I scored ${scoreNum} out of 20 in Ride the Bus! Try today's game: ${homepage}`;
}
function generateSmsLink(results: boolean[], score?: number) {
  const homepage = typeof window !== "undefined" ? window.location.origin + "/ride-the-bus" : "";
  const scoreNum = typeof score === "number" ? score : results.filter(r => r).length * 5;
  const msg = `I scored ${scoreNum} out of 20 in Ride the Bus! Try today's game: ${homepage}`;
  return "sms:?body=" + encodeURIComponent(msg);
}

const RideTheBus: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
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

  // Auth state
  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) signInAnonymously(auth);
    });
  }, []);

  // Load questions for today
  useEffect(() => {
    const loadQuestions = async () => {
      const qs = await getDailyQuestions();
      setQuestions(qs);
    };
    loadQuestions();
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
      JSON.parse(localStorage.getItem("rideBusGameHistory") || "[]") as HistoryEntry[];
    setStatsHistory(history);
  }, [showStats, gameOver]);

  // Cloud average
  useEffect(() => {
    if (!user) return;
    const fetchCloudAvg = async () => {
      const userId = getCurrentUserId(user);
      const avg = await fetchRideBusAverageScore(userId);
      setCloudAvg(avg);
    };
    fetchCloudAvg();
  }, [user, showStats]);

  // Save game history locally
  const saveScoreHistory = (score: number, time: number) => {
    const history =
      JSON.parse(localStorage.getItem("rideBusGameHistory") || "[]") as HistoryEntry[];
    history.push({
      score,
      time,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem("rideBusGameHistory", JSON.stringify(history));
    setStatsHistory(history);
  };

  // Clipboard share
  const handleClipboard = () => {
    const textToCopy = generateClipboardText(answerResults, score);
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
    if (questions.length > 0 && !gameOver) {
      setTimerActive(true);
      setElapsedTime(0);
    }
  }, [questions, gameOver]);

  // ---- ANSWER LOGIC ----
  const handleSubmitGuess = () => {
    if (!questions.length || !questions[currentLevel - 1]) return;
    const guessRaw = guessInputRef.current?.value.trim() || "";
    const guess = guessRaw.toLowerCase();
    const correctAnswer = questions[currentLevel - 1].answer.toLowerCase();
    setFeedback("");

    // For image question (last question), require full answer, otherwise partial word match
    if (currentLevel === MAX_QUESTIONS && questions[currentLevel - 1].imageUrl) {
      if (guess === correctAnswer) {
        setScore((s) => s + 5);
        setFeedback("Correct! +5 points! 🎉");
        setAnswerResults((arr) => [...arr, true]);
        setTimerActive(false);
      } else {
        const distance = getLevenshteinDistance(guess, correctAnswer);
        if (distance <= 2 && guess.length > 0) {
          setFeedback("Very close! Try again!");
          if (guessInputRef.current) guessInputRef.current.value = "";
          return;
        } else {
          setFeedback(`Incorrect. The answer was ${questions[currentLevel - 1].answer}.`);
          setAnswerResults((arr) => [...arr, false]);
          setTimerActive(false);
        }
      }
    } else {
      // Partial match logic
      const correctWords = correctAnswer.split(/\s+/).filter(Boolean);
      const guessWords = guess.split(/\s+/).filter(Boolean);

      const wordMatch =
        correctWords.some((cw) => guessWords.includes(cw)) ||
        guessWords.some((gw) => correctWords.includes(gw));

      if (wordMatch) {
        setScore((s) => s + 5);
        setFeedback("Correct! +5 points! 🎉");
        setAnswerResults((arr) => [...arr, true]);
        setTimerActive(false);
      } else {
        const distance = getLevenshteinDistance(guess, correctAnswer);
        if (distance <= 2 && guess.length > 0) {
          setFeedback("So close! Try again!");
          if (guessInputRef.current) guessInputRef.current.value = "";
          return;
        } else {
          setFeedback(`Incorrect. The answer was ${questions[currentLevel - 1].answer}.`);
          setAnswerResults((arr) => [...arr, false]);
          setTimerActive(false);
        }
      }
    }
  };

  const handleNextLevel = () => {
    if (currentLevel < MAX_QUESTIONS) {
      setCurrentLevel((lvl) => lvl + 1);
      setFeedback("");
      setTimerActive(true);
      if (guessInputRef.current) guessInputRef.current.value = "";
    } else {
      setGameOver(true);
      setShowShare(true);
      setTimerActive(false);
      saveScoreHistory(score, elapsedTime);
      recordRideBusGameScore(score, elapsedTime, user);
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
    if (guessInputRef.current) guessInputRef.current.value = "";
  };

  return (
    <div className="trivia-bg">
      <style>{`
        .trivia-bg {
          min-height: 100vh;
          background: url('https://awolvision.com/cdn/shop/articles/sports_bar_awolvision.jpg?v=1713302733&width=1500') center/cover fixed no-repeat;
          font-family: 'Montserrat', Arial, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-bottom: 3rem;
        }
        .trivia-card {
          background: rgba(146, 84, 14, 0.93);
          border: 3px solid #ffc233;
          border-radius: 22px;
          box-shadow: 0 8px 32px #0003;
          padding: 2.2rem 1.2rem 2.4rem 1.2rem;
          max-width: 430px;
          width: 95vw;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .trivia-navbar {
          width: 100%;
          display: flex;
          gap: 0.7rem;
          justify-content: center;
          align-items: center;
          margin-bottom: 1.2rem;
          text-align: center;
        }
        .trivia-nav-btn {
          background: #ea9800;
          color: #fff;
          font-weight: bold;
          font-size: 0.93rem;
          border: 2px solid #ffc233;
          border-radius: 14px;
          padding: 0.5rem 0.7rem;
          text-align: center;
          text-decoration: none;
          transition: background 0.13s, color 0.13s, transform 0.12s;
          box-shadow: 0 2px 10px #0002;
          min-width: 0;
          white-space: normal;
          overflow-wrap: break-word;
          width: 100%;
          max-width: 80px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .trivia-nav-btn:hover {
          background: #e0a92b;
          color: #fffbe7;
          transform: scale(1.02);
        }
        .trivia-title {
          color: #ffe066;
          font-size: 2.1rem;
          font-weight: 900;
          text-align: center;
          margin-bottom: 0.6rem;
          letter-spacing: 0.02em;
        }
        .trivia-level {
          color: #ffe066;
          font-size: 1.08rem;
          font-weight: 700;
          text-align: center;
          margin-bottom: 1.2rem;
        }
        .trivia-question-text {
          color: #fde68a;
          font-size: 1.12rem;
          margin-bottom: 1.5rem;
          text-align: center;
        }
        .trivia-input {
          width: 50%;
          min-width: 120px;
          background: #ad6e1b;
          border: 2.5px solid #ffc233;
          color: #ffe066;
          border-radius: 14px;
          font-size: 1.18rem;
          padding: 1rem 1.2rem;
          margin-bottom: 1.1rem;
          font-weight: 500;
          box-sizing: border-box;
          margin-left: auto;
          margin-right: auto;
          display: block;
        }
        .trivia-input::placeholder {
          color: #ffe066cc;
          opacity: 1;
        }
        .trivia-btn {
          width: 100%;
          background: #ea9800;
          color: #fff;
          font-size: 1.18rem;
          font-weight: bold;
          padding: 1.1rem 0;
          border-radius: 14px;
          border: 2px solid #ffc233;
          box-shadow: 0 2px 12px #0002;
          cursor: pointer;
          margin-bottom: 0.7rem;
          margin-top: 0.2rem;
          transition: background 0.16s, transform 0.13s;
        }
        .trivia-btn.submit {
          width: 50%;
          min-width: 120px;
          margin-left: auto;
          margin-right: auto;
          display: block;
        }
        .trivia-btn:hover {
          background: #e0a92b;
          color: #fffbe7;
          transform: scale(1.04);
        }
        .trivia-btn.green {
          background: #22c55e;
          border-color: #16a34a;
        }
        .trivia-btn.green:hover {
          background: #16a34a;
        }
        .trivia-btn.red {
          background: #ef4444;
          border-color: #b91c1c;
        }
        .trivia-btn.red:hover {
          background: #b91c1c;
        }
        .trivia-btn.hidden {
          display: none;
        }
        .trivia-feedback {
          text-align: center;
          margin-top: 1rem;
          font-size: 1.18rem;
          font-weight: bold;
          color: #fde68a;
          min-height: 1.3rem;
        }
        .trivia-score-row {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 1.1rem;
          margin-top: 1.2rem;
        }
        .trivia-timer-box {
          background: rgba(146, 64, 14, 0.93);
          color: #fde68a;
          border: 2px solid #facc15;
          border-radius: 8px;
          padding: 0.5rem 1rem;
          font-weight: bold;
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
        .trivia-modal-bg {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .trivia-modal-content {
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
        .trivia-modal-content h2 {
          color: #fde68a;
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 1.1rem;
          text-align: center;
        }
        .trivia-table {
          width: 100%;
          color: #fde68a;
          border-collapse: collapse;
          font-size: 1rem;
        }
        .trivia-table th,
        .trivia-table td {
          border: 1.5px solid #facc15;
          padding: 0.6rem 0.3rem;
          text-align: center;
        }
        .trivia-table thead {
          background: #b45309;
        }
        .trivia-table-row:hover {
          background: #d97706;
        }
        .trivia-close-btn {
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
        .trivia-close-btn:hover {
          background: #b45309;
          transform: scale(1.03);
        }
        @media (max-width: 600px) {
          .trivia-card, .trivia-modal-content { max-width: 97vw; padding-left: 0.15rem; padding-right: 0.15rem; }
        }
      `}</style>
      <div className="trivia-card">
        <div className="trivia-navbar">
          <Link href="/" className="trivia-nav-btn">Home</Link>
          <Link href="/news" className="trivia-nav-btn">News</Link>
          <Link href="/game" className="trivia-nav-btn">Players</Link>
          <Link href="/ride-the-bus" className="trivia-nav-btn">Ride the Bus</Link>
        </div>
        <div className="trivia-title">Ride the Bus</div>
        <div className="trivia-level">Question: {currentLevel}/{MAX_QUESTIONS}</div>
        <div className="trivia-question-text">
          {questions.length ? (
            currentLevel === MAX_QUESTIONS && questions[currentLevel - 1].imageUrl ? (
              <>
                <img
                  src={questions[currentLevel - 1].imageUrl}
                  alt="Guess Who"
                  style={{ maxWidth: "100%", borderRadius: 13, marginBottom: 13 }}
                />
                <br />
                <span>Who is this?</span>
              </>
            ) : (
              questions[currentLevel - 1]?.question
            )
          ) : "Loading..."}
        </div>
        {!gameOver && questions.length > 0 && (
          <>
            <input
              ref={guessInputRef}
              type="text"
              placeholder={currentLevel === MAX_QUESTIONS ? "Enter name..." : "Enter answer..."}
              className="trivia-input"
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmitGuess();
              }}
              disabled={gameOver}
            />
            <button
              className={`trivia-btn submit${answerResults.length === currentLevel ? " hidden" : ""}`}
              onClick={handleSubmitGuess}
              disabled={gameOver}
            >
              Submit Answer
            </button>
            <button
              className={`trivia-btn green${answerResults.length !== currentLevel ? " hidden" : ""}`}
              onClick={handleNextLevel}
            >
              {currentLevel < MAX_QUESTIONS ? "Next Question" : "Finish"}
            </button>
          </>
        )}
        {gameOver && (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", marginTop: "1.1rem" }}>
            <Link
              href="/"
              className="trivia-btn red"
              style={{ textAlign: "center", width: "100%", marginBottom: 8 }}
            >
              Back to Home
            </Link>
            <button
              className="trivia-btn red"
              style={{ textAlign: "center", width: "100%" }}
              onClick={() => setShowStats(true)}
            >
              View Stats
            </button>
          </div>
        )}
        <div className="trivia-feedback">{feedback}</div>
        <div className="trivia-score-row">
          <div className="trivia-timer-box">{formatTime(elapsedTime)}</div>
          <div className="score">Score: <span>{score}</span>/20</div>
        </div>
        <div className="share-buttons-row" style={{ marginTop: 16, display: showShare ? "flex" : "none" }}>
          <button className="clipboard-btn" onClick={handleClipboard}>
            {clipboardMsg}
          </button>
          <a className="sms-btn" href={generateSmsLink(answerResults, score)} target="_blank" rel="noopener noreferrer">
            Send as SMS
          </a>
        </div>
        <div
          className="share-preview"
          style={{ display: showShare ? "block" : "none" }}
          dangerouslySetInnerHTML={{ __html: generateShareText(answerResults, score) }}
        />
      </div>
      {showStats && (
        <div className="trivia-modal-bg">
          <div className="trivia-modal-content">
            <h2>Your Ride the Bus Stats</h2>
            <p style={{ textAlign: "center", marginBottom: "1.2rem", fontSize: "1.15rem" }}>
              {cloudAvg !== null
                ? `Average Score (cloud): ${cloudAvg.toFixed(1)}/20`
                : `Average Score (local): ${
                  statsHistory.length > 0
                    ? (
                        statsHistory.reduce((sum, e) => sum + e.score, 0) /
                        statsHistory.length
                      ).toFixed(1)
                    : "0"
                }/20`}
            </p>
            <div style={{ overflowX: "auto" }}>
              <table className="trivia-table">
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
                    <tr className="trivia-table-row" key={idx}>
                      <td>{idx + 1}</td>
                      <td>{entry.score}/20</td>
                      <td>{formatTime(entry.time)}</td>
                      <td>{new Date(entry.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              className="trivia-close-btn"
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

export default RideTheBus;
