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
  limit,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc,
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
  { id: "eagles-giants", label: "Philadelphia Eagles (4-1) vs. New York Giants (1-4) — Sun, Oct 12, 8:15 PM EDT, Prime Video" },
  { id: "broncos-jets", label: "Denver Broncos (3-2) vs. New York Jets (0-5) — Sun, Oct 12, 9:30 AM EDT, NFL Network" },
  { id: "rams-ravens", label: "Los Angeles Rams (3-2) vs. Baltimore Ravens (1-4) — Sun, Oct 12, 1:00 PM EDT, FOX" },
  { id: "cowboys-panthers", label: "Dallas Cowboys (2-2-1) vs. Carolina Panthers (2-3) — Sun, Oct 12, 1:00 PM EDT, FOX" },
  { id: "cardinals-colts", label: "Arizona Cardinals (2-3) vs. Indianapolis Colts (4-1) — Sun, Oct 12, 1:00 PM EDT, FOX" },
  { id: "seahawks-jaguars", label: "Seattle Seahawks (3-2) vs. Jacksonville Jaguars (4-1) — Sun, Oct 12, 1:00 PM EDT, FOX" },
  { id: "chargers-dolphins", label: "Los Angeles Chargers (3-2) vs. Miami Dolphins (1-4) — Sun, Oct 12, 1:00 PM EDT, CBS" },
  { id: "browns-steelers", label: "Cleveland Browns (1-4) vs. Pittsburgh Steelers (3-1) — Sun, Oct 12, 1:00 PM EDT, CBS" },
  { id: "patriots-saints", label: "New England Patriots (3-2) vs. New Orleans Saints (1-4) — Sun, Oct 12, 1:00 PM EDT, CBS" },
  { id: "titans-raiders", label: "Tennessee Titans (1-4) vs. Las Vegas Raiders (1-4) — Sun, Oct 12, 4:05 PM EDT, FOX" },
  { id: "49ers-buccaneers", label: "San Francisco 49ers (4-1) vs. Tampa Bay Buccaneers (4-1) — Sun, Oct 12, 4:25 PM EDT, CBS" },
  { id: "bengals-packers", label: "Cincinnati Bengals (2-3) vs. Green Bay Packers (2-1-1) — Sun, Oct 12, 4:25 PM EDT, CBS" },
  { id: "lions-chiefs", label: "Detroit Lions (4-1) vs. Kansas City Chiefs (2-3) — Sun, Oct 12, 8:20 PM EDT, NBC, UNIVERSO" },
  { id: "bills-falcons", label: "Buffalo Bills (4-1) vs. Atlanta Falcons (2-2) — Mon, Oct 13, 7:15 PM EDT, ESPN, ESPN DEPORTES" },
  { id: "bears-commanders", label: "Chicago Bears (2-2) vs. Washington Commanders (3-2) — Mon, Oct 13, 8:15 PM EDT, ABC" }
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
  const [pubUsername, setPubUsername] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentBooth, setCurrentBooth] = useState<string>(nflGames[0].id);
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auth listener and fetch pub username
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

  // Helper for showing the correct username for each message
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
  }, [messages, currentBooth]);

  // Send message (supports anonymous posting), always uses pub username if available
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    const msg: Message = {
      text: message.trim(),
      displayName: pubUsername || "Anonymous",
      timestamp: serverTimestamp(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ...(user?.uid ? { uid: user.uid } : {})
    };
    try {
      await addDoc(collection(db, "booths", currentBooth, "messages"), msg);
      setMessage("");
    } catch (error: any) {
      alert("Failed to send message: " + (error?.message || error));
    }
  };

  // Sign in
  const handleSignIn = () => {
    signInWithPopup(auth, new GoogleAuthProvider());
  };

  // Bar stools avatars based on users in booth
  const boothUserAvatars = React.useMemo(() => {
    const seen: { [uid: string]: string } = {};
    messages.forEach(msg => {
      // Always use displayNames if possible, fallback to displayName in message
      const name = msg.uid && displayNames[msg.uid] ? displayNames[msg.uid] : msg.displayName;
      seen[msg.uid || name] = name;
    });
    return Object.keys(seen).slice(0, 4).map(uid => ({
      uid,
      displayName: seen[uid]
    }));
  }, [messages, displayNames]);

  return (
    <div className="flex flex-col items-center mt-8" style={{ fontFamily: "'Roboto','Montserrat',sans-serif" }}>
      <style>{`
        body { background: linear-gradient(135deg,#1a1e2d 0%,#2d3246 100%); min-height: 100vh; font-family: 'Roboto', 'Montserrat', sans-serif; }
        .booth-bg { background: #23263a; border-radius: 1.5rem; box-shadow: 0 8px 40px 0 rgba(0,0,0,0.4); border: 0; backdrop-filter: blur(2px); }
        .booth-top { background: linear-gradient(90deg, #2c2f48 0%, #3c4062 100%); border-top-left-radius: 1.5rem; border-top-right-radius: 1.5rem; min-height: 48px; border-bottom: 1px solid #23263a; }
        .bar-stool { width: 36px; height: 36px; background: #314276; border-radius: 50%; margin: 6px; border: 2px solid #3c4062; box-shadow: 0 2px 8px 0 rgba(0,0,0,0.18); display: inline-block; }
        .booth-bg select, .booth-bg input { background: #292c40 !important; color: #e8eefd !important; border-color: #3c4062 !important; }
        .booth-bg input::placeholder { color: #8695b8 !important; }
        .booth-bg label { color: #e8eefd !important; }
        .booth-bg .border-blue-600 { border-color: #314276 !important; }
        .twitter-chat-bubble { background: #23263a; border-radius: 1rem; box-shadow: 0 2px 8px rgba(44,64,98,0.09); padding: 12px 18px; margin-bottom: 12px; position: relative; max-width: 460px; word-break: break-word; transition: background 0.2s; }
        .twitter-chat-bubble.mine { background: #314276; color: #fff; }
        .twitter-chat-bubble .username { font-weight: 700; color: #4d67a3; font-family: 'Montserrat',sans-serif; }
        .twitter-chat-bubble.mine .username { color: #ffe477; }
        .twitter-chat-bubble .timestamp { font-size: 0.85em; color: #b9c5e1; margin-left: 8px; }
        .twitter-chat-bubble > div { color: #fff !important; }
        .twitter-chat-bubble:hover { background: #292c40; }
        #messages::-webkit-scrollbar { width: 7px; background: #23263a; }
        #messages::-webkit-scrollbar-thumb { background: #314276; border-radius: 6px; }
      `}</style>
      <div className="booth-bg w-full max-w-2xl mx-auto">
        <div className="booth-top flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-montserrat font-bold text-blue-100 drop-shadow">🏈 Game Booths</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-1 px-3 rounded-lg shadow text-base transition duration-150 border-2 border-blue-300">
              Home
            </Link>
          </div>
        </div>

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
              const isMine = user && msg.uid === user?.uid;
              // Always show the Pub username from displayNames cache (never Google name/email)
              const nameToShow = msg.uid && displayNames[msg.uid] ? displayNames[msg.uid] : msg.displayName;
              return (
                <div key={msg.id || idx} className={`twitter-chat-bubble${isMine ? " mine ml-auto" : ""}`}>
                  <span className="username">{nameToShow}</span>
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
          {!user && (
            <div className="mt-3 flex flex-col items-center space-y-3">
              <span className="text-blue-300 text-sm italic">Sign in for your messages to display your username and avatar.</span>
              <button onClick={handleSignIn} className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded-lg shadow-lg text-lg">
                Sign in with Google
              </button>
            </div>
          )}
        </div>
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
