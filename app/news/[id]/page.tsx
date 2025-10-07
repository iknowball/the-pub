"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "../../firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";

type NewsArticle = {
  id: string;
  title?: string;
  content?: string;
  author?: string;
  createdAt?: Timestamp | { seconds: number } | number;
};

function simpleSanitize(html: string) {
  return html.replace(/<(?!\/?(p|br|b|i|em|strong|ul|ol|li|a)(\s|>|\/))/gi, "&lt;")
    .replace(/ on\w+="[^"]*"/gi, "")
    .replace(/javascript:/gi, "");
}
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

export default function Page({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id);
  const [story, setStory] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);

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

  const storyUrl = typeof window !== "undefined" ? window.location.href : "";
  const smsText = encodeURIComponent(`${story?.title || ""}\n${storyUrl}`);
  const twitterText = encodeURIComponent(`${story?.title || ""} ${storyUrl}`);

  const todayDate = new Date().toLocaleDateString();

  return (
    <div className="pub-root">
      <header className="pub-header">
        <h1 className="pub-title">The Pub Times</h1>
        <p className="pub-date"><span>{todayDate}</span></p>
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
            <div className="pub-story-title">{story.title || "Untitled Story"}</div>
            <div
              className="pub-story-content"
              dangerouslySetInnerHTML={{
                __html: simpleSanitize(story.content || ""),
              }}
            />
            <div className="pub-story-meta">
              {story.author && <div className="pub-author">By {story.author}</div>}
              {story.createdAt && <div className="pub-date-posted">Posted: {formatDate(story.createdAt)}</div>}
            </div>
            <div className="share-links">
              <a className="share-link-btn" href={`sms:?body=${smsText}`} target="_blank" rel="noopener noreferrer">Share via SMS</a>
              <a className="share-link-btn" href={`https://twitter.com/intent/tweet?text=${twitterText}`} target="_blank" rel="noopener noreferrer">Share on Twitter</a>
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
