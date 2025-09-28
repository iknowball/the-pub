"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";

// --- Types & Utilities ---
type NewsArticle = {
  id: string;
  title?: string;
  content?: string;
  author?: string;
  createdAt?: Timestamp | { seconds: number } | number;
  date?: string;
  image?: string;
  source?: string;
};

function formatDate(ts: NewsArticle["createdAt"]): string {
  try {
    if (ts && typeof ts === "object" && "seconds" in ts) {
      return new Date(ts.seconds * 1000).toLocaleDateString();
    } else if (typeof ts === "number") {
      return new Date(ts).toLocaleDateString();
    }
  } catch {}
  return "";
}

// --- Component ---
const PubNewsstand: React.FC = () => {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<{ [id: string]: boolean }>({});

  useEffect(() => {
    document.body.style.background = "radial-gradient(circle, #fffbe9 60%, #ece5d8 100%)";
    document.body.style.fontFamily = "'Merriweather', 'Times New Roman', Times, serif";
    return () => {
      document.body.style.background = "";
      document.body.style.fontFamily = "";
    };
  }, []);

  useEffect(() => {
    const loadNewsArticles = async () => {
      setLoading(true);
      const articles: NewsArticle[] = [];
      const q = query(collection(db, "news"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      snapshot.forEach((doc) => {
        articles.push({ id: doc.id, ...doc.data() });
      });
      setNews(articles);
      setLoading(false);
    };
    loadNewsArticles();
  }, []);

  // Today's date
  const todayDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col items-center min-h-screen py-8 bg-transparent">
      <style>{`
        body {
          background: radial-gradient(circle, #fffbe9 60%, #ece5d8 100%) !important;
          font-family: 'Merriweather', 'Times New Roman', Times, serif !important;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        .newspaper-border {
          border: 1.5px solid #b8b8b8;
          box-shadow: 0 4px 16px rgba(50,50,45,0.05);
        }
        .masthead {
          border-bottom: 8px double #444;
          letter-spacing: 0.05em;
        }
        .pub-dropcap::first-letter {
          font-size: 2.3em;
          font-weight: bold;
          float: left;
          line-height: 1;
          margin-right: 0.1em;
          color: #ad974f;
          font-family: Georgia, serif;
        }
        .title-shadow {
          text-shadow: 1px 2px 0 #e2d9c2;
        }
        .pub-link {
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .pub-link:hover {
          color: #ad974f !important;
          text-decoration: none;
        }
      `}</style>

      {/* Newspaper Masthead */}
      <header className="w-full max-w-3xl bg-white px-8 pt-10 pb-5 masthead newspaper-border rounded-t-3xl shadow title-shadow">
        <h1 className="text-6xl font-extrabold text-center text-gray-900 font-serif tracking-wide leading-tight title-shadow">
          The Pub Times
        </h1>
        <p className="text-center text-lg text-gray-700 mt-3 font-serif">
          <span>{todayDate}</span>
        </p>
      </header>

      {/* Classic nav bar */}
      <nav className="w-full max-w-3xl bg-white px-8 py-3 border-b-2 border-t newspaper-border font-serif text-lg mb-2 flex justify-between">
        <Link href="/" className="text-gray-900 pub-link font-bold">Home</Link>
        <Link href="/bar" className="text-gray-900 pub-link font-bold">Hit the Bar</Link>
        <Link href="/games-room" className="text-gray-900 pub-link font-bold">Games</Link>
      </nav>

      {/* News Articles */}
      <main className="w-full max-w-2xl mx-auto px-4 py-6 bg-white newspaper-border rounded-b-3xl shadow flex flex-col gap-8 font-serif">
        {loading ? (
          <div className="text-center text-gray-400 text-xl font-semibold py-10">Loading...</div>
        ) : news.length === 0 ? (
          <div className="text-center text-gray-400 text-xl font-semibold py-10">No news found.</div>
        ) : (
          news.map((data) => (
            <article key={data.id} className="animate-fade-in">
              <button
                className="w-full text-2xl font-bold text-gray-900 bg-transparent border-b border-gray-400 pb-2 mb-2 text-left hover:text-yellow-700 transition"
                onClick={() =>
                  setExpanded((prev) => ({
                    ...prev,
                    [data.id]: !prev[data.id],
                  }))
                }
                aria-expanded={!!expanded[data.id]}
              >
                {data.title || "Untitled Story"}
              </button>
              <div
                className={`mt-1 px-0 py-0 rounded text-gray-900`}
                style={{ display: expanded[data.id] ? "block" : "none" }}
              >
                {data.image && (
                  <img
                    src={data.image}
                    alt=""
                    className="w-full h-60 object-cover mb-3 border border-gray-300 newspaper-border"
                    style={{ filter: "grayscale(80%)", borderRadius: "0.5em" }}
                  />
                )}
                <div className="mb-2 pub-dropcap text-lg leading-relaxed">{data.content || ""}</div>
                <div className="flex flex-wrap items-center justify-between mt-2">
                  {data.author && (
                    <span className="text-sm text-gray-500 mr-2">By {data.author}</span>
                  )}
                  {(data.createdAt || data.date) && (
                    <span className="text-xs text-gray-400">
                      Posted: {data.date || formatDate(data.createdAt)}
                    </span>
                  )}
                  {data.source && (
                    <span className="text-xs text-gray-500 ml-2">Source: {data.source}</span>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-3xl bg-white px-8 py-4 text-center text-gray-700 border-t-2 newspaper-border font-serif rounded-b-3xl">
        <p className="italic">Published by The Pub Times &mdash; All the ball that's fit to print.</p>
      </footer>
    </div>
  );
};

export default PubNewsstand;
