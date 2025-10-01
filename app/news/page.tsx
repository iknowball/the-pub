"use client";
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";

// --- Types ---
type NewsArticle = {
  id: string;
  title?: string;
  content?: string;
  author?: string;
  createdAt?: Timestamp | { seconds: number } | number;
};

// Simple sanitizer: allow only a few tags (p, br, b, i, em, strong, ul, ol, li, a)
function simpleSanitize(html: string) {
  // Remove all tags not in the allowed set
  return html.replace(
    /<(?!\/?(p|br|b|i|em|strong|ul|ol|li|a)(\s|>|\/))/gi,
    "&lt;"
  )
  // Remove all event handlers and javascript: hrefs
  .replace(/ on\w+="[^"]*"/gi, "")
  .replace(/javascript:/gi, "");
}

// Helper to format Firestore Timestamp or millis
function formatDate(ts: NewsArticle["createdAt"]): string {
  try {
    if (ts && typeof ts === "object" && "seconds" in ts) {
      return new Date(ts.seconds * 1000).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } else if (typeof ts === "number") {
      return new Date(ts).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
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
      const q = query(collection(db, "news"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const articles: NewsArticle[] = [];
      snapshot.forEach((doc) => {
        articles.push({ id: doc.id, ...doc.data() });
      });
      setNews(articles);
      setLoading(false);
    };
    loadNewsArticles();
  }, []);

  // Today's date
  const todayDate = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="pub-root">
      <style>{`
        body {
          background-color: #f3f4f6 !important;
          font-family: 'Times New Roman', Times, serif !important;
          margin: 0;
        }
        .pub-root {
          min-height: 100vh;
          width: 100vw;
          display: flex;
          flex-direction: column;
          align-items: center;
          color: #111827;
          background-color: #f3f4f6;
        }
        .pub-header {
          width: 100%;
          max-width: 900px;
          background: #fff;
          padding: 2rem 1.5rem 1rem 1.5rem;
          border-bottom: 4px double #1f2937;
          margin-bottom: 1.5rem;
          box-sizing: border-box;
        }
        .pub-title {
          font-size: 3rem;
          font-weight: bold;
          text-align: center;
          margin: 0;
          color: #111827;
          letter-spacing: 0.03em;
        }
        .pub-date {
          text-align: center;
          font-size: 1.2rem;
          color: #4b5563;
          margin-top: 0.5em;
        }
        .pub-nav {
          width: 100%;
          max-width: 900px;
          background: #e5e7eb;
          border-top: 2px solid #1f2937;
          border-bottom: 2px solid #1f2937;
          margin-bottom: 1.5rem;
          padding: 1rem 1.5rem;
          box-sizing: border-box;
        }
        .pub-nav-inner {
          display: flex;
          justify-content: space-between;
        }
        .pub-link {
          color: #111827;
          font-weight: bold;
          text-decoration: none;
          transition: color 0.2s;
        }
        .pub-link:hover, .pub-link:focus {
          color: #374151;
        }
        .pub-main {
          width: 100%;
          max-width: 700px;
          margin: 0 auto 2rem auto;
          padding: 1rem 0.5rem;
          box-sizing: border-box;
        }
        .pub-story {
          margin-bottom: 1.5rem;
          animation: fade-in 0.3s ease-out;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px);}
          to { opacity: 1; transform: translateY(0);}
        }
        .pub-story-title {
          width: 100%;
          font-size: 1.25rem;
          font-weight: bold;
          color: #1e3a8a;
          background: #fff;
          border: 1px solid #1e3a8a;
          border-radius: 7px;
          padding: 0.7em 1em;
          cursor: pointer;
          text-align: left;
          transition: background 0.2s, color 0.2s;
        }
        .pub-story-title:hover, .pub-story-title:focus {
          background: #f1f5f9;
        }
        .pub-story-content {
          margin-top: 0.5em;
          padding: 1em;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 7px;
          color: #1f2937;
          display: block;
        }
        .pub-story-content[hidden] {
          display: none;
        }
        .pub-story-meta {
          margin-top: 0.8em;
          display: flex;
          flex-direction: column;
          gap: 0.15em;
        }
        .pub-author {
          font-size: 0.98em;
          color: #6b7280;
        }
        .pub-date-posted {
          font-size: 0.85em;
          color: #9ca3af;
        }
        .pub-footer {
          width: 100%;
          max-width: 900px;
          background: #e5e7eb;
          border-top: 2px solid #1f2937;
          text-align: center;
          color: #4b5563;
          padding: 1.2em 1.5em;
          box-sizing: border-box;
          font-size: 1.05em;
        }
        @media (max-width: 700px) {
          .pub-header, .pub-nav, .pub-footer, .pub-main {
            max-width: 99vw;
            padding-left: 0.5rem; padding-right: 0.5rem;
          }
          .pub-title { font-size: 2.1rem;}
        }
      `}</style>
      <header className="pub-header">
        <h1 className="pub-title">The Pub Times</h1>
        <p className="pub-date">
          <span>{todayDate}</span>
        </p>
      </header>
      <nav className="pub-nav">
        <div className="pub-nav-inner">
          <a href="/" className="pub-link">Home</a>
          <a href="/bar" className="pub-link">Hit the Bar</a>
          <a href="/games-room" className="pub-link">Games</a>
        </div>
      </nav>
      <main className="pub-main" id="news-list">
        {loading ? (
          <div style={{ textAlign: "center", color: "#6b7280" }}>Loading...</div>
        ) : news.length === 0 ? (
          <div style={{ textAlign: "center", color: "#6b7280" }}>No news found.</div>
        ) : (
          news.map((data) => {
            const isOpen = !!expanded[data.id];
            return (
              <div key={data.id} className="pub-story">
                <button
                  className="pub-story-title"
                  onClick={() =>
                    setExpanded((prev) => ({
                      ...prev,
                      [data.id]: !prev[data.id],
                    }))
                  }
                  aria-expanded={isOpen}
                  type="button"
                >
                  {data.title || "Untitled Story"}
                </button>
                <div
                  className="pub-story-content"
                  hidden={!isOpen}
                >
                  <div
                    dangerouslySetInnerHTML={{
                      __html: simpleSanitize(data.content || ""),
                    }}
                  />
                  {isOpen && (
                    <div className="pub-story-meta">
                      {data.author && (
                        <div className="pub-author">By {data.author}</div>
                      )}
                      {data.createdAt && (
                        <div className="pub-date-posted">
                          Posted: {formatDate(data.createdAt)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </main>
      <footer className="pub-footer">
        <p>Published by The Pub Times</p>
      </footer>
    </div>
  );
};

export default PubNewsstand;
