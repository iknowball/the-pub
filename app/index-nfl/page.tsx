"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function WelcomePub() {
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    document.body.style.backgroundImage =
      "url('https://awolvision.com/cdn/shop/articles/sports_bar_awolvision.jpg?v=1713302733&width=1500')";
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundAttachment = "fixed";
    document.body.style.backgroundColor = "#2f2e22";
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
    <div className="welcome-container">
      <style>
        {`
        .welcome-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding-bottom: 4rem;
        }
        .welcome-panel {
          width: 100%;
          max-width: 460px;
          background: rgba(178, 118, 44, 0.95);
          border: 2px solid #FFD700;
          border-radius: 20px;
          padding: 2.5rem 2rem 2rem 2rem;
          box-shadow: 0 10px 40px rgba(31, 38, 135, 0.28);
          position: relative;
          text-align: center;
          margin-top: 1rem;
        }
        .welcome-panel h1 {
          color: #ffe599;
          font-size: 2.8rem;
          font-weight: 900;
          margin-bottom: 0.5rem;
          text-shadow: 1px 2px 4px #0005;
        }
        .welcome-panel p {
          color: #fff8dc;
          font-size: 1.2rem;
          margin-bottom: 2rem;
          font-weight: 500;
          text-shadow: 1px 2px 4px #0003;
        }
        .welcome-action-btn {
          position: absolute;
          top: -1.7rem;
          right: 0;
          background: #ffecb3;
          color: #6b3d1b;
          font-weight: bold;
          font-size: 1.1rem;
          padding: 0.7rem 1.4rem;
          border-radius: 12px;
          border: 2px solid #f7d774;
          box-shadow: 0 2px 12px #0002;
          cursor: pointer;
          transition: background 0.18s, color 0.18s, transform 0.13s;
        }
        .welcome-action-btn:hover {
          background: #ffe066;
          color: #b2762c;
          transform: scale(1.04);
        }
        .welcome-link {
          display: block;
          width: 100%;
          background: #ec9c32;
          color: #fff;
          font-weight: bold;
          padding: 2rem 0.7rem 1.2rem 0.7rem;
          border-radius: 15px;
          margin-top: 1.3rem;
          font-size: 2rem;
          text-decoration: none;
          border: 2px solid #f7d774;
          box-shadow: 0 2px 12px #0002;
          transition: background 0.18s, color 0.18s, transform 0.12s;
          text-align: center;
        }
        .welcome-link:hover {
          background: #fbbf24;
          color: #272403;
          transform: scale(1.03);
        }
        .welcome-link .desc {
          display: block;
          margin-top: 0.8rem;
          font-size: 1.1rem;
          color: #fff;
          font-weight: 400;
        }
        /* Modal Styles */
        .modal-bg {
          position: fixed;
          inset: 0;
          background: rgba(10, 10, 15, 0.63);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }
        .modal-content {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 6px 32px rgba(76,52,23,0.22);
          padding: 2.2rem 1.7rem 2.2rem 1.7rem;
          width: 100%;
          max-width: 340px;
          position: relative;
          text-align: center;
        }
        .modal-close {
          position: absolute;
          top: 0.9rem;
          right: 1.2rem;
          background: none;
          border: none;
          color: #b2762c;
          font-size: 2.1rem;
          font-weight: bold;
          cursor: pointer;
          transition: color 0.15s;
        }
        .modal-close:hover {
          color: #b91c1c;
        }
        .modal-title {
          font-size: 1.5rem;
          font-weight: bold;
          color: #b2762c;
          margin-bottom: 1.2rem;
        }
        @media (max-width: 600px) {
          .welcome-panel { padding: 1.2rem 0.5rem 1.2rem 0.5rem; }
          .modal-content { padding: 1rem 0.3rem 1rem 0.3rem; }
        }
      `}
      </style>
      <div className="welcome-panel">
        <button className="welcome-action-btn" onClick={() => setModalOpen(true)}>
          Sign Up/Login
        </button>
        <h1>Welcome to the Pub</h1>
        <p>Your ultimate sports bar and media experience. Grab a seat.</p>
        <Link href="/index-nfl" className="welcome-link">
          Games
          <span className="desc">Pub Games test your trivia, player, and college knowledge.</span>
        </Link>
        <Link href="/news" className="welcome-link">
          Newsstand
          <span className="desc">Pick up The Pub Times for the most ridiculous takes in sports.</span>
        </Link>
        <Link href="/index-bar" className="welcome-link">
          Bulletin
          <span className="desc">TALK YOUR SHIT!</span>
        </Link>
      </div>

      {modalOpen && (
        <div className="modal-bg" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="modal-content">
            <button className="modal-close" onClick={() => setModalOpen(false)}>&times;</button>
            <div className="modal-title">Sign Up / Login</div>
            {/* Add your login/signup forms here if needed */}
            <p>Login and registration coming soon.</p>
          </div>
        </div>
      )}
    </div>
  );
}
