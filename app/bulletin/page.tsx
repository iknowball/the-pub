"use client";
import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  initializeApp
} from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";
import {
  getAuth,
  onAuthStateChanged,
  User,
  signInWithPopup,
  GoogleAuthProvider
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
};

export const bulletin: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesRef = useRef<HTMLDivElement>(null);

  // Auth state
  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  // Listen for messages, newest first
  useEffect(() => {
    const q = query(
      collection(db, "bulletin"),
      orderBy("timestamp", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({
          id: doc.id,
          message: data.message,
          displayName: data.displayName || "Anonymous",
          uid: data.uid,
          timestamp: data.timestamp
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

  // Send message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const msg: Message = {
      message: input.trim(),
      displayName: user?.displayName || user?.email || "Anonymous",
      uid: user?.uid,
      timestamp: serverTimestamp()
    };
    await addDoc(collection(db, "bulletin"), msg);
    setInput("");
  };

  // Sign in with Google
  const handleSignIn = () => {
    signInWithPopup(auth, new GoogleAuthProvider());
  };

  // Styling
  useEffect(() => {
    document.body.style.backgroundImage = "url('https://awolvision.com/cdn/shop/articles/sports_bar_awolvision.jpg?v=1713302733&width=1500')";
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundAttachment = "fixed";
    document.body.style.backgroundColor = "#2f2e22";
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen font-montserrat pb-16">
      <style>{`
        .glass-panel {
          background: rgba(33, 28, 18, 0.78);
          backdrop-filter: blur(3px);
          border-radius: 1.25rem;
          box-shadow: 0 8px 36px 0 rgba(0,0,0,0.6);
          border: 2px solid #d4a827;
        }
        .sports-bar-header {
          font-family: 'Montserrat', sans-serif;
          color: #fbbf24;
          text-shadow: 0 2px 12px #1e293b;
        }
        .chat-bubble {
          max-width: 85%;
          margin-bottom: 1.1rem;
          background: linear-gradient(90deg, #3f3f2e 0%, #523b1d 100%);
          border-radius: 0.85rem;
          box-shadow: 0 2px 12px #1a1a1a44;
          padding: 1rem 1.2rem;
          position: relative;
          display: flex;
          flex-direction: column;
          transition: background 0.2s;
          border: 1.5px solid #d4a827;
        }
        .chat-bubble .username {
          font-weight: 700;
          color: #e6c86a;
          font-family: 'Montserrat',sans-serif;
          margin-bottom: 2px;
          font-size: 1.02rem;
          letter-spacing: 0.01em;
        }
        .chat-bubble .timestamp {
          font-size: 0.78em;
          color: #e7a11e;
          align-self: flex-end;
          margin-top: 2px;
          margin-left: 5px;
        }
        .chat-bubble.own {
          background: linear-gradient(90deg, #2f523b 0%, #3f8f60 100%);
          color: #fff;
          border-color: #44a869;
        }
        .chat-bubble:hover {
          background: #5e4c27;
        }
        .glass-panel input,
        .glass-panel button {
          font-family: 'Montserrat', sans-serif;
        }
        .glass-panel input::placeholder {
          color: #d6cfa7;
          font-style: italic;
        }
        .user-bar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          padding: 0.4rem 0.2rem;
          border-bottom: 1px solid #d4a827;
        }
        .user-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #d4a827;
          box-shadow: 0 2px 8px #3b2f0e77;
          border: 2px solid #fbbf24;
        }
        .user-display {
          font-family: 'Montserrat', sans-serif;
          color: #fbbf24;
          font-weight: 700;
          font-size: 1.12rem;
          letter-spacing: 0.02em;
        }
        .anonymous {
          color: #a3a3a3;
          font-style: italic;
        }
        .message-list-bg {
          background: rgba(255, 245, 191, 0.07);
          border-radius: 1rem;
          border: 1.5px solid #d4a827;
        }
        @media (max-width: 500px) {
          .glass-panel { padding: 0.7rem; }
        }
      `}</style>
      <div className="w-full max-w-md glass-panel p-6 shadow-xl">
        <h1 className="text-4xl font-bold sports-bar-header mb-7 text-center">Welcome to the Pub</h1>
        <h2 className="text-2xl font-bold text-white mb-1 text-center">Main Bar</h2>
        <div className="user-bar mb-2" id="userBar">
          <img
            className="user-avatar"
            src={user
              ? user.photoURL || `https://robohash.org/${user.uid}?set=set5&size=38x38`
              : "https://robohash.org/anon?set=set5&size=38x38"}
            alt="User avatar"
          />
          <span className={`user-display${!user ? " anonymous" : ""}`}>
            {user
              ? user.displayName || user.email || "Anonymous"
              : "Anonymous"}
          </span>
          {!user && (
            <button
              onClick={handleSignIn}
              className="ml-2 bg-amber-600 hover:bg-amber-700 text-white font-bold px-2 py-1 rounded-lg shadow text-sm border-2 border-yellow-600"
            >
              Sign in with Google
            </button>
          )}
        </div>
        <div className="mb-4">
          <form className="flex flex-col" onSubmit={handleSend}>
            <input
              type="text"
              id="messageInput"
              className="w-full p-2 rounded-lg border-2 border-yellow-600 bg-amber-900/90 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-600"
              placeholder="Type your message..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={!user}
              autoComplete="off"
            />
            <button
              type="submit"
              id="postMessage"
              className="w-full mt-2 bg-amber-600 text-white font-bold p-2 rounded-lg hover:bg-amber-700 transform hover:scale-105 transition duration-200 border-2 border-yellow-600 shadow-md"
              disabled={!user || !input.trim()}
            >
              Send
            </button>
          </form>
        </div>
        <div
          id="messageList"
          ref={messagesRef}
          className="max-h-72 overflow-y-auto message-list-bg p-4 mb-1"
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
            return (
              <div
                key={msg.id || idx}
                className={`chat-bubble${isOwn ? " own ml-auto" : ""}`}
              >
                <span className={`username${!msg.displayName ? " anonymous" : ""}`}>
                  {msg.displayName || "Anonymous"}
                </span>
                <span className="timestamp">{timestamp}</span>
                <span>{msg.message}</span>
              </div>
            );
          })}
        </div>
        <Link
          href="/"
          className="block w-full mt-4 bg-amber-600 text-white font-bold p-4 rounded-lg hover:bg-amber-700 transform hover:scale-105 transition duration-200 border-2 border-yellow-600 shadow-md text-center"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default bulletin;
