"use client";
import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { db } from "../firebase";
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";

type NewsArticle = {
  id: string;
  title?: string;
  content?: string;
  author?: string;
  createdAt?: Timestamp | { seconds: number } | number;
};

function simpleSanitize(html: string) {
  return html.replace(
    /<(?!\/?(p|br|b|i|em|strong|ul|ol|li|a)(\s|>|\/))/gi,
    "&lt;"
  )
  .replace(/ on\w+="[^"]*"/gi, "")
  .replace(/javascript:/gi, "");
}

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

// Utility to get the current absolute URL
function getBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin + window.location.pathname;
  }
  return "https://yourdomain.com/news";
}

const PubNewsstand: React.FC = () => {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [openStoryId, setOpenStoryId] = useState<string | null>(null);
  const storyRefs = useRef<{[id: string]: HTMLDivElement | null}>({});

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
      try {
        const q = query(collection(db, "news"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const articles: NewsArticle[] = [];
        snapshot.forEach((doc) => {
          const id = doc.id;
          const data = doc.data();
          if (id && data.title && !id.includes('%')) {
            articles.push({ id, ...data });
          }
        });
        setNews(articles);

        // Auto-scroll to anchor on initial load if present
        setTimeout(() => {
          if (typeof window !== "undefined") {
            const hash = window.location.hash;
            if (hash) {
              const el = document.getElementById(hash.replace("#", ""));
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
                setOpenStoryId(hash.replace("#story-", ""));
              }
            }
          }
        }, 300);

      } catch (error) {
        console.error("Error loading news:", error);
      } finally {
        setLoading(false);
      }
    };
    loadNewsArticles();
  }, []);

  // Scroll to story when openStoryId is set
  useEffect(() => {
    if (openStoryId && storyRefs.current[openStoryId]) {
      storyRefs.current[openStoryId]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [openStoryId]);

  const todayDate = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Anchor links for sharing (get absolute URL with anchor)
  const getStoryAnchorUrl = (id: string) => `${getBaseUrl()}#story-${id}`;
  const getSMSLink = (title: string, id: string) =>
    `sms:?body=${encodeURIComponent(`${title}\n${getStoryAnchorUrl(id)}`)}`;
  const getTwitterLink = (title: string, id: string) =>
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${title} ${getStoryAnchorUrl(id)}`)}`;

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
          text-decoration: none;
          display: block;
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
        .share-links {
          margin-top: 1em;
          display: flex;
          gap: 1em;
          align-items: center;
        }
        .share-link-btn {
          font-size: 1em;
          color: #2563eb;
          background: #e0e7ff;
          border: 1px solid #2563eb;
          border-radius: 6px;
          padding: 0.4em 1em;
          text-decoration: none;
          font-weight: bold;
          transition: background 0.18s, color 0.18s;
          cursor: pointer;
        }
        .share-link-btn:hover, .share-link-btn:focus {
          background: #2563eb;
          color: #fff;
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
          <Link href="/" className="pub-link">Home</Link>
          <Link href="/bulletin" className="pub-link">Hit the Bar</Link>
          <Link href="/index-nfl" className="pub-link">Games</Link>
        </div>
      </nav>
      <main className="pub-main" id="news-list">
        {loading ? (
          <div style={{ textAlign: "center", color: "#6b7280" }}>Loading...</div>
        ) : news.length === 0 ? (
          <div style={{ textAlign: "center", color: "#6b7280" }}>No news found.</div>
        ) : (
          news.map((data) => (
            <div
              key={data.id}
              className="pub-story"
              id={`story-${data.id}`}
              ref={el => { storyRefs.current[data.id] = el; }}
            >
              <button
                className="pub-story-title"
                aria-expanded={openStoryId === data.id}
                aria-controls={`story-content-${data.id}`}
                onClick={() => setOpenStoryId(openStoryId === data.id ? null : data.id)}
              >
                {data.title || "Untitled Story"}
              </button>
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
              {openStoryId === data.id && (
                <div
                  className="pub-story-content"
                  id={`story-content-${data.id}`}
                  dangerouslySetInnerHTML={{
                    __html: simpleSanitize(data.content || ""),
                  }}
                />
              )}
              {openStoryId === data.id && (
                <div className="share-links">
                  <a
                    className="share-link-btn"
                    href={getSMSLink(data.title || "Untitled Story", data.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Share via SMS
                  </a>
                  <a
                    className="share-link-btn"
                    href={getTwitterLink(data.title || "Untitled Story", data.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Share on Twitter
                  </a>
                </div>
              )}
            </div>
          ))
        )}
      </main>
      <footer className="pub-footer">
        <p>Published by The Pub Times</p>
      </footer>
    </div>
  );
};

export default PubNewsstand;
