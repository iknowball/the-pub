"use client";
import React, { useEffect } from "react";
import Link from "next/link";

const GamesRoom: React.FC = () => {
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

  return (
    <div className="gamesroom-container">
      <style>
        {`
        .gamesroom-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding-bottom: 4rem;
        }
        .gamesroom-panel {
          width: 100%;
          max-width: 430px;
          text-align: center;
          background: rgba(146, 64, 14, 0.93); /* amber-800/90 */
          border: 2px solid #facc15; /* yellow-600 */
          border-radius: 16px;
          padding: 1.5rem 1.2rem 2rem 1.2rem;
          box-shadow: 0 6px 32px rgba(0,0,0,0.18);
          position: relative;
        }
        .gamesroom-home-btn {
          margin-bottom: 2rem;
          display: flex;
          justify-content: flex-start;
        }
        .gamesroom-home-btn a {
          background: #d97706;
          color: #fff;
          font-weight: bold;
          padding: 0.7rem 1.2rem;
          border-radius: 10px;
          border: 2px solid #facc15;
          text-decoration: none;
          box-shadow: 0 2px 10px #0002;
          transition: background 0.17s, transform 0.12s;
          text-align: center;
          display: inline-block;
        }
        .gamesroom-home-btn a:hover {
          background: #b45309;
          transform: scale(1.05);
        }
        .gamesroom-panel h1 {
          color: #fde68a;
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 1rem;
        }
        .gamesroom-panel p {
          color: #fde68a;
          font-size: 1.08rem;
          margin-bottom: 1rem;
        }
        .gamesroom-links {
          margin-top: 1.2rem;
        }
        .gamesroom-link {
          display: block;
          width: 100%;
          max-width: 340px;
          margin-left: auto;
          margin-right: auto;
          background: #d97706;
          color: #fff;
          font-weight: bold;
          padding: 1.05rem 0.2rem 0.8rem 0.2rem;
          border-radius: 12px;
          margin-top: 0.7rem;
          text-decoration: none;
          border: 2px solid #facc15;
          box-shadow: 0 2px 10px #0002;
          font-size: 1.2rem;
          transition: background 0.16s, transform 0.12s;
          text-align: center;
        }
        .gamesroom-link:hover {
          background: #b45309;
          transform: scale(1.03);
        }
        @media (max-width: 600px) {
          .gamesroom-panel { padding: 1rem 0.3rem 2rem 0.3rem; }
          .gamesroom-link {
            max-width: 100%;
            padding: 0.8rem 0.2rem;
            font-size: 1rem;
          }
        }
        `}
      </style>
      <div className="gamesroom-panel">
        {/* Home button in its own block */}
        <div className="gamesroom-home-btn">
          <Link href="/" className="">
            Home
          </Link>
        </div>
        <div>
          <h1>Do You Know Ball?</h1>
          <p>
            Welcome to The Pub’s game room. Who is an elite Ball Knower? Find out now.
          </p>
          <p>
            Select a game below to get started!
          </p>
        </div>
        <div className="gamesroom-links">
          <Link
            href="/game"
            className="gamesroom-link"
          >
            Name that Player
          </Link>
          <Link
            href="/college-game"
            className="gamesroom-link"
          >
            Name their College
          </Link>
          <Link
            href="/trivia-game"
            className="gamesroom-link"
          >
            Trivia
          </Link>
        </div>
      </div>
    </div>
  );
};

export default GamesRoom;
