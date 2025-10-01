"use client";
import React, { useEffect, useRef, useState } from "react";
import { db, auth } from "../firebase"; // Make sure your firebase config exports db and auth
import {
  collection,
  doc,
  getDoc,
  addDoc,
  setDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";

// Type for one player entry
type DailyPlayer = {
  name: string;
  image: string;
};

type GameScore = {
  userId: string;
  score: number;
  time: number;
  playedAt: string;
};

function getTodayEasternMidnight(): string {
  const now = new Date();
  const nyString = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  const nyDate = new Date(nyString);
  return nyDate.toISOString().slice(0, 10);
}

function getLevenshteinDistance(a: string, b: string): number {
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

function pad(num: number) {
  return num.toString().padStart(2, "0");
}
function formatTime(seconds: number) {
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
}

function getCurrentUserId() {
  const user = auth.currentUser;
  if (user) {
    return user.uid;
  }
  let anonId = typeof window !== "undefined" ? localStorage.getItem("anonUserId") : null;
  if (!anonId) {
    anonId = "anon-" + Math.random().toString(36).substring(2, 15);
    if (typeof window !== "undefined") localStorage.setItem("anonUserId", anonId);
  }
  return anonId;
}

async function recordGameScore(score: number, time: number) {
  const userId = getCurrentUserId();
  await addDoc(collection(db, "gameScores"), {
    userId,
    score,
    time,
    playedAt: new Date().toISOString(),
  });
  await updateUserAverageScore(userId);
}

async function updateUserAverageScore(userId: string) {
  const q = query(collection(db, "gameScores"), where("userId", "==", userId));
  const scoresSnap = await getDocs(q);
  let total = 0;
  let count = 0;
  scoresSnap.forEach((doc) => {
    total += doc.data().score;
    count += 1;
  });
  const avg = count === 0 ? 0 : total / count;
  await setDoc(doc(collection(db, "userAverages"), userId), {
    userId,
    averageScore: avg,
    lastUpdated: new Date().toISOString(),
    gamesPlayed: count,
  });
}

async function fetchUserAverageScore(userId: string) {
  const docRef = doc(collection(db, "userAverages"), userId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().averageScore;
  }
  return null;
}

function getScoreHistory() {
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem("scoreHistory") || "[]");
}
function saveScoreHistory(score: number, time: number) {
  if (typeof window === "undefined") return;
  const history = getScoreHistory();
  history.push({
    score,
    time,
    timestamp: new Date().toISOString(),
  });
  localStorage.setItem("scoreHistory", JSON.stringify(history));
}
function calculateAverageScore() {
  const history = getScoreHistory();
  if (history.length === 0) return 0;
  const total = history.reduce((sum: number, entry: any) => sum + entry.score, 0);
  return (total / history.length).toFixed(1);
}

function generateEmojiShareMessage(results: boolean[]) {
  const emojis = results.map((r) => (r ? "✅" : "❌"));
  while (emojis.length < 5) emojis.push("❓");
  return emojis.join("");
}
function generateShareText(results: boolean[]) {
  const homepage = typeof window !== "undefined" ? window.location.origin + "/game.html" : "";
  const emojiMsg = generateEmojiShareMessage(results);
  return `${emojiMsg} <a href="${homepage}" class="share-link-ball" target="_blank">Do you know ball?</a>`;
}
function generateClipboardText(results: boolean[]) {
  const homepage = typeof window !== "undefined" ? window.location.origin + "/game.html" : "";
  const emojiMsg = generateEmojiShareMessage(results);
  return `${emojiMsg} Do you know ball? ${homepage}`;
}
function generateSmsLink(results: boolean[]) {
  const homepage = typeof window !== "undefined" ? window.location.origin + "/game.html" : "";
  const emojiMsg = generateEmojiShareMessage(results);
  const msg = `${emojiMsg} Do you know ball? ${homepage}`;
  return "sms:?body=" + encodeURIComponent(msg);
}

export default function GuessThePlayer() {
  // Game state
  const [players, setPlayers] = useState<DailyPlayer[]>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [feedbackColor, setFeedbackColor] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [answerResults, setAnswerResults] = useState<boolean[]>([]);
  const [showNext, setShowNext] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showHome, setShowHome] = useState(false);
  const [showInput, setShowInput] = useState(true);
  const [showSubmit, setShowSubmit] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Timer
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Modal state
  const [modal, setModal] = useState(false);
  const [avgCloud, setAvgCloud] = useState<number | null>(null);

  // For stats table
  const [scoreHistory, setScoreHistory] = useState<any[]>([]);

  // Firebase Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) signInAnonymously(auth).catch(() => {});
    });
    return unsub;
  }, []);

  // Load players
  useEffect(() => {
    async function fetchDailyPlayers() {
      const dateKey = getTodayEasternMidnight();
      const docRef = doc(collection(db, "dailyPlayers"), dateKey);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && Array.isArray(docSnap.data().players)) {
        setPlayers(docSnap.data().players);
      }
    }
    fetchDailyPlayers();
  }, []);

  // Start timer when game starts
  useEffect(() => {
    if (players.length > 0 && currentLevel === 1) {
      setTimer(0);
      setTimerActive(true);
    }
  }, [players]);

  // Timer effect
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive]);

  // Load score history for modal
  useEffect(() => {
    setScoreHistory(getScoreHistory());
  }, [modal]);

  // Handlers
  function handleImageError() {
    setImageError(true);
  }
  function handleImageLoad() {
    setImageError(false);
  }
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value);
  }
  function handleSubmit() {
    if (!players[currentLevel - 1]) return;
    const guess = inputValue.trim().toLowerCase();
    const correctName = players[currentLevel - 1].name.toLowerCase();
    let result = false;
    setFeedback("");
    setFeedbackColor("");
    if (guess === correctName) {
      setScore((s) => s + 5);
      setFeedback("Nailed it! +5 points! 🏀");
      setFeedbackColor("green");
      setShowSubmit(false);
      setShowInput(false);
      setShowNext(true);
      result = true;
    } else {
      const distance = getLevenshteinDistance(guess, correctName);
      if (distance <= 2 && guess.length > 0) {
        setFeedback("So close! Try again, you're off by a letter or two!");
        setFeedbackColor("yellow");
        setInputValue("");
      } else {
        setFeedback(`Swing and a miss! It was ${players[currentLevel - 1].name}.`);
        setFeedbackColor("red");
        setShowSubmit(false);
        setShowInput(false);
        setShowNext(true);
      }
    }
    setAnswerResults((arr) => [...arr, result]);
  }
  async function handleNext() {
    if (currentLevel < players.length) {
      setCurrentLevel((lvl) => lvl + 1);
      setInputValue("");
      setFeedback("");
      setFeedbackColor("");
      setShowNext(false);
      setShowSubmit(true);
      setShowInput(true);
      setImageError(false);
    } else {
      setTimerActive(false);
      saveScoreHistory(score, timer);
      await recordGameScore(score, timer);
      setFeedback(`Game Over! Your Score: ${score}/25 🏆`);
      setFeedbackColor("yellow");
      setShowSubmit(false);
      setShowInput(false);
      setShowNext(false);
      setShowHome(true);
      setShowStats(true);
      setShowShare(true);
    }
  }
  function handleClipboardCopy() {
    const textToCopy = generateClipboardText(answerResults);
    navigator.clipboard.writeText(textToCopy);
  }
  function handleModalOpen() {
    setModal(true);
    const userId = getCurrentUserId();
    fetchUserAverageScore(userId).then((v) => setAvgCloud(v));
  }
  function handleModalClose() {
    setModal(false);
  }

  // Stats Table
  function StatsModal() {
    return (
      <div className="stats-modal" style={{ display: modal ? "flex" : "none" }}>
        <div className="stats-modal-content">
          <h2>Your Pub Quiz Stats</h2>
          <p>{avgCloud !== null ? `Average Score (cloud): ${avgCloud.toFixed(1)}/25` : `Average Score (local): ${calculateAverageScore()}/25`}</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Attempt</th>
                  <th>Score</th>
                  <th>Time</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {scoreHistory.map((entry, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{entry.score}/25</td>
                    <td>{formatTime(entry.time)}</td>
                    <td>{new Date(entry.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="modal-close-btn" onClick={handleModalClose}>Close</button>
        </div>
      </div>
    );
  }

  // Style
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

  // Main render
  return (
    <div className="guess-game-root">
      <style>{`
        body {
          background-image: url('https://awolvision.com/cdn/shop/articles/sports_bar_awolvision.jpg?v=1713302733&width=1500') !important;
          background-size: cover !important;
          background-position: center !important;
          background-attachment: fixed !important;
          background-color: #451a03 !important;
          font-family: 'Montserrat', sans-serif !important;
        }
        .guess-game-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .game-header {
          width: 100%;
          max-width: 420px;
          background: rgba(120, 53, 15, 0.9);
          color: #f9e38f;
          text-align: center;
          padding: 0.75em 0.5em;
          border: 2px solid #cfb467;
          border-radius: 0.7em;
          margin-bottom: 1em;
          font-weight: bold;
          box-shadow: 0 2px 8px #cfb46733;
        }
        .game-main {
          background: rgba(120, 53, 15, 0.92);
          padding: 2em 1em;
          border-radius: 1.2em;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 7px 32px #3b240633;
          border: 2px solid #cfb467;
          position: relative;
        }
        .nav-row {
          display: flex;
          gap: 0.7em;
          margin-bottom: 1em;
        }
        .nav-link {
          flex: 1;
          background: #cfb467;
          color: #533e1f;
          font-weight: bold;
          padding: 0.65em 0.5em;
          border-radius: 0.7em;
          text-align: center;
          text-decoration: none;
          border: 2px solid #f9e38f;
          transition: background 0.2s, color 0.2s, transform 0.2s;
          box-shadow: 0 2px 8px #cfb46733;
        }
        .nav-link:hover {
          background: #fffbe7;
          color: #b88340;
          transform: scale(1.05);
        }
        .game-title {
          font-size: 2.2rem;
          font-weight: bold;
          text-align: center;
          color: #f9e38f;
          margin-bottom: 0.7em;
        }
        .game-level {
          text-align: center;
          color: #f9e38f;
          font-size: 1.18rem;
          margin-bottom: 0.7em;
        }
        .player-img-wrap {
          position: relative;
          width: 100%;
          height: 270px;
          margin-bottom: 1em;
          border-radius: 1.2em;
          overflow: hidden;
          border: 2px solid #ffd700;
        }
        .player-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .img-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.47), transparent);
        }
        .image-error {
          color: #ef4444;
          text-align: center;
          margin-bottom: 1em;
        }
        .guess-input {
          width: 100%;
          padding: 0.95em;
          background: rgba(120, 53, 15, 0.9);
          color: #fff;
          border: 2px solid #ffd700;
          border-radius: 0.7em;
          margin-bottom: 0.9em;
          font-size: 1.13rem;
          font-family: inherit;
          outline: none;
        }
        .guess-input:focus {
          border-color: #cfb467;
          box-shadow: 0 0 0 3px #f9e38f55;
        }
        .game-btn, .game-btn-green, .game-btn-red {
          width: 100%;
          padding: 1em;
          border-radius: 0.7em;
          font-size: 1.1rem;
          font-weight: bold;
          border: 2px solid #ffd700;
          margin-bottom: 0.7em;
          cursor: pointer;
          transition: background 0.2s, color 0.2s, transform 0.2s;
          box-shadow: 0 2px 8px #cfb46733;
          background: #cfb467;
          color: #533e1f;
        }
        .game-btn:hover { background: #fffbe7; color: #b88340; transform: scale(1.03);}
        .game-btn-green { background: #22c55e; color: #fff; border-color: #a3e635;}
        .game-btn-green:hover { background: #16a34a;}
        .game-btn-red { background: #ef4444; color: #fff; border-color: #f87171;}
        .game-btn-red:hover { background: #b91c1c;}
        .feedback {
          text-align: center;
          margin-top: 1em;
          font-size: 1.2rem;
          font-weight: bold;
          color: #f9e38f;
          min-height: 2.2em;
          animation: fade-in 0.3s ease-out;
        }
        .feedback.green { color: #22c55e; }
        .feedback.red { color: #ef4444; }
        .feedback.yellow { color: #fde047; }
        .game-footer-row {
          display: flex;
          flex-direction: row;
          gap: 1.3em;
          justify-content: center;
          align-items: center;
          margin-top: 1.1em;
          margin-bottom: 1.1em;
        }
        .timer-box {
          background: rgba(120, 53, 15, 0.9);
          color: #f9e38f;
          border: 2px solid #ffd700;
          border-radius: 0.5em;
          padding: 0.3em 0.85em;
          font-size: 1rem;
          font-weight: bold;
        }
        .score-box {
          color: #f9e38f;
          font-size: 1.15rem;
          text-align: center;
        }
        .share-section {
          text-align: center;
          margin-top: 1.2em;
        }
        .share-buttons-row {
          display: flex;
          flex-direction: row;
          gap: 0.7em;
          justify-content: center;
          align-items: center;
          margin-bottom: 0.6em;
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
          margin-top: 0.3em;
          margin-bottom: 0.1em;
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
        .stats-modal {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.47);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
        }
        .stats-modal-content {
          background: rgba(120, 53, 15, 0.94);
          padding: 2em 1em;
          border-radius: 1.2em;
          width: 100%;
          max-width: 420px;
          border: 2px solid #ffd700;
          box-shadow: 0 6px 32px #2d160633;
          color: #f9e38f;
        }
        .stats-modal-content h2 {
          font-size: 1.85rem;
          font-weight: bold;
          text-align: center;
          margin-bottom: 0.7em;
        }
        .stats-modal-content p {
          text-align: center;
          font-size: 1.17rem;
          margin-bottom: 1em;
        }
        .stats-modal-content table {
          width: 100%;
          color: #f9e38f;
          border-collapse: collapse;
          margin-bottom: 0.8em;
        }
        .stats-modal-content th, .stats-modal-content td {
          border: 1px solid #ffd700;
          padding: 0.6em 0.3em;
          text-align: center;
        }
        .modal-close-btn {
          width: 100%;
          padding: 1em;
          border-radius: 0.7em;
          font-size: 1.1rem;
          font-weight: bold;
          border: 2px solid #ffd700;
          margin-top: 1em;
          cursor: pointer;
          background: #cfb467;
          color: #533e1f;
          transition: background 0.2s, color 0.2s;
        }
        .modal-close-btn:hover {
          background: #fffbe7;
          color: #b88340;
        }
        @media (max-width: 700px) {
          .game-header, .game-main, .stats-modal-content {
            max-width: 99vw;
            padding-left: 0.5rem; padding-right: 0.5rem;
          }
          .game-title { font-size: 1.35rem;}
        }
      `}</style>
      <header className="game-header">
        <p>New Games Daily at Midnight Eastern</p>
      </header>
      <div className="game-main">
        <div className="nav-row">
          <a href="/index.html" className="nav-link">Home</a>
          <a href="/news.html" className="nav-link">News</a>
          <a href="/trivia-game.html" className="nav-link">Trivia</a>
          <a href="/college-game.html" className="nav-link">College</a>
        </div>
        <h1 className="game-title">Who is This?</h1>
        <p className="game-level">
          Level: <span>{currentLevel}</span>/{players.length || 5}
        </p>
        <div className="player-img-wrap">
          {players[currentLevel - 1]?.image && (
            <img
              src={players[currentLevel - 1].image}
              alt="Athlete"
              className="player-img"
              onError={handleImageError}
              onLoad={handleImageLoad}
              style={{ display: imageError ? "none" : "block" }}
            />
          )}
          <div className="img-gradient"></div>
        </div>
        {imageError && (
          <p className="image-error">Image failed to load. Keep guessing!</p>
        )}
        {showInput && (
          <input
            type="text"
            className="guess-input"
            placeholder="Who's this athlete?"
            value={inputValue}
            onChange={handleInputChange}
            autoComplete="off"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        )}
        {showSubmit && (
          <button className="game-btn" onClick={handleSubmit}>
            Submit Answer
          </button>
        )}
        {showNext && (
          <button className="game-btn-green" onClick={handleNext}>
            Next Level
          </button>
        )}
        {showHome && (
          <a
            href="/index.html"
            className="game-btn-red"
            style={{ textAlign: "center" }}
          >
            Back to Home
          </a>
        )}
        {showStats && (
          <button className="game-btn-red" style={{ marginTop: 8 }} onClick={handleModalOpen}>
            View Stats
          </button>
        )}
        <p className={`feedback ${feedbackColor}`}>{feedback}</p>
        <div className="game-footer-row">
          <div className="timer-box">{formatTime(timer)}</div>
          <div className="score-box">
            Score: <span>{score}</span>/25
          </div>
        </div>
        {showShare && (
          <div className="share-section">
            <div className="share-buttons-row">
              <button className="clipboard-btn" onClick={handleClipboardCopy}>
                Copy to Clipboard
              </button>
              <a
                className="sms-btn"
                href={generateSmsLink(answerResults)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Send as SMS
              </a>
            </div>
            <div
              className="share-preview"
              dangerouslySetInnerHTML={{ __html: generateShareText(answerResults) }}
            ></div>
          </div>
        )}
      </div>
      {modal && <StatsModal />}
    </div>
  );
}
