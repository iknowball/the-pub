import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
// Firebase Modular SDK Imports
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
  serverTimestamp,
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

const getTodayEasternMidnight = () => {
  const now = new Date();
  const nyString = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  const nyDate = new Date(nyString);
  nyDate.setHours(0, 0, 0, 0);
  return nyDate.toISOString().slice(0, 10);
};

const getLevenshteinDistance = (a: string, b: string) => {
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
};

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

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
}

const emojiShareMessage = (results: boolean[]) => {
  const emojis = results.map((r) => (r ? "✅" : "❌"));
  while (emojis.length < 5) emojis.push("❓");
  return emojis.join("");
};

const generateShareText = (results: boolean[]) => {
  const homepage = typeof window !== "undefined" ? window.location.origin + "/game" : "";
  return `${emojiShareMessage(results)} <a href="${homepage}" class="share-link-ball" target="_blank">Do you know ball?</a>`;
};

const generateClipboardText = (results: boolean[]) => {
  const homepage = typeof window !== "undefined" ? window.location.origin + "/game" : "";
  return `${emojiShareMessage(results)} Do you know ball? ${homepage}`;
};

const generateSmsLink = (results: boolean[]) => {
  const homepage = typeof window !== "undefined" ? window.location.origin + "/game" : "";
  const msg = `${emojiShareMessage(results)} Do you know ball? ${homepage}`;
  return "sms:?body=" + encodeURIComponent(msg);
};

const GuessThePlayer: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
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
  const [imageError, setImageError] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const guessInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.body.style.backgroundImage =
      "url('https://awolvision.com/cdn/shop/articles/sports_bar_awolvision.jpg?v=1713302733&width=1500')";
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundAttachment = "fixed";
    document.body.style.backgroundColor = "#451a03";
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) signInAnonymously(auth);
    });
  }, []);

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

  useEffect(() => {
    if (!timerActive) return;
    timerRef.current = setInterval(() => {
      setElapsedTime((t) => t + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive]);

  useEffect(() => {
    const history =
      JSON.parse(localStorage.getItem("scoreHistory") || "[]") as HistoryEntry[];
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

  const player = players[currentLevel - 1];
  const maxLevels = 5;

  const handleSubmitGuess = () => {
    if (!player) return;
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
  };

  const handleNextLevel = () => {
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

  useEffect(() => {
    if (players.length > 0 && !gameOver) {
      setTimerActive(true);
      setElapsedTime(0);
    }
  }, [players, gameOver]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen font-montserrat">
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .font-montserrat { font-family: 'Montserrat', sans-serif; }
        .share-buttons-row {
          display: flex; flex-direction: row; gap: 14px; justify-content: center; align-items: center;
        }
        .clipboard-btn, .sms-btn {
          background: #f9e38f; color: #533e1f; font-weight: bold; border-radius: 8px; border: 2px solid #cfb467;
          padding: 7px 18px; cursor: pointer; box-shadow: 0 2px 8px #cfb46733; margin-top: 8px; margin-bottom: 8px;
          transition: background 0.2s, color 0.2s; display: inline-block;
        }
        .clipboard-btn:hover, .sms-btn:hover { background: #fffbe7; color: #b88340; }
        .share-preview {
          font-size: 1.15rem; color: #f9e38f; font-weight: bold; margin-top: 10px; margin-bottom: 6px; text-align: center; word-break: break-word;
        }
        .share-link-ball {
          color: #ffd700; text-decoration: underline; font-size: 1.15rem; font-weight: bold; margin-left: 6px; cursor: pointer;
        }
        .share-link-ball:hover { color: #ffbb33; text-decoration: underline; }
        .share-buttons-row {
          display: flex;
          flex-direction: row;
          gap: 14px;
          justify-content: center;
          align-items: center;
        }
      `}</style>
      <header className="w-full max-w-md bg-amber-800/90 text-yellow-300 text-center py-2 border-2 border-yellow-600 rounded-lg mb-4 shadow-lg transform hover:shadow-xl transition duration-200">
        <p className="text-lg font-bold">New Games Daily at Midnight Eastern</p>
      </header>
      <div className="bg-amber-900/90 p-6 rounded-xl shadow-2xl w-full max-w-md border-2 border-yellow-600 relative" id="gameContainer">
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          <Link href="/" className="flex-1 bg-amber-600 text-white font-bold p-2 rounded-lg hover:bg-amber-700 transform hover:scale-105 transition duration-200 border-2 border-yellow-600 shadow-md text-center">Home</Link>
          <Link href="/news" className="flex-1 bg-amber-600 text-white font-bold p-2 rounded-lg hover:bg-amber-700 transform hover:scale-105 transition duration-200 border-2 border-yellow-600 shadow-md text-center">News</Link>
          <Link href="/trivia-game" className="flex-1 bg-amber-600 text-white font-bold p-2 rounded-lg hover:bg-amber-700 transform hover:scale-105 transition duration-200 border-2 border-yellow-600 shadow-md text-center">Trivia</Link>
          <Link href="/college-game" className="flex-1 bg-amber-600 text-white font-bold p-2 rounded-lg hover:bg-amber-700 transform hover:scale-105 transition duration-200 border-2 border-yellow-600 shadow-md text-center">College</Link>
        </div>
        <h1 className="text-3xl font-bold text-center text-yellow-300 mb-4">Who is This?</h1>
        <p className="text-center text-yellow-300 mb-2 text-lg">
          Level: <span>{currentLevel}</span>/5
        </p>
        <div className="relative w-full h-72 mb-4 rounded-lg overflow-hidden border-2 border-yellow-600">
          {player && (
            <img
              src={player.image}
              alt="Athlete"
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
              onLoad={() => setImageError(false)}
              style={{ display: imageError ? "none" : "block" }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        </div>
        {imageError && (
          <p className="text-center mb-4 text-red-500">Image failed to load. Keep guessing!</p>
        )}
        {!gameOver && player && (
          <>
            <input
              ref={guessInputRef}
              type="text"
              placeholder="Who's this athlete?"
              className="w-full p-3 bg-amber-800/90 text-white border-2 border-yellow-600 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-yellow-600"
              autoComplete="off"
              onKeyPress={(e) => {
                if (e.key === "Enter") handleSubmitGuess();
              }}
              disabled={gameOver}
            />
            <button
              className={`w-full bg-amber-600 text-white p-3 rounded-lg hover:bg-amber-700 transform hover:scale-105 transition duration-200 font-bold mb-2 border-2 border-yellow-600 shadow-md ${answerResults.length === currentLevel ? "hidden" : ""}`}
              onClick={handleSubmitGuess}
              disabled={gameOver}
            >
              Submit Answer
            </button>
            <button
              className={`w-full bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 transform hover:scale-105 transition duration-200 font-bold ${answerResults.length !== currentLevel ? "hidden" : ""}`}
              onClick={handleNextLevel}
            >
              {currentLevel < maxLevels ? "Next Level" : "Finish"}
            </button>
          </>
        )}
        <Link
          href="/"
          className={`w-full bg-red-600 text-white p-3 rounded-lg hover:bg-red-700 transform hover:scale-105 transition duration-200 font-bold ${gameOver ? "" : "hidden"} border-2 border-yellow-600 shadow-md text-center`}
        >
          Back to Home
        </Link>
        <button
          className={`w-full bg-red-600 text-white p-3 rounded-lg hover:bg-red-700 transform hover:scale-105 transition duration-200 font-bold mt-2 border-2 border-yellow-600 shadow-md ${gameOver ? "" : "hidden"}`}
          onClick={() => setShowStats(true)}
        >
          View Stats
        </button>
        <p className="text-center mt-4 text-xl font-bold animate-fade-in">{feedback}</p>
        <div className="flex flex-row items-center justify-center gap-4 mt-4">
          <div className="bg-amber-800/90 text-yellow-300 border-2 border-yellow-600 rounded px-2 py-1 text-sm font-bold">
            {formatTime(elapsedTime)}
          </div>
          <p className="text-yellow-300 text-center mb-0">
            Score: <span>{score}</span>/25
          </p>
        </div>
        <div className={`text-center mt-4 ${showShare ? "" : "hidden"} text-yellow-300`} id="shareLink">
          <div className="share-buttons-row">
            <button className="clipboard-btn" onClick={handleClipboard}>
              {clipboardMsg}
            </button>
            <a className="sms-btn" href={generateSmsLink(answerResults)} target="_blank">
              Send as SMS
            </a>
          </div>
          <div className="share-preview" dangerouslySetInnerHTML={{ __html: generateShareText(answerResults) }}></div>
        </div>
      </div>
      {showStats && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-amber-800/90 p-6 rounded-xl w-full max-w-md border-2 border-yellow-600 shadow-lg">
            <h2 className="text-2xl font-bold text-center text-yellow-300 mb-4">Your Pub Quiz Stats</h2>
            <p className="text-center text-yellow-300 mb-4 text-lg">
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
            <div className="overflow-x-auto">
              <table className="w-full text-yellow-300 border-collapse">
                <thead>
                  <tr className="bg-amber-700/90">
                    <th className="p-2 border border-yellow-600">Attempt</th>
                    <th className="p-2 border border-yellow-600">Score</th>
                    <th className="p-2 border border-yellow-600">Time</th>
                    <th className="p-2 border border-yellow-600">Date</th>
                  </tr>
                </thead>
                <tbody className="text-center">
                  {statsHistory.map((entry, idx) => (
                    <tr className="hover:bg-amber-600" key={idx}>
                      <td className="p-2 border border-yellow-600">{idx + 1}</td>
                      <td className="p-2 border border-yellow-600">{entry.score}/25</td>
                      <td className="p-2 border border-yellow-600">{formatTime(entry.time)}</td>
                      <td className="p-2 border border-yellow-600">
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              className="w-full bg-amber-600 text-white p-3 rounded-lg hover:bg-amber-700 font-bold mt-4 border-2 border-yellow-600 shadow-md"
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

export default GuessThePlayer;
