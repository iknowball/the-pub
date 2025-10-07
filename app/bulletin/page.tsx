"use client";
import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import {
  getAuth,
  onAuthStateChanged,
  User,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBtsOBlh52YZagsLXp9_dcCq4qhkHBSWnU",
  authDomain: "thepub-sigma.firebaseapp.com",
  projectId: "thepub-sigma",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

type Message = {
  id?: string;
  message: string;
  displayName: string;
  uid?: string;
  timestamp?: any;
  likes?: string[]; // array of user UIDs who liked this message
};

function BulletinPage() {
  const [user, setUser] = useState<User | null>(null);
  const [pubUsername, setPubUsername] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesRef = useRef<HTMLDivElement>(null);

  // Set user and load pub username on auth state change
  useEffect(() => {
    return onAuthStateChanged(auth, async (usr) => {
      setUser(usr);
      if (usr) {
        // Get pub username from Firestore users collection
        const userDoc = await getDoc(doc(db, "users", usr.uid));
        setPubUsername(userDoc.exists() ? userDoc.data()?.username || null : null);
      } else {
        setPubUsername(null);
      }
    });
  }, []);

  // Load messages
  useEffect(() => {
    const q = query(collection(db, "bulletin"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        msgs.push({
          id: docSnap.id,
          message: data.message,
          displayName: data.displayName || "Anonymous",
          uid: data.uid,
          timestamp: data.timestamp,
          likes: data.likes || [],
        });
      });
      setMessages(msgs);
      // Scroll to top
      if (messagesRef.current) {
        messagesRef.current.scrollTop = 0;
      }
    });
    return () => unsub();
  }, []);

  // When sending a message, always use pubUsername if available
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const msg: Message = {
      message: input.trim(),
      displayName: pubUsername || "Anonymous",
      uid: user?.uid,
      timestamp: serverTimestamp(),
      likes: [],
    };
    await addDoc(collection(db, "bulletin"), msg);
    setInput("");
  };

  const handleSignIn = () => {
    signInWithPopup(auth, new GoogleAuthProvider());
  };

  // Like a message (toggle like for signed-in user)
  const handleLike = async (msg: Message) => {
    if (!user || !msg.id) return;
    const liked = msg.likes?.includes(user.uid);
    const newLikes = liked
      ? msg.likes!.filter((uid) => uid !== user.uid)
      : [...(msg.likes || []), user.uid];
    await updateDoc(doc(db, "bulletin", msg.id), { likes: newLikes });
  };

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

  // Helper for showing the correct username for each message
  const getDisplayName = async (uid: string | undefined, fallback: string) => {
    if (!uid) return fallback;
    const userDoc = await getDoc(doc(db, "users", uid));
    return userDoc.exists() ? userDoc.data()?.username || fallback : fallback;
  };

  // For each message, cache user profile usernames
  const [displayNames, setDisplayNames] = useState<{ [uid: string]: string }>({});
  useEffect(() => {
    const loadUsernames = async () => {
      const uids = Array.from(new Set(messages.map(m => m.uid).filter(Boolean) as string[]));
      const newDisplayNames: { [uid: string]: string } = { ...displayNames };
      await Promise.all(uids.map(async (uid) => {
        if (!newDisplayNames[uid]) {
          const userDoc = await getDoc(doc(db, "users", uid));
          newDisplayNames[uid] = userDoc.exists() ? userDoc.data()?.username || "Anonymous" : "Anonymous";
        }
      }));
      setDisplayNames(newDisplayNames);
    };
    if (messages.length) loadUsernames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  return (
    <div className="bulletin-bg">
      <style>{`
        .bulletin-bg { min-height: 100vh; width: 100vw; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: 'Montserrat', Arial, sans-serif; padding-bottom: 4rem; }
        .glass-panel { background: rgba(33, 28, 18, 0.78); backdrop-filter: blur(3px); border-radius: 1.25rem; box-shadow: 0 8px 36px 0 rgba(0,0,0,0.6); border: 2px solid #d4a827; width: 100%; max-width: 430px; padding: 2rem 1.3rem 2.1rem 1.3rem; margin: 0 auto; display: flex; flex-direction: column; align-items: center; }
        .top-bar { width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.7rem; margin-bottom: 1.3rem; }
        .main-btn-bar { display: flex; gap: 0.7rem; flex: 1 1 0; justify-content: center; }
        .topnav-btn { background: #fbbf24; color: #3f3f2e; font-weight: bold; padding: 0.6rem 1.1rem; border-radius: 0.8rem; border: 2px solid #d4a827; font-size: 1rem; box-shadow: 0 2px 12px #1a1a1a22; transition: background 0.15s, color 0.15s, transform 0.12s; text-decoration: none; cursor: pointer; min-width: 90px; text-align: center; display: inline-block; }
        .topnav-btn:hover { background: #fde68a; color: #26221a; transform: scale(1.04); }
        .sports-bar-header { font-family: 'Montserrat', sans-serif; color: #fbbf24; text-shadow: 0 2px 12px #1e293b; font-size: 2.3rem; font-weight: bold; letter-spacing: 0.03em; margin-bottom: 1.4rem; width: 100%; text-align: center; }
        .main-bar-title { font-size: 1.4rem; font-weight: bold; color: #fff; margin-bottom: 0.6rem; width: 100%; text-align: center; }
        .chat-bubble { max-width: 95%; margin-bottom: 1.1rem; background: linear-gradient(90deg, #3f3f2e 0%, #523b1d 100%); border-radius: 0.85rem; box-shadow: 0 2px 12px #1a1a1a44; padding: 1rem 1.2rem; position: relative; display: flex; flex-direction: column; transition: background 0.2s; border: 1.5px solid #d4a827; word-break: break-word; }
        .chat-bubble .username { font-weight: 700; color: #e6c86a; font-family: 'Montserrat',sans-serif; margin-bottom: 2px; font-size: 1.02rem; letter-spacing: 0.01em; }
        .chat-bubble .timestamp { font-size: 0.78em; color: #e7a11e; align-self: flex-end; margin-top: 2px; margin-left: 5px; }
        .chat-bubble.own { background: linear-gradient(90deg, #2f523b 0%, #3f8f60 100%); color: #fff; border-color: #44a869; }
        .chat-bubble:hover { background: #5e4c27; }
        .glass-panel input, .glass-panel button { font-family: 'Montserrat', sans-serif; }
        .glass-panel input { width: 100%; font-size: 1.09rem; background: #57523c; border: 2px solid #d4a827; color: #ffe066; border-radius: 0.8rem; padding: 0.82rem 1rem; margin-bottom: 0.68rem; outline: none; }
        .glass-panel input:focus { border-color: #fbbf24; background: #6d5e3e; }
        .glass-panel input::placeholder { color: #d6cfa7; font-style: italic; }
        .glass-panel button[type="submit"] { width: 100%; background: #fbbf24; color: #31260b; font-weight: bold; padding: 0.92rem 0; border-radius: 0.9rem; border: 2px solid #d4a827; font-size: 1.14rem; box-shadow: 0 2px 12px #1a1a1a22; transition: background 0.15s, color 0.15s, transform 0.12s; margin-bottom: 0.2rem; cursor: pointer; }
        .glass-panel button[type="submit"]:hover:enabled { background: #fde68a; color: #26221a; transform: scale(1.03); }
        .glass-panel button[type="submit"]:disabled { background: #b7a45a; color: #fff; cursor: not-allowed; }
        .user-bar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; padding: 0.4rem 0.2rem; border-bottom: 1px solid #d4a827; }
        .user-avatar { width: 38px; height: 38px; border-radius: 50%; background: #d4a827; box-shadow: 0 2px 8px #3b2f0e77; border: 2px solid #fbbf24; }
        .user-display { font-family: 'Montserrat', sans-serif; color: #fbbf24; font-weight: 700; font-size: 1.12rem; letter-spacing: 0.02em; }
        .anonymous { color: #a3a3a3; font-style: italic; }
        .message-list-bg { background: rgba(255, 245, 191, 0.07); border-radius: 1rem; border: 1.5px solid #d4a827; margin-bottom: 1.1rem; }
        .back-home-btn { display: block; width: 100%; margin-top: 1.5rem; background: #fbbf24; color: #3f3f2e; font-weight: bold; padding: 1.1rem 0; border-radius: 0.8rem; border: 2px solid #d4a827; font-size: 1.18rem; box-shadow: 0 2px 12px #1a1a1a22; transition: background 0.15s, color 0.15s, transform 0.12s; text-align: center; text-decoration: none; }
        .back-home-btn:hover { background: #fde68a; color: #26221a; transform: scale(1.03); }
        .like-btn { background: #000; color: #fbbf24; border: 1px solid #d4a827; font-size: 1.05rem; border-radius: 0.7rem; font-weight: bold; padding: 0.2rem 0.8rem; margin-left: 0.4em; margin-top: 0.5em; cursor: pointer; box-shadow: 0 1px 4px #d4a82722; transition: background 0.16s, color 0.16s, transform 0.11s; display: inline-flex; align-items: center; gap: 0.32em; }
        .like-btn.liked { background: #222; color: #eab308; }
        .like-count { font-size: 0.93em; color: #fff; font-weight: bold; margin-left: 0.3em; }
        @media (max-width: 500px) {
          .bulletin-bg { padding-left: 0; padding-right: 0; align-items: center; justify-content: flex-start; }
          .glass-panel { max-width: 97vw; margin: 0 auto; padding-left: 0.3rem; padding-right: 0.3rem; align-items: center; }
          .top-bar { flex-direction: row; justify-content: center; width: 100%; gap: 0.7rem; }
          .main-btn-bar { width: auto; gap: 0.7rem; flex-direction: row; justify-content: center; }
          .user-bar { flex-direction: row; gap: 0.7rem; }
          .topnav-btn { padding: 0.5rem 0.7rem; font-size: 0.9rem; min-width: 70px; }
        }
      `}</style>
      <div className="glass-panel">
        <div className="top-bar">
          <div className="main-btn-bar" style={{ width: "100%", justifyContent: "center" }}>
            <Link href="/" className="topnav-btn">Home</Link>
            <Link href="/index-nfl" className="topnav-btn">Games</Link>
            <Link href="/myprofile" className="topnav-btn">Profile</Link>
          </div>
        </div>
        <h1 className="sports-bar-header text-center">
          The Pub Social
        </h1>
        <h2 className="main-bar-title text-center">
          Main Bar
        </h2>
        <div className="user-bar" id="userBar">
          <img
            className="user-avatar"
            src={user
              ? user.photoURL || `https://robohash.org/${user.uid}?set=set5&size=38x38`
              : "https://robohash.org/anon?set=set5&size=38x38"}
            alt="User avatar"
          />
          <span className={`user-display${!user ? " anonymous" : ""}`}>
            {user
              ? pubUsername || "Anonymous"
              : "Anonymous"}
          </span>
        </div>
        <div>
          <form className="message-form" onSubmit={handleSend} style={{ width: "100%" }}>
            <input
              type="text"
              id="messageInput"
              className="message-input"
              placeholder={user ? "Type your message..." : "Sign in to post..."}
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={!user}
              autoComplete="off"
              style={{
                width: "100%",
                marginBottom: "0.4rem",
                boxSizing: "border-box"
              }}
            />
            <button
              type="submit"
              id="postMessage"
              disabled={!user || !input.trim()}
              style={{ width: "100%" }}
            >
              Send
            </button>
          </form>
        </div>
        <div
          id="messageList"
          ref={messagesRef}
          className="max-h-72 overflow-y-auto message-list-bg p-4"
          style={{
            maxHeight: "320px",
            overflowY: "auto",
            width: "100%",
            marginTop: "1.05rem"
          }}
        >
          {messages.map((msg, idx) => {
            const isOwn = user && msg.uid === user?.uid;
            const timestamp =
              msg.timestamp && msg.timestamp.toDate
                ? `${msg.timestamp.toDate().toLocaleDateString([], {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  })} ${msg.timestamp.toDate().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "";
            const likedByUser = user && msg.likes?.includes(user.uid);
            // Always show the Pub username from displayNames cache (not Google name)
            const nameToShow = msg.uid && displayNames[msg.uid] ? displayNames[msg.uid] : "Anonymous";
            return (
              <div
                key={msg.id || idx}
                className={`chat-bubble${isOwn ? " own ml-auto" : ""}`}
                style={{
                  marginLeft: isOwn ? "auto" : undefined,
                }}
              >
                <span className={`username${!nameToShow ? " anonymous" : ""}`}>
                  {nameToShow}
                </span>
                <span className="timestamp">{timestamp}</span>
                <span>{msg.message}</span>
                <div>
                  <button
                    className={`like-btn${likedByUser ? " liked" : ""}`}
                    onClick={() => handleLike(msg)}
                    disabled={!user}
                    aria-label="Like this message"
                  >
                    👍
                    <span className="like-count">
                      {msg.likes?.length ? msg.likes.length : 0}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <Link
          href="/"
          className="back-home-btn"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}

export default BulletinPage;
