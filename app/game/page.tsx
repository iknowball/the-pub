"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged, signInAnonymously, User } from "firebase/auth";
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

const maxLevels = 5;

function getTodayEasternMidnight() {
  const now = new Date();
  const nyString = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  const nyDate = new Date(nyString);
  nyDate.setHours(0, 0, 0, 0);
  return nyDate.toISOString().slice(0, 10);
}
function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
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

// Record score to gameScores and update average in userAverages
async function recordGameScore(user: User | null, score: number, time: number) {
  try {
    const userId = getCurrentUserId(user);
    await addDoc(collection(db, "gameScores"), {
      userId,
      score,
      time,
      playedAt: new Date().toISOString(),
    });
    // Update user average
    const q = query(collection(db, "gameScores"), where("userId", "==", userId));
    const snap = await getDocs(q);
    let total = 0, count = 0;
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
  } catch (err) {
    // Optionally handle error
  }
}

function getInitials(name: string) {
  return (
    "Initials: " +
    name
      .split(" ")
      .filter((w) => w.length > 0)
      .map((w) => w[0].toUpperCase())
      .join(".") +
    "."
  );
}

// Helper to get current page URL for sharing
function getShareUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin + window.location.pathname;
  }
  return "https://thepub-sigma.web.app/game";
}

const GuessDailyPlayer: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [guessed, setGuessed] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const guessInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState(false);

  // Hint logic
  const [showHint, setShowHint] = useState(false);

  // Pub bar theme
  useEffect(() => {
    document.body.style.backgroundImage =
      "url('https://awolvision.com/cdn/shop/articles/sports_bar_awolvision.jpg?v=1713302733&width=1500')";
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundAttachment = "fixed";
    document.body.style.backgroundColor = "#451a03";
    document.body.style.fontFamily = "'Montserrat', Arial, sans-serif";
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

  // Fetch daily players from Firestore
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

  // Get image (Firebase Storage or direct URL)
  const player = players[currentLevel - 1];
  useEffect(() => {
    let isMounted = true;
    setImgUrl(null);
    setImageError(false);
    if (!player?.image) return;
    if (player.image.startsWith("http")) {
      setImgUrl(player.image);
    } else {
      getDownloadURL(storageRef(storage, player.image))
        .then((url) => { if (isMounted) setImgUrl(url); })
        .catch(() => { if (isMounted) setImgUrl(null); setImageError(true); });
    }
    return () => { isMounted = false; };
  }, [player]);

  // Start timer on each level
  useEffect(() => {
    if (players.length > 0 && !gameOver) {
      setElapsedTime(0);
      setTimerActive(true);
    }
    setShowHint(false);
    return () => {
      setTimerActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentLevel, players.length, gameOver]);
  useEffect(() => {
    if (!timerActive) return;
    timerRef.current = setInterval(() => setElapsedTime(e => e + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive]);

  const handleGuess = () => {
    if (!player || guessed) return;
    const guess = guessInputRef.current?.value.trim().toLowerCase() || "";
    const correctName = player.name.toLowerCase();
    setGuessed(true);
    if (guess === correctName) {
      setScore((s) => s + 1);
      setFeedback("Correct! 🎉");
    } else {
      setFeedback(`Incorrect! It was ${player.name}.`);
    }
    setTimerActive(false);
  };

  const handleNext = () => {
    if (currentLevel < maxLevels) {
      setCurrentLevel(lvl => lvl + 1);
      setFeedback("");
      setGuessed(false);
      setShowHint(false);
      if (guessInputRef.current) guessInputRef.current.value = "";
    } else {
      setGameOver(true);
      setFeedback(`Game Over! You scored ${score} out of ${maxLevels}.`);
      recordGameScore(user, score, elapsedTime);
    }
  };

  const handleRestart = () => {
    setCurrentLevel(1);
    setScore(0);
    setFeedback("");
    setGameOver(false);
    setGuessed(false);
    setShowHint(false);
    if (guessInputRef.current) guessInputRef.current.value = "";
  };

  // SMS link for sharing score
  const smsText = `I scored ${score} out of ${maxLevels} in Guess the Player! Try today's game: ${getShareUrl()}`;
  const smsLink = `sms:?body=${encodeURIComponent(smsText)}`;

  return (
    <div className="gdp-bg">
      <style>{`
        .gdp-bg {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Montserrat', Arial, sans-serif;
        }
        .gdp-card {
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
        .gdp-navbar {
          width: 100%;
          display: flex;
          gap: 1.1rem;
          justify-content: flex-start;
          margin-bottom: 1.2rem;
        }
        .gdp-home-btn {
          background: #ea9800;
          color: #fff;
          font-weight: bold;
          font-size: 1.15rem;
          border: 2px solid #ffc233;
          border-radius: 14px;
          padding: 0.6rem 1.8rem;
          text-align: center;
          text-decoration: none;
          transition: background 0.13s, color 0.13s, transform 0.12s;
          box-shadow: 0 2px 10px #0002;
          min-width: 0;
        }
        .gdp-home-btn:hover {
          background: #e0a92b;
          color: #fffbe7;
          transform: scale(1.02);
        }
        .gdp-title {
          color: #ffe066;
          font-size: 2.3rem;
          font-weight: 900;
          text-align: center;
          margin-bottom: 0.5rem;
          letter-spacing: 0.02em;
        }
        .gdp-level {
          color: #ffe066;
          font-size: 1.1rem;
          font-weight: 700;
          text-align: center;
          margin-bottom: 1.3rem;
        }
        .gdp-img-wrap {
          background: #442200;
          border: 3px solid #ffc233;
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 1.5rem;
          width: 100%;
          max-width: 340px;
          height: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .gdp-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .gdp-input {
          width: 48%;
          min-width: 90px;
          max-width: 190px;
          background: #ad6e1b;
          border: 2.5px solid #ffc233;
          color: #ffe066;
          border-radius: 14px;
          font-size: 1.04rem;
          padding: 0.72rem 0.9rem;
          margin-bottom: 1.1rem;
          font-weight: 500;
          display: block;
          margin-left: auto;
          margin-right: auto;
        }
        .gdp-input::placeholder {
          color: #ffe066cc;
          opacity: 1;
        }
        .gdp-btn,
        .gdp-btn-green {
          width: 48%;
          min-width: 90px;
          max-width: 190px;
          font-size: 1.04rem;
          font-weight: bold;
          padding: 0.72rem 0;
          border-radius: 14px;
          border: 2px solid #ffc233;
          box-shadow: 0 2px 12px #0002;
          cursor: pointer;
          margin-bottom: 0.8rem;
          margin-top: 0.2rem;
          transition: background 0.16s, transform 0.13s;
          display: block;
          margin-left: auto;
          margin-right: auto;
        }
        .gdp-btn {
          background: #ea9800;
          color: #fff;
        }
        .gdp-btn:hover {
          background: #e0a92b;
          color: #fffbe7;
          transform: scale(1.04);
        }
        .gdp-btn-green {
          background: #22c55e;
          color: #fff;
          border-color: #a3e635;
        }
        .gdp-btn-green:hover {
          background: #16a34a;
        }
        .gdp-share-btn {
          width: 48%;
          min-width: 90px;
          max-width: 190px;
          margin: 0.3rem auto 0 auto;
          font-size: 1.04rem;
          font-weight: bold;
          padding: 0.72rem 0;
          border-radius: 14px;
          border: 2px solid #ffc233;
          box-shadow: 0 2px 12px #0002;
          cursor: pointer;
          background: #0ea5e9;
          color: #fff;
          text-align: center;
          text-decoration: none;
          display: block;
          transition: background 0.13s, color 0.13s, transform 0.12s;
        }
        .gdp-share-btn:hover {
          background: #2563eb;
          color: #fffbe7;
          transform: scale(1.04);
        }
        .gdp-feedback {
          text-align: center;
          margin-top: 1rem;
          font-size: 1.18rem;
          font-weight: bold;
          color: #fde68a;
          min-height: 1.3rem;
        }
        .gdp-score-timer-row {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 1.1rem;
          margin-top: 1.2rem;
        }
        .gdp-timer {
          background: rgba(146, 64, 14, 0.93);
          color: #fde68a;
          border: 2px solid #facc15;
          border-radius: 8px;
          padding: 0.5rem 1rem;
          font-weight: bold;
        }
        @media (max-width: 600px) {
          .gdp-card { max-width: 97vw; padding-left: 0.15rem; padding-right: 0.15rem; }
          .gdp-img-wrap { max-width: 98vw; height: 65vw; min-height: 220px;}
          .gdp-input, .gdp-btn, .gdp-btn-green, .gdp-share-btn { width: 70vw; min-width: 70px; max-width: 160px; font-size: 0.98rem; padding: 0.55rem 0.6rem; }
        }
      `}</style>
      <div className="gdp-card">
        <div className="gdp-navbar">
          <Link href="/" className="gdp-home-btn">Home</Link>
        </div>
        <div className="gdp-title">Guess the Player</div>
        <div className="gdp-level">Level: {currentLevel}/{maxLevels}</div>
        <div className="gdp-img-wrap">
          {imgUrl && !imageError && (
            <img
              className="gdp-img"
              src={imgUrl}
              alt="Player"
              onError={() => setImageError(true)}
              style={{ display: imageError ? "none" : "block" }}
            />
          )}
        </div>
        {!gameOver && player && (
          <>
            <input
              ref={guessInputRef}
              type="text"
              placeholder="Enter the player's name..."
              className="gdp-input"
              autoComplete="off"
              disabled={guessed}
              onKeyDown={e => {
                if (e.key === "Enter") handleGuess();
              }}
            />
            {!guessed && (
              <>
                <button className="gdp-btn" onClick={handleGuess} disabled={guessed}>
                  Submit Guess
                </button>
                {!showHint ? (
                  <button
                    className="gdp-btn"
                    style={{ marginTop: "0.3rem" }}
                    onClick={() => setShowHint(true)}
                  >
                    Show Hint
                  </button>
                ) : (
                  <div
                    style={{
                      marginTop: "0.3rem",
                      width: "48%",
                      minWidth: "90px",
                      maxWidth: "190px",
                      marginLeft: "auto",
                      marginRight: "auto",
                      background: "#ad6e1b",
                      color: "#ffe066",
                      borderRadius: "14px",
                      border: "2px solid #ffc233",
                      padding: "0.72rem 0",
                      textAlign: "center",
                      fontWeight: "bold",
                      fontSize: "1.04rem"
                    }}
                  >
                    {getInitials(player.name)}
                  </div>
                )}
              </>
            )}
            {guessed && (
              <button className="gdp-btn-green" style={{marginTop: "0.3rem"}} onClick={handleNext}>
                {currentLevel < maxLevels ? "Next Player" : "Finish"}
              </button>
            )}
          </>
        )}
        {gameOver && (
          <>
            <button className="gdp-btn" onClick={handleRestart}>
              Play Again
            </button>
            <a className="gdp-share-btn" href={smsLink} target="_blank" rel="noopener noreferrer">
              Share via SMS
            </a>
          </>
        )}
        {imageError && (
          <div className="gdp-feedback" style={{ color: "#ffb4b4" }}>
            Image failed to load. Keep guessing!
          </div>
        )}
        <div className="gdp-feedback">{feedback}</div>
        <div className="gdp-score-timer-row">
          <div className="gdp-timer">{formatTime(elapsedTime)}</div>
          <div style={{ color: "#fde68a", fontWeight: "bold" }}>
            Score: <span>{score}</span>/{maxLevels}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuessDailyPlayer;
