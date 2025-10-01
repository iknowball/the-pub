"use client";
import React, { useEffect } from "react";
import Link from "next/link";

const PubBar: React.FC = () => {
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
    <div className="pubbar-bg">
      <style>{`
        .pubbar-bg {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: 'Montserrat', Arial, sans-serif;
          padding-bottom: 4rem;
        }
        .pubbar-card {
          width: 100%;
          max-width: 430px;
          background: rgba(146, 64, 14, 0.93);
          border: 2px solid #facc15;
          border-radius: 18px;
          padding: 2.2rem 1.2rem 2.4rem 1.2rem;
          box-shadow: 0 6px 32px rgba(0,0,0,0.18);
          position: relative;
          text-align: center;
        }
        .pubbar-home-row {
          display: flex;
          align-items: center;
          margin-bottom: 1.1rem;
        }
        .pubbar-home-btn {
          background: #d97706;
          color: #fff;
          font-weight: bold;
          padding: 0.7rem 1.2rem;
          border-radius: 10px;
          border: 2px solid #facc15;
          text-decoration: none;
          box-shadow: 0 2px 10px #0002;
          text-align: center;
          display: inline-block;
          transition: background 0.17s, transform 0.12s;
        }
        .pubbar-home-btn:hover {
          background: #b45309;
          transform: scale(1.05);
        }
        .pubbar-title {
          color: #fde68a;
          font-size: 2.2rem;
          font-weight: bold;
          margin-bottom: 1rem;
        }
        .pubbar-desc {
          color: #fde68a;
          font-size: 1.13rem;
          margin-bottom: 1.2rem;
        }
        .pubbar-links {
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
          margin-top: 1.3rem;
        }
        .pubbar-link-btn {
          width: 100%;
          background: #d97706;
          color: #fff;
          font-weight: bold;
          font-size: 1.2rem;
          padding: 1.05rem 0.2rem 0.8rem 0.2rem;
          border-radius: 12px;
          text-decoration: none;
          border: 2px solid #facc15;
          box-shadow: 0 2px 10px #0002;
          text-align: center;
          transition: background 0.16s, transform 0.12s;
        }
        .pubbar-link-btn:hover {
          background: #b45309;
          transform: scale(1.03);
        }
        @media (max-width: 600px) {
          .pubbar-card { padding: 1.2rem 0.4rem 1.8rem 0.4rem; }
          .pubbar-link-btn { font-size: 1.06rem; }
        }
      `}</style>
      <div className="pubbar-card">
        <div className="pubbar-home-row">
          <Link href="/" className="pubbar-home-btn">
            Home
          </Link>
        </div>
        <div>
          <h1 className="pubbar-title">Grab a Seat!</h1>
          <p className="pubbar-desc">
            Welcome to The Pub Bar. Pull up a stool, join a booth for game discussion, or debate at a table.
          </p>
          <p className="pubbar-desc">Jump in!</p>
        </div>
        <div className="pubbar-links">
          <Link href="/table" className="pubbar-link-btn">
            Tables
          </Link>
          <Link href="/booth" className="pubbar-link-btn">
            Booths
          </Link>
          <Link href="/bulletin" className="pubbar-link-btn">
            Bar
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PubBar;
