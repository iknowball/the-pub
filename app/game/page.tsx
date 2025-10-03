"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc
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
      if (guessInputRef.current) guessInputRef.current.value = "";
    } else {
      setGameOver(true);
      setFeedback(`Game Over! You scored ${score} out of ${maxLevels}.`);
    }
  };

  const handleRestart = () => {
    setCurrentLevel(1);
    setScore(0);
    setFeedback("");
    setGameOver(false);
    setGuessed(false);
    if (guessInputRef.current) guessInputRef.current.value = "";
  };

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
          /* Make image taller */
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
          width: 50%;
          min-width: 140px;
          max-width: 100%;
          background: #ad6e1b;
          border: 2.5px solid #ffc233;
          color: #ffe066;
          border-radius: 14px;
          font-size: 1.2rem;
          padding: 1rem 1.2rem;
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
          width: 50%;
          min-width: 140px;
          max-width: 100%;
          font-size: 1.2rem;
          font-weight: bold;
          padding: 1rem 0;
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
          /* Make the image taller on mobile */
          .gdp-img-wrap { max-width: 98vw; height: 65vw; min-height: 220px;}
          .gdp-input, .gdp-btn, .gdp-btn-green { width: 90vw; min-width: 80px; }
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
              <button className="gdp-btn" onClick={handleGuess} disabled={guessed}>
                Submit Guess
              </button>
            )}
            {guessed && (
              <button className="gdp-btn-green" style={{marginTop: "0.3rem"}} onClick={handleNext}>
                {currentLevel < maxLevels ? "Next Player" : "Finish"}
              </button>
            )}
          </>
        )}
        {gameOver && (
          <button className="gdp-btn" onClick={handleRestart}>
            Play Again
          </button>
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
