"use client";
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

const emojiShareMessage = (results: boolean[]): string => {
  const emojis: string[] = results.map((r) => (r ? "✅" : "❌"));
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
  // ...[state and hooks remain unchanged]...

  // All state, logic, and hooks from your previous code remain unchanged.
  // The only change below is the styling.

  // ...full useState, useEffect, and logic from your code above...

  // (For brevity, the logic is unchanged from your previous code block.)

  // Insert your entire logic code here, then change only the rendered JSX below:

  return (
    <div className="gtp-container">
      <style>{`
        .gtp-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: 'Montserrat', Arial, sans-serif;
          background: none;
        }
        .gtp-header {
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
        .gtp-panel {
          width: 100%;
          max-width: 430px;
          background: rgba(70, 38, 19, 0.93);
          padding: 1.5rem 1.2rem 2rem 1.2rem;
          border-radius: 16px;
          box-shadow: 0 6px 32px rgba(0,0,0,0.18);
          border: 2px solid #facc15;
          position: relative;
        }
        .gtp-panel h1 {
          color: #fde68a;
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 1rem;
        }
        .gtp-panel p, .gtp-panel .score {
          color: #fde68a;
          font-size: 1.08rem;
        }
        .gtp-navbar {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
          justify-content: center;
          margin-bottom: 1.2rem;
        }
        .gtp-navbar a {
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
        .gtp-navbar a:hover {
          background: #b45309;
          transform: scale(1.05);
        }
        .gtp-img-card {
          position: relative;
          width: 100%;
          max-width: 320px;
          height: 280px;
          margin: 0 auto 1.2rem auto;
          border-radius: 14px;
          overflow: hidden;
          border: 2px solid #facc15;
          background: #222;
        }
        .gtp-img-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .gtp-guess-input {
          width: 100%;
          padding: 1rem;
          background: rgba(146, 64, 14, 0.93);
          color: #fff;
          border: 2px solid #facc15;
          border-radius: 10px;
          margin-bottom: 1rem;
          font-size: 1.08rem;
        }
        .gtp-btn {
          width: 100%;
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
        }
        .gtp-btn:hover {
          background: #b45309;
          transform: scale(1.03);
        }
        .gtp-btn.green {
          background: #22c55e;
          border-color: #16a34a;
        }
        .gtp-btn.green:hover {
          background: #16a34a;
        }
        .gtp-btn.red {
          background: #ef4444;
          border-color: #b91c1c;
        }
        .gtp-btn.red:hover {
          background: #b91c1c;
        }
        .gtp-feedback {
          text-align: center;
          margin-top: 1rem;
          font-size: 1.18rem;
          font-weight: bold;
          color: #fde68a;
          min-height: 1.3rem;
        }
        .gtp-score-row {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 1.1rem;
          margin-top: 1.2rem;
        }
        .gtp-timer-box {
          background: rgba(146, 64, 14, 0.93);
          color: #fde68a;
          border: 2px solid #facc15;
          border-radius: 8px;
          padding: 0.45rem 0.95rem;
          font-weight: bold;
          font-size: 1rem;
        }
        .gtp-share-row {
          display: flex;
          flex-direction: row;
          gap: 12px;
          justify-content: center;
          align-items: center;
          margin-top: 0.7rem;
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
        .gtp-stats-modal-bg {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .gtp-stats-modal {
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
        .gtp-stats-modal h2 {
          color: #fde68a;
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 1.1rem;
          text-align: center;
        }
        .gtp-stats-table {
          width: 100%;
          color: #fde68a;
          border-collapse: collapse;
          font-size: 1rem;
        }
        .gtp-stats-table th,
        .gtp-stats-table td {
          border: 1.5px solid #facc15;
          padding: 0.6rem 0.3rem;
          text-align: center;
        }
        .gtp-stats-table thead {
          background: #b45309;
        }
        .gtp-stats-table tr:hover {
          background: #d97706;
        }
        .gtp-stats-close-btn {
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
        .gtp-stats-close-btn:hover {
          background: #b45309;
          transform: scale(1.03);
        }
        @media (max-width: 600px) {
          .gtp-header,
          .gtp-panel,
          .gtp-stats-modal {
            max-width: 97vw;
            padding-left: 0.15rem;
            padding-right: 0.15rem;
          }
          .gtp-img-card {
            max-width: 93vw;
            height: 37vw;
            min-height: 180px;
          }
        }
      `}</style>
      <div className="gtp-header">
        New Games Daily at Midnight Eastern
      </div>
      <div className="gtp-panel" id="gameContainer">
        <div className="gtp-navbar">
          <Link href="/" className="">Home</Link>
          <Link href="/news" className="">News</Link>
          <Link href="/trivia-game" className="">Trivia</Link>
          <Link href="/college-game" className="">College</Link>
        </div>
        <h1>Who is This?</h1>
        <p>
          Level: <span>{currentLevel}</span>/5
        </p>
        <div className="gtp-img-card">
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
          <p className="gtp-feedback" style={{ color: "#ffb4b4" }}>Image failed to load. Keep guessing!</p>
        )}
        {!gameOver && player && (
          <>
            <input
              ref={guessInputRef}
              type="text"
              placeholder="Who's this athlete?"
              className="gtp-guess-input"
              autoComplete="off"
              onKeyPress={(e) => {
                if (e.key === "Enter") handleSubmitGuess();
              }}
              disabled={gameOver}
            />
            <button
              className={`gtp-btn${answerResults.length === currentLevel ? " hidden" : ""}`}
              onClick={handleSubmitGuess}
              disabled={gameOver}
            >
              Submit Answer
            </button>
            <button
              className={`gtp-btn green${answerResults.length !== currentLevel ? " hidden" : ""}`}
              onClick={handleNextLevel}
            >
              {currentLevel < 5 ? "Next Level" : "Finish"}
            </button>
          </>
        )}
        <Link
          href="/"
          className={`gtp-btn red${gameOver ? "" : " hidden"}`}
        >
          Back to Home
        </Link>
        <button
          className={`gtp-btn red${gameOver ? "" : " hidden"}`}
          onClick={() => setShowStats(true)}
        >
          View Stats
        </button>
        <div className="gtp-feedback">{feedback}</div>
        <div className="gtp-score-row">
          <div className="gtp-timer-box">{formatTime(elapsedTime)}</div>
          <div className="score">Score: <span>{score}</span>/25</div>
        </div>
        <div className={`gtp-share-row${showShare ? "" : " hidden"}`} id="shareLink">
          <button className="clipboard-btn" onClick={handleClipboard}>
            {clipboardMsg}
          </button>
          <a className="sms-btn" href={generateSmsLink(answerResults)} target="_blank">
            Send as SMS
          </a>
        </div>
        <div className="share-preview" style={{ display: showShare ? 'block' : 'none' }} dangerouslySetInnerHTML={{ __html: generateShareText(answerResults) }}></div>
      </div>
      {showStats && (
        <div className="gtp-stats-modal-bg">
          <div className="gtp-stats-modal">
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
              <table className="gtp-stats-table">
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
            <button
              className="gtp-stats-close-btn"
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
