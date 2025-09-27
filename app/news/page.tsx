"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBtsOBlh52YZagsLXp9_dcCq4qhkHBSWnU",
  authDomain: "thepub-sigma.firebaseapp.com",
  projectId: "thepub-sigma",
  storageBucket: "thepub-sigma.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

type NewsArticle = {
  id: string;
  title?: string;
  content?: string;
  author?: string;
  createdAt?: Timestamp | { seconds: number } | number;
};

function formatDate(ts: NewsArticle["createdAt"]): string {
  try {
    if (ts && typeof ts === "object" && "seconds" in ts) {
      return new Date(ts.seconds * 1000).toLocaleDateString();
    } else if (typeof ts === "number") {
      return new Date(ts).toLocaleDateString();
    }
  } catch (e) {}
  return "";
}

const PubNewsstand: React.FC = () => {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<{ [id: string]: boolean }>({});

  useEffect(() => {
    document.body.style.backgroundColor = "#f3f4f6";
    document.body.style.fontFamily = "'Times New Roman', Times, serif";
    return () => {
      document.body.style.backgroundColor = "";
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
    <div className="flex flex-col items-center min-h-screen bg-gray-100 text-gray-900">
      <style>{`
        body {
          background-color: #f3f4f6 !important;
          font-family: 'Times New Roman', Times, serif !important;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        img {
          filter: grayscale(100%);
        }
        .masthead {
          border-bottom: 4px double #1f2937;
        }
      `}</style>
      <header className="w-full max-w-4xl bg-white p-6 border-b-4 border-gray-900 mb-4 masthead">
        <h1 className="text-5xl font-bold text-center text-gray-900">
          The Pub Times
        </h1>
        <p className="text-center text-lg text-gray-700 mt-2">
          <span>{todayDate}</span>
        </p>
      </header>
      <nav className="w-full max-w-4xl bg-gray-200 p-4 mb-4 border-t-2 border-b-2 border-gray-900">
        <div className="flex justify-between">
          <Link
            href="/"
            className="text-gray-900 hover:text-gray-700 font-bold"
          >
            Home
          </Link>
          <Link
            href="/bar"
            className="text-gray-900 hover:text-gray-700 font-bold"
          >
            Hit the Bar
          </Link>
          <Link
            href="/games-room"
            className="text-gray-900 hover:text-gray-700 font-bold"
          >
            Games
          </Link>
        </div>
      </nav>
      <main className="w-full max-w-2xl mx-auto p-2" id="news-list">
        {loading ? (
          <div className="text-center text-gray-500">Loading...</div>
        ) : news.length === 0 ? (
          <div className="text-center text-gray-500">No news found.</div>
        ) : (
          news.map((data) => (
            <div key={data.id} className="mb-4 animate-fade-in">
              <button
                className="w-full text-lg font-bold text-blue-900 bg-white border border-blue-900 rounded px-4 py-2 hover:bg-blue-50 focus:bg-blue-100 transition"
                onClick={() =>
                  setExpanded((prev) => ({
                    ...prev,
                    [data.id]: !prev[data.id],
                  }))
                }
              >
                {data.title || "Untitled Story"}
              </button>
              <div
                className={`mt-2 px-2 py-2 rounded bg-gray-50 border border-gray-200 text-gray-800`}
                style={{ display: expanded[data.id] ? "block" : "none" }}
              >
                <div className="mb-2">{data.content || ""}</div>
                {data.author && (
                  <div className="text-sm text-gray-500">By {data.author}</div>
                )}
                {data.createdAt && (
                  <div className="text-xs text-gray-400 mt-1">
                    Posted: {formatDate(data.createdAt)}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </main>
      <footer className="w-full max-w-4xl bg-gray-200 p-4 text-center text-gray-700 border-t-2 border-gray-900">
        <p>Published by The Pub Times</p>
      </footer>
    </div>
  );
};

export default PubNewsstand;
