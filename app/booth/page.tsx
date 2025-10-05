"use client";
import React, { useEffect, useState, useRef } from "react";
import Link from "next/link"; // <-- Import Next.js Link

import {
  initializeApp
} from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User
} from "firebase/auth";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBtsOBlh52YZagsLXp9_dcCq4qhkHBSWnU",
  authDomain: "thepub-sigma.firebaseapp.com",
  projectId: "thepub-sigma",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const nflGames = [
  { id: "49ers-rams", label: "San Francisco 49ers at Los Angeles Rams (Thu, 8:15 PM ET, Amazon Prime Video)" },
  { id: "vikings-browns", label: "Minnesota Vikings vs. Cleveland Browns (London, Sun, 9:30 AM ET, NFL Network)" },
  { id: "cowboys-jets", label: "Dallas Cowboys at New York Jets (Sun, 1:00 PM ET, FOX)" },
  { id: "raiders-colts", label: "Las Vegas Raiders at Indianapolis Colts (Sun, 1:00 PM ET, FOX)" },
  { id: "dolphins-panthers", label: "Miami Dolphins at Carolina Panthers (Sun, 1:00 PM ET, FOX)" },
  { id: "broncos-eagles", label: "Denver Broncos at Philadelphia Eagles (Sun, 1:00 PM ET, CBS)" },
  { id: "texans-ravens", label: "Houston Texans at Baltimore Ravens (Sun, 1:00 PM ET, CBS)" },
  { id: "giants-saints", label: "New York Giants at New Orleans Saints (Sun, 1:00 PM ET, CBS)" },
  { id: "titans-cardinals", label: "Tennessee Titans at Arizona Cardinals (Sun, 4:05 PM ET, CBS)" },
  { id: "buccaneers-seahawks", label: "Tampa Bay Buccaneers at Seattle Seahawks (Sun, 4:05 PM ET, CBS)" },
  { id: "lions-bengals", label: "Detroit Lions at Cincinnati Bengals (Sun, 4:25 PM ET, FOX)" },
  { id: "commanders-chargers", label: "Washington Commanders at Los Angeles Chargers (Sun, 4:25 PM ET, FOX)" },
  { id: "patriots-bills", label: "New England Patriots at Buffalo Bills (Sun, 8:20 PM ET, NBC)" },
  { id: "chiefs-jaguars", label: "Kansas City Chiefs at Jacksonville Jaguars (Mon, 8:15 PM ET, ABC/ESPN)" }
  // Teams on Bye: Atlanta Falcons, Chicago Bears, Green Bay Packers, Pittsburgh Steelers
];

type Message = {
  id?: string;
  text: string;
  displayName: string;
  uid?: string;
  timestamp?: any;
  time?: string;
};

const BoothChat: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentBooth, setCurrentBooth] = useState<string>(nflGames[0].id);
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auth listener
  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  // Load messages for booth
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, "booths", currentBooth, "messages"),
      orderBy("timestamp", "asc"),
      limit(50)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({
          id: doc.id,
          text: data.text,
          displayName: data.displayName || "Anonymous",
          uid: data.uid,
          timestamp: data.timestamp,
          time: data.time
        });
      });
      setMessages(msgs);
      setLoading(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });
    return () => unsub();
  }, [currentBooth]);

  // Send message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    const msg: Message = {
      text: message.trim(),
      displayName: user?.displayName || "Anonymous",
      uid: user?.uid,
      timestamp: serverTimestamp(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    await addDoc(collection(db, "booths", currentBooth, "messages"), msg);
    setMessage("");
  };

  // Sign in
  const handleSignIn = () => {
    signInWithPopup(auth, new GoogleAuthProvider());
  };

  // Bar stools avatars based on users in booth
  const boothUserAvatars = React.useMemo(() => {
    const seen: { [uid: string]: string } = {};
    messages.forEach(msg => {
      seen[msg.uid || msg.displayName] = msg.displayName;
    });
    return Object.keys(seen).slice(0, 4).map(uid => ({
      uid,
      displayName: seen[uid]
    }));
  }, [messages]);

  return (
    <div className="flex flex-col items-center mt-8" style={{ fontFamily: "'Roboto','Montserrat',sans-serif" }}>
      <style>{`
        body {
          background: linear-gradient(135deg,#1a1e2d 0%,#2d3246 100%);
          min-height: 100vh;
          font-family: 'Roboto', 'Montserrat', sans-serif;
        }
        .booth-bg {
          background: #23263a;
          border-radius: 1.5rem;
          box-shadow: 0 8px 40px 0 rgba(0,0,0,0.4);
          border: 0;
          backdrop-filter: blur(2px);
        }
        .booth-top {
          background: linear-gradient(90deg, #2c2f48 0%, #3c4062 100%);
          border-top-left-radius: 1.5rem;
          border-top-right-radius: 1.5rem;
          min-height: 48px;
          border-bottom: 1px solid #23263a;
        }
        .bar-stool {
          width: 36px; height: 36px; background: #314276; border-radius: 50%; margin: 6px;
          border: 2px solid #3c4062;
          box-shadow: 0 2px 8px 0 rgba(0,0,0,0.18);
          display: inline-block;
        }
        .booth-bg select,
        .booth-bg input {
          background: #292c40 !important;
          color: #e8eefd !important;
          border-color: #3c4062 !important;
        }
        .booth-bg input::placeholder {
          color: #8695b8 !important;
        }
        .booth-bg label {
          color: #e8eefd !important;
        }
        .booth-bg .border-blue-600 {
          border-color: #314276 !important;
        }
        .twitter-chat-bubble {
          background: #23263a;
          border-radius: 1rem;
          box-shadow: 0 2px 8px rgba(44,64,98,0.09);
          padding: 12px 18px;
          margin-bottom: 12px;
          position: relative;
          max-width: 460px;
          word-break: break-word;
          transition: background 0.2s;
        }
        .twitter-chat-bubble.mine {
          background: #314276;
          color: #fff;
        }
        .twitter-chat-bubble .username {
          font-weight: 700;
          color: #4d67a3;
          font-family: 'Montserrat',sans-serif;
        }
        .twitter-chat-bubble.mine .username {
          color: #ffe477;
        }
        .twitter-chat-bubble .timestamp {
          font-size: 0.85em;
          color: #b9c5e1;
          margin-left: 8px;
        }
        .twitter-chat-bubble:hover {
          background: #292c40;
        }
        #messages::-webkit-scrollbar {
          width: 7px;
          background: #23263a;
        }
        #messages::-webkit-scrollbar-thumb {
          background: #314276;
          border-radius: 6px;
        }
      `}</style>
      <div className="booth-bg w-full max-w-2xl mx-auto">
        <div className="booth-top flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-montserrat font-bold text-blue-100 drop-shadow">🏈 Game Booths</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Updated from <a href="index.html"> to Next.js Link */}
            <Link href="/" className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-1 px-3 rounded-lg shadow text-base transition duration-150 border-2 border-blue-300">
              Home
            </Link>
          </div>
        </div>

        {!user && (
          <div className="p-6 flex flex-col items-center space-y-3">
            <button onClick={handleSignIn} className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded-lg shadow-lg text-lg">
              Sign in with Google
            </button>
          </div>
        )}

        {user && (
          <div className="flex flex-col h-[60vh] px-6 pb-6">
            <div className="flex flex-col items-center mb-3">
              <label className="text-blue-100 font-bold text-lg mb-2" htmlFor="boothSelect">Pick a Game Booth</label>
              <select
                id="boothSelect"
                value={currentBooth}
                onChange={e => setCurrentBooth(e.target.value)}
                className="bg-blue-100 border-2 border-blue-700 rounded p-2 mb-2 w-full text-center font-bold"
                style={{ maxWidth: 400 }}
              >
                {nflGames.map(game => (
                  <option key={game.id} value={game.id}>{game.label}</option>
                ))}
              </select>
            </div>
            <div id="messages" className="flex-1 overflow-y-auto px-0 pb-2 pt-2 rounded-lg mb-2 border-2 border-blue-600 shadow-inner bg-[#23263a]">
              {loading && (
                <div className="text-center text-blue-400 italic my-2">Loading messages...</div>
              )}
              {messages.map((msg, idx) => {
                const isMine = user && msg.uid === user.uid;
                return (
                  <div key={msg.id || idx} className={`twitter-chat-bubble${isMine ? " mine ml-auto" : ""}`}>
                    <span className="username">{msg.displayName || "Anonymous"}</span>
                    <span className="timestamp">
                      {msg.timestamp?.toDate
                        ? `${msg.timestamp.toDate().toLocaleDateString()} ${msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : msg.time || ""}
                    </span>
                    <div>{msg.text}</div>
                  </div>
                );
              })}
              <div ref={messagesEndRef}></div>
            </div>
            <form className="flex items-center gap-2 mt-2" onSubmit={handleSend}>
              <input
                id="messageInput"
                type="text"
                required
                maxLength={240}
                className="flex-1 bg-[#292c40] border-2 border-blue-600 rounded-lg p-2 focus:outline-none focus:ring-blue-800 text-white"
                placeholder="What's happening in your game booth?"
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
              <button type="submit" className="bg-blue-800 hover:bg-blue-900 text-white font-bold py-2 px-4 rounded-lg shadow">Send</button>
            </form>
          </div>
        )}
      </div>
      <div className="flex items-end mt-4" id="barStools">
        {boothUserAvatars.map((avatar, idx) => (
          <img
            key={avatar.uid + idx}
            src={`https://robohash.org/${avatar.uid}?set=set5&size=36x36`}
            title={avatar.displayName}
            className="rounded-full border-2 border-blue-700 shadow bar-stool"
            alt={avatar.displayName}
          />
        ))}
        {Array.from({ length: Math.max(0, 4 - boothUserAvatars.length) }).map((_, idx) => (
          <div key={idx} className="bar-stool"></div>
        ))}
      </div>
      <p className="text-blue-200 mt-2 text-sm" style={{ textShadow: "1px 1px 6px #000" }}>
        The Pub &mdash; Pick a game, chat, and react like Twitter!
      </p>
    </div>
  );
};

export default BoothChat;
