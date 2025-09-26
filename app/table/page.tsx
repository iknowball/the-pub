import React, { useEffect, useRef, useState } from "react";
import {
  initializeApp
} from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDocs,
  setDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  User
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBtsOBlh52YZagsLXp9_dcCq4qhkHBSWnU",
  authDomain: "thepub-sigma.firebaseapp.com",
  projectId: "thepub-sigma",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const defaultTopics = [
  { id: "goat", text: "Who's the GOAT?" },
  { id: "lebron-vs-mj", text: "LeBron vs MJ" },
  { id: "brady-vs-manning", text: "Brady vs Manning" },
  { id: "prime-vs-longevity", text: "Prime vs Longevity" }
];

type Topic = { id: string; text: string };
type Message = {
  id?: string;
  text: string;
  displayName: string;
  uid?: string;
  timestamp?: any;
  time?: string;
};

export const DebateTable: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [customTopic, setCustomTopic] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [currentDebateId, setCurrentDebateId] = useState<string>(defaultTopics[0].id);
  const [debateTopic, setDebateTopic] = useState<string>(defaultTopics[0].text);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<{ [uid: string]: string }>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  // Styling
  useEffect(() => {
    document.body.style.background =
      "url('https://images.unsplash.com/photo-1447078806655-40579c2520d6?auto=format&fit=crop&w=1350&q=80') no-repeat center center fixed";
    document.body.style.backgroundSize = "cover";
    document.body.style.minHeight = "100vh";
    document.body.style.fontFamily = "'Roboto', sans-serif";
    return () => {
      document.body.style.background = "";
      document.body.style.backgroundSize = "";
      document.body.style.minHeight = "";
      document.body.style.fontFamily = "";
    };
  }, []);

  // Load topics from Firestore (and add defaults if needed)
  useEffect(() => {
    const loadTopics = async () => {
      let allTopics: Topic[] = [];
      const snap = await getDocs(collection(db, "debateTopics"));
      if (snap.empty) {
        // Populate defaults
        for (const t of defaultTopics) {
          await setDoc(doc(db, "debateTopics", t.id), { text: t.text });
        }
        allTopics = [...defaultTopics];
      } else {
        allTopics = snap.docs.map((doc) => ({
          id: doc.id,
          text: doc.data().text,
        }));
        // Ensure defaults
        for (const t of defaultTopics) {
          if (!allTopics.some((topic) => topic.id === t.id)) {
            await setDoc(doc(db, "debateTopics", t.id), { text: t.text });
            allTopics.push(t);
          }
        }
      }
      // Sort topics by defaults first
      allTopics = defaultTopics.concat(
        allTopics.filter((t) => !defaultTopics.some((dt) => dt.id === t.id))
      );
      setTopics(allTopics);
      setCurrentDebateId(allTopics[0].id);
      setDebateTopic(allTopics[0].text);
    };
    loadTopics();
  }, []);

  // Auth listener
  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  // Messages listener
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, "debates", currentDebateId, "messages"),
      orderBy("timestamp", "asc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      const participants: { [uid: string]: string } = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({
          id: doc.id,
          text: data.text,
          displayName: data.displayName || "Anonymous",
          uid: data.uid,
          timestamp: data.timestamp,
          time: data.time,
        });
        participants[data.uid || "Anonymous"] =
          data.displayName || "Anonymous";
      });
      setMessages(msgs);
      setParticipants(participants);
      setLoading(false);
    });
    return () => unsub();
  }, [currentDebateId]);

  // Add custom topic
  const handleAddCustomTopic = async () => {
    if (!customTopic.trim()) return;
    const newId =
      "custom-" + customTopic.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const topicRef = doc(db, "debateTopics", newId);
    const topicSnap = await getDoc(topicRef);
    if (!topicSnap.exists()) {
      await setDoc(topicRef, { text: customTopic });
      setTopics((ts) => [...ts, { id: newId, text: customTopic }]);
    }
    setCurrentDebateId(newId);
    setDebateTopic(customTopic);
    setShowCustom(false);
    setCustomTopic("");
  };

  // Topic select change
  const handleTopicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "custom") {
      setShowCustom(true);
      setDebateTopic(customTopic || "Enter your own debate topic!");
    } else {
      setShowCustom(false);
      const topicText =
        topics.find((t) => t.id === val)?.text || "Debate topic";
      setCurrentDebateId(val);
      setDebateTopic(topicText);
    }
  };

  // Custom topic input change
  const handleCustomInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomTopic(e.target.value);
    setDebateTopic(e.target.value || "Enter your own debate topic!");
  };

  // Send message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    const msg: Message = {
      text: message.trim(),
      displayName: user?.displayName || "Anonymous",
      uid: user?.uid,
      timestamp: serverTimestamp(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    await addDoc(collection(db, "debates", currentDebateId, "messages"), msg);
    setMessage("");
  };

  // Sign in with Google
  const handleSignIn = () => {
    signInWithPopup(auth, new GoogleAuthProvider());
  };

  // Debate seats avatars
  const participantIds = Object.keys(participants);
  const seat1 = participantIds[0];
  const seat2 = participantIds[1];

  return (
    <div className="flex flex-col items-center mt-10">
      <style>{`
        .table-bg {
          background: rgba(33, 38, 55, 0.96);
          border-radius: 1.5rem;
          box-shadow: 0 6px 40px 0 rgba(0,0,0,0.35);
          border: 6px solid #4c7fb2;
          backdrop-filter: blur(2px);
        }
        .table-top {
          background: linear-gradient(90deg, #7ab6ec 0%, #c2e7fa 60%, #7ab6ec 100%);
          border-top-left-radius: 1.5rem;
          border-top-right-radius: 1.5rem;
          min-height: 40px;
        }
        .debate-seat {
          width: 48px; height: 48px; background: #4c7fb2; border-radius: 50%; margin: 6px;
          border: 2px solid #7ab6ec;
          box-shadow: 0 2px 8px 0 rgba(0,0,0,0.25);
          display: inline-block;
          object-fit: cover;
        }
        .debate-topic {
          background: #eaf6ff;
          border: 2px solid #4c7fb2;
          border-radius: 12px;
          margin-bottom: 16px;
          font-weight: bold;
          color: #22517a;
          padding: 8px 18px;
          text-align: center;
        }
        .debate-message-bubble {
          background: #d1e7f9;
          border-radius: 10px;
          padding: 10px 14px;
          margin-bottom: 8px;
          color: #13304a;
          font-size: 1rem;
          max-width: 80%;
          box-shadow: 0 1px 5px rgba(44,64,98,0.08);
        }
        .debate-message-bubble.mine {
          background: #4c7fb2;
          color: #fff;
          margin-left: auto;
          text-align: right;
        }
        .debate-message-meta {
          font-size: 0.85em;
          color: #5e7e9d;
          margin-bottom: 2px;
          font-family: 'Montserrat', sans-serif;
        }
        #debateMessages::-webkit-scrollbar {
          width: 7px;
          background: #23263a;
        }
        #debateMessages::-webkit-scrollbar-thumb {
          background: #4c7fb2;
          border-radius: 6px;
        }
      `}</style>
      <div className="table-bg w-full max-w-2xl mx-auto">
        <div className="table-top flex items-center justify-between px-6 py-2">
          <h1 className="text-2xl font-montserrat font-bold text-blue-900 drop-shadow">
            🗣️ 1-on-1 Debate Table
          </h1>
          <div>
            <a
              href="index.html"
              className="bg-blue-700 hover:bg-blue-900 text-white font-bold py-1 px-3 rounded-lg shadow text-base transition duration-150 border-2 border-blue-300"
            >
              Home
            </a>
          </div>
        </div>
        {!user && (
          <div className="p-6 flex flex-col items-center space-y-3">
            <button
              className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded-lg shadow-lg text-lg"
              onClick={handleSignIn}
            >
              Sign in with Google
            </button>
          </div>
        )}
        {user && (
          <div className="flex flex-col h-[65vh] px-6 pb-6">
            <div className="flex flex-col items-center mb-2">
              <label
                className="text-blue-300 font-bold text-lg mb-1"
                htmlFor="debateSelect"
              >
                Debate Table
              </label>
              <select
                id="debateSelect"
                className="bg-blue-100 border-2 border-blue-700 rounded p-2 mb-2 w-48 text-center font-bold"
                value={showCustom ? "custom" : currentDebateId}
                onChange={handleTopicChange}
              >
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.text}
                  </option>
                ))}
                <option value="custom">Custom Topic...</option>
              </select>
              <div className="flex w-full items-center gap-2">
                {showCustom && (
                  <>
                    <input
                      id="customTopicInput"
                      type="text"
                      placeholder="Enter custom topic..."
                      className="bg-blue-50 border-2 border-blue-700 rounded p-2 mb-2 w-64 text-center font-bold"
                      maxLength={100}
                      value={customTopic}
                      onChange={handleCustomInput}
                      autoFocus
                    />
                    <button
                      id="addCustomTopicBtn"
                      className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-1 px-3 rounded-lg mb-2"
                      onClick={handleAddCustomTopic}
                    >
                      Add Topic
                    </button>
                  </>
                )}
              </div>
            </div>
            <div id="topicDisplay" className="debate-topic">
              {debateTopic}
            </div>
            {/* Debate Seats */}
            <div className="flex flex-row gap-2 items-center justify-center mb-2">
              <div id="seat1">
                {seat1 ? (
                  <img
                    src={`https://robohash.org/${seat1}?set=set5&size=48x48`}
                    title={participants[seat1]}
                    className="debate-seat"
                    alt={participants[seat1]}
                  />
                ) : (
                  <div className="debate-seat bg-gray-200 flex items-center justify-center text-blue-700 font-bold">
                    ?
                  </div>
                )}
              </div>
              <div id="seat2">
                {seat2 ? (
                  <img
                    src={`https://robohash.org/${seat2}?set=set5&size=48x48`}
                    title={participants[seat2]}
                    className="debate-seat"
                    alt={participants[seat2]}
                  />
                ) : (
                  <div className="debate-seat bg-gray-200 flex items-center justify-center text-blue-700 font-bold">
                    ?
                  </div>
                )}
              </div>
            </div>
            <div
              id="debateMessages"
              className="flex-1 overflow-y-auto bg-blue-50/80 rounded-lg p-4 mb-2 border-2 border-blue-600 shadow-inner"
              style={{ minHeight: "220px" }}
            >
              {loading && (
                <div className="text-center text-blue-400 italic my-2">
                  Loading arguments...
                </div>
              )}
              {messages.map((msg, idx) => {
                const isMine = user && msg.uid === user.uid;
                return (
                  <div key={msg.id || idx}>
                    <div
                      className={`debate-message-meta ${
                        isMine
                          ? "text-blue-700 text-right"
                          : "text-blue-900 text-left"
                      }`}
                    >
                      {msg.displayName || "Anonymous"}{" "}
                      <span className="text-blue-400">{msg.time || ""}</span>
                    </div>
                    <div
                      className={`debate-message-bubble${isMine ? " mine" : ""}`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}
            </div>
            <form
              id="debateMessageForm"
              className="flex items-center gap-2"
              onSubmit={handleSend}
            >
              <input
                id="debateMessageInput"
                type="text"
                required
                maxLength={240}
                className="flex-1 bg-white border-2 border-blue-600 rounded-lg p-2 focus:outline-none focus:ring-blue-800"
                placeholder="Type your argument..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button
                type="submit"
                className="bg-blue-700 hover:bg-blue-900 text-white font-bold py-2 px-4 rounded-lg shadow"
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>
      <p className="text-blue-200 mt-2 text-sm">
        The Pub &mdash; Grab a seat and debate 1-on-1!
      </p>
    </div>
  );
};

export default DebateTable;
