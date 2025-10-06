"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "../../firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";

// --- Types ---
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
  } catch (e) { }
  return "";
}

export default function Page({ params }: { params: { id: string } }) {
  const id = params.id;
  const [story, setStory] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.body.style.backgroundColor = "#f3f4f6";
    document.body.style.fontFamily = "'Times New Roman', Times, serif";
    return () => {
      document.body.style.backgroundColor = "";
      document.body.style.fontFamily = "";
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    const loadStory = async () => {
      setLoading(true);
      const docRef = doc(db, "news", id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setStory({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    };
    loadStory();
  }, [id]);

  // Construct share text/urls
  const storyUrl = typeof window !== "undefined" ? window.location.href : "";
  const smsText = encodeURIComponent(`${story?.title || ""}\n${storyUrl}`);
  const twitterText = encodeURIComponent(`${story?.title || ""} ${storyUrl}`);

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
          font-size: 2rem;
          font-weight: bold;
          color: #1e3a8a;
          background: #fff;
          border: 1px solid #1e3a8a;
          border-radius: 7px;
          padding: 0.7em 1em;
          margin-bottom: 0.4em;
          text-align: left;
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
      <main className="pub-main" id="news-story">
        {loading ? (
          <div style={{ textAlign: "center", color: "#6b7280" }}>Loading...</div>
        ) : !story ? (
          <div style={{ textAlign: "center", color: "#6b7280" }}>Not found.</div>
        ) : (
          <div className="pub-story">
            <div className="pub-story-title">
              {story.title || "Untitled Story"}
            </div>
            <div
              className="pub-story-content"
              dangerouslySetInnerHTML={{
                __html: simpleSanitize(story.content || ""),
              }}
            />
            <div className="pub-story-meta">
              {story.author && (
                <div className="pub-author">By {story.author}</div>
              )}
              {story.createdAt && (
                <div className="pub-date-posted">
                  Posted: {formatDate(story.createdAt)}
                </div>
              )}
            </div>
            <div className="share-links">
              <a
                className="share-link-btn"
                href={`sms:?body=${smsText}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Share via SMS
              </a>
              <a
                className="share-link-btn"
                href={`https://twitter.com/intent/tweet?text=${twitterText}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Share on Twitter
              </a>
            </div>
          </div>
        )}
      </main>
      <footer className="pub-footer">
        <p>Published by The Pub Times</p>
      </footer>
    </div>
  );
}
