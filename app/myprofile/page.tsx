"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  updatePassword,
  User,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

// FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyBtsOBlh52YZagsLXp9_dcCq4qhkHBSWnU",
  authDomain: "thepub-sigma.firebaseapp.com",
  projectId: "thepub-sigma",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Helper: get ?user=username from URL
function getQueryParam(name: string) {
  if (typeof window === "undefined") return null;
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

type WallPost = { author: string; text: string };
type Team = { name: string };
type UserProfile = {
  username: string;
  avatar?: string;
  email?: string;
  wall?: WallPost[];
  takes?: string[];
  teams?: Team[];
};

const PubProfile: React.FC = () => {
  // STATE
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
  const [loggedInUsername, setLoggedInUsername] = useState<string | null>(null);
  const [loggedInUid, setLoggedInUid] = useState<string | null>(null);
  const [viewedUsername, setViewedUsername] = useState<string | null>(getQueryParam("user"));
  const [viewedUid, setViewedUid] = useState<string | null>(null);
  const [viewedUser, setViewedUser] = useState<UserProfile | null>(null);
  const [ownProfile, setOwnProfile] = useState<boolean>(true);
  const [userNotFound, setUserNotFound] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string>("");
  const [currentTab, setCurrentTab] = useState<"wall" | "takes" | "teams">("wall");
  const [wallPosts, setWallPosts] = useState<WallPost[]>([]);
  const [takes, setTakes] = useState<string[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [editUsernameOpen, setEditUsernameOpen] = useState(false);
  const [editPasswordOpen, setEditPasswordOpen] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [stats, setStats] = useState<{ triviaAvg: string; playerAvg: string; collegeAvg: string }>({
    triviaAvg: "N/A",
    playerAvg: "N/A",
    collegeAvg: "N/A",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownUsers, setDropdownUsers] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);

  // STYLING
  useEffect(() => {
    document.body.style.background = "linear-gradient(135deg, #f3f4fa 0%, #e9e5e0 100%)";
    document.body.style.fontFamily = "'Montserrat', 'Segoe UI', Arial, sans-serif";
    return () => {
      document.body.style.background = "";
      document.body.style.fontFamily = "";
    };
  }, []);

  // AUTH AND PROFILE LOADING
  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setLoggedInUser(user);
      if (user) {
        setLoggedInUid(user.uid);
        const loggedInDoc = await getDoc(doc(db, "users", user.uid));
        setLoggedInUsername(loggedInDoc.data()?.username || null);
        // Load correct profile (own or viewed)
        if (viewedUsername && viewedUsername !== loggedInDoc.data()?.username) {
          const q = query(collection(db, "users"), where("username", "==", viewedUsername));
          const snap = await getDocs(q);
          if (snap.empty) {
            setProfileError(`User "${viewedUsername}" not found.`);
            setUserNotFound(true);
            setViewedUser(null);
            setViewedUid(null);
            return;
          } else {
            setOwnProfile(false);
            const userDoc = snap.docs[0];
            const data = userDoc.data();
            setViewedUid(userDoc.id);
            setViewedUser(data as UserProfile);
            setWallPosts(data?.wall ?? []);
            setTakes(data?.takes ?? []);
            setTeams(data?.teams ?? []);
          }
        } else {
          setOwnProfile(true);
          setViewedUid(user.uid);
          const data = loggedInDoc.data();
          setViewedUser(data as UserProfile);
          setWallPosts(data?.wall ?? []);
          setTakes(data?.takes ?? []);
          setTeams(data?.teams ?? []);
        }
        setProfileError("");
        setUserNotFound(false);
      } else {
        setProfileError("Please log in to view profiles.");
        setViewedUser(null);
        setUserNotFound(true);
        setViewedUid(null);
      }
    });
  }, [viewedUsername]);

  // STATS MODAL LOADING
  const loadStats = async () => {
    if (!viewedUid) return setStats({ triviaAvg: "N/A", playerAvg: "N/A", collegeAvg: "N/A" });
    let triviaAvg = "N/A";
    let playerAvg = "N/A";
    let collegeAvg = "N/A";
    try {
      const triviaDoc = await getDoc(doc(db, "triviaAverages", viewedUid));
      if (triviaDoc.exists()) triviaAvg = (triviaDoc.data().averageScore ?? "N/A").toFixed(2);
      const userAvgDoc = await getDoc(doc(db, "userAverages", viewedUid));
      if (userAvgDoc.exists()) playerAvg = (userAvgDoc.data().averageScore ?? "N/A").toFixed(2);
      const collegeDoc = await getDoc(doc(db, "collegeAverages", viewedUid));
      if (collegeDoc.exists()) collegeAvg = (collegeDoc.data().averageScore ?? "N/A").toFixed(2);
      setStats({ triviaAvg, playerAvg, collegeAvg });
    } catch {
      setStats({ triviaAvg: "N/A", playerAvg: "N/A", collegeAvg: "N/A" });
    }
  };

  // SETTINGS MODAL LOGIC
  const handleSignOut = async () => {
    await signOut(auth);
    window.location.href = "/";
  };
  const handleEditUsername = () => {
    setEditUsernameOpen(true);
    setEditPasswordOpen(false);
    setUsernameError("");
    setNewUsername("");
  };
  const handleEditPassword = () => {
    setEditPasswordOpen(true);
    setEditUsernameOpen(false);
    setPasswordError("");
    setNewPassword("");
  };
  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) {
      setUsernameError("Enter a username.");
      return;
    }
    // Check if username taken
    const q = query(collection(db, "users"), where("username", "==", newUsername.trim()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      setUsernameError("That username is taken.");
      return;
    }
    if (loggedInUid) {
      await updateDoc(doc(db, "users", loggedInUid), { username: newUsername.trim() });
      setLoggedInUsername(newUsername.trim());
      setUsernameError("Updated!");
      setViewedUsername(newUsername.trim());
      setOwnProfile(true);
    }
  };
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    if (auth.currentUser) {
      try {
        await updatePassword(auth.currentUser, newPassword.trim());
        setPasswordError("Password updated!");
      } catch (err: any) {
        setPasswordError(err.message || "Error updating password.");
      }
    } else {
      setPasswordError("Not signed in.");
    }
  };

  // SEARCH LOGIC
  const fetchAllUsernames = async () => {
    const snapshot = await getDocs(collection(db, "users"));
    return snapshot.docs.map((doc) => doc.data().username as string);
  };
  const handleSearchInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!e.target.value.trim()) {
      setDropdownUsers([]);
      return;
    }
    const allUsernames = await fetchAllUsernames();
    setDropdownUsers(
      allUsernames.filter((u) => u.toLowerCase().includes(e.target.value.trim().toLowerCase()))
    );
  };
  const handleSearchBtn = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const allUsernames = await fetchAllUsernames();
    setSearchResults(
      allUsernames.filter((u) => u.toLowerCase().includes(searchTerm.trim().toLowerCase()))
    );
  };
  const handleViewProfile = async (username: string) => {
    setSelectedProfile(username);
    setViewedUsername(username);
    setSearchResults([]);
  };

  // UPDATE LOGIC
  const updateViewedUserField = async (field: string, value: any) => {
    if (!viewedUid) return;
    try {
      await updateDoc(doc(db, "users", viewedUid), { [field]: value });
    } catch {
      setProfileError("Failed to post. Please try again.");
    }
  };
  // WALL
  const handleWallPost = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputEl = document.getElementById("wallInput") as HTMLInputElement;
    if (inputEl?.value.trim() && loggedInUsername) {
      const newWall = [...wallPosts, { author: loggedInUsername, text: inputEl.value.trim() }];
      setWallPosts(newWall);
      await updateViewedUserField("wall", newWall);
      inputEl.value = "";
    }
  };
  // TAKES
  const handleTakePost = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputEl = document.getElementById("takeInput") as HTMLInputElement;
    if (inputEl?.value.trim()) {
      const newTakes = [...takes, inputEl.value.trim()];
      setTakes(newTakes);
      await updateViewedUserField("takes", newTakes);
      inputEl.value = "";
    }
  };
  const handleRemoveTake = async (idx: number) => {
    const newTakes = takes.slice();
    newTakes.splice(idx, 1);
    setTakes(newTakes);
    await updateViewedUserField("takes", newTakes);
  };
  // TEAMS
  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputEl = document.getElementById("teamNameInput") as HTMLInputElement;
    if (inputEl?.value.trim()) {
      const newTeams = [...teams, { name: inputEl.value.trim() }];
      setTeams(newTeams);
      await updateViewedUserField("teams", newTeams);
      inputEl.value = "";
    }
  };
  const handleRemoveTeam = async (idx: number) => {
    const newTeams = teams.slice();
    newTeams.splice(idx, 1);
    setTeams(newTeams);
    await updateViewedUserField("teams", newTeams);
  };

  // TAB CONTENT
  let tabContent;
  if (currentTab === "wall") {
    tabContent = (
      <div>
        {ownProfile && (
          <form className="post-form" id="wallForm" onSubmit={handleWallPost}>
            <input type="text" id="wallInput" placeholder="Post something on your wall..." maxLength={120} />
            <button type="submit">Post</button>
          </form>
        )}
        {!wallPosts.length && (
          <div className="empty-msg">No posts yet.</div>
        )}
        {wallPosts.slice().reverse().map((post, idx) => (
          <div className="wall-post-card" key={idx}>
            <span className="wall-post-author">{post.author}</span>
            {post.text}
          </div>
        ))}
      </div>
    );
  }
  if (currentTab === "takes") {
    tabContent = (
      <div>
        {ownProfile && (
          <form className="take-form" id="takeForm" onSubmit={handleTakePost}>
            <input type="text" id="takeInput" placeholder="Share your take..." maxLength={120} />
            <button type="submit">Add Take</button>
          </form>
        )}
        {!takes.length && (
          <div className="empty-msg">No takes yet.</div>
        )}
        {takes.slice().reverse().map((take, i) => (
          <div className="take-card" key={i}>
            {take}
            {ownProfile && (
              <button className="remove-btn" onClick={() => handleRemoveTake(takes.length - 1 - i)}>
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    );
  }
  if (currentTab === "teams") {
    tabContent = (
      <div>
        {ownProfile && (
          <form className="team-form" id="teamForm" onSubmit={handleAddTeam}>
            <input type="text" id="teamNameInput" placeholder="Team name..." maxLength={60} />
            <button type="submit">Add Team</button>
          </form>
        )}
        {!teams.length && (
          <div className="empty-msg">No teams yet.</div>
        )}
        {teams.map((team, i) => (
          <div className="team-card" key={i}>
            <span>{team.name}</span>
            {ownProfile && (
              <button className="remove-btn" onClick={() => handleRemoveTeam(i)}>
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="profile-bg min-h-screen flex justify-center items-center py-10">
      <style>{`
        .profile-bg {
          min-height: 100vh;
          background: linear-gradient(135deg, #f3f4fa 0%, #e9e5e0 100%);
        }
        .profile-card {
          background: #fff;
          box-shadow: 0 6px 32px rgba(76,52,23,0.15);
          border-radius: 2rem;
          max-width: 520px;
          width: 100%;
          padding: 2.5rem 2rem;
          margin: 1rem;
        }
        .profile-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .profile-avatar {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          object-fit: cover;
          box-shadow: 0 2px 14px rgba(76,52,23,0.08);
          border: 2.5px solid #a97c50;
          margin-bottom: 1rem;
          background: #f3f4fa;
        }
        .profile-username {
          font-size: 2.1rem;
          font-weight: bold;
          color: #2b2b2b;
          margin-bottom: 0.25rem;
        }
        .profile-email {
          font-size: 1rem;
          color: #a3927b;
          margin-bottom: 1.5rem;
        }
        .profile-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-bottom: 1.8rem;
        }
        .profile-btn {
          background: #f3e7cf;
          color: #3a2c18;
          font-weight: bold;
          border-radius: 1rem;
          border: 2px solid #d9b16e;
          padding: 0.65rem 1.2rem;
          transition: background 0.18s, color 0.18s, transform 0.14s;
          box-shadow: 0 2px 12px #a3927b22;
        }
        .profile-btn:hover {
          background: #ffe6a3;
          color: #7b5625;
          transform: scale(1.04);
        }
        .profile-tabs {
          display: flex;
          gap: 1.2rem;
          justify-content: center;
          margin-bottom: 1.8rem;
        }
        .tab-btn {
          background: transparent;
          border: none;
          font-size: 1.14rem;
          font-weight: 500;
          color: #a3927b;
          padding: 0.5rem 1rem;
          border-radius: 0.8rem;
          cursor: pointer;
          transition: background 0.18s, color 0.14s;
        }
        .tab-btn.active {
          background: #ffe6a3;
          color: #7b5625;
          font-weight: bold;
        }
        .tab-content {
          margin-bottom: 1.2rem;
        }
        .wall-post-card, .take-card, .team-card {
          background: #f8f7f4;
          border-radius: 1.1rem;
          padding: 1rem 1.1rem;
          margin-bottom: 0.8rem;
          box-shadow: 0 2px 8px #a3927b13;
          font-size: 1.08rem;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .wall-post-author {
          font-weight: bold;
          color: #a97c50;
          margin-right: 0.6rem;
        }
        .remove-btn {
          background: #ffe6a3;
          color: #7b5625;
          font-size: 0.98rem;
          border: none;
          border-radius: 0.8rem;
          padding: 0.3rem 0.8rem;
          font-weight: bold;
          cursor: pointer;
          margin-left: 1rem;
        }
        .remove-btn:hover {
          background: #f3e7cf;
        }
        .post-form, .take-form, .team-form {
          display: flex;
          gap: 0.7rem;
          margin-bottom: 1rem;
        }
        .post-form input, .take-form input, .team-form input {
          flex: 1;
          padding: 0.7rem 1rem;
          border: 1.5px solid #d9b16e;
          border-radius: 0.9rem;
          font-size: 1rem;
          background: #f8f7f4;
        }
        .post-form button, .take-form button, .team-form button {
          background: #ffe6a3;
          color: #7b5625;
          font-weight: bold;
          border-radius: 0.9rem;
          border: none;
          padding: 0.7rem 1.1rem;
          font-size: 1rem;
          cursor: pointer;
        }
        .post-form button:hover, .take-form button:hover, .team-form button:hover {
          background: #f3e7cf;
        }
        .empty-msg {
          color: #cfcfcf;
          text-align: center;
          font-size: 1.1rem;
          margin-top: 0.7rem;
        }
        .modal-bg {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(40, 42, 46, 0.23);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal {
          background: #fff;
          border-radius: 1.3rem;
          padding: 1.8rem 2.2rem;
          box-shadow: 0 8px 36px 0 rgba(76,52,23,0.15);
          min-width: 320px;
          max-width: 90vw;
          position: relative;
        }
        .close-btn {
          position: absolute;
          right: 1.3rem;
          top: 1.3rem;
          background: #ffe6a3;
          color: #7b5625;
          border: none;
          border-radius: 1rem;
          font-weight: bold;
          font-size: 1rem;
          padding: 0.4rem 1rem;
          cursor: pointer;
        }
        .modal-list div {
          margin-bottom: 0.9rem;
        }
        .settings-options {
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
        }
        .settings-btn {
          background: #f3e7cf;
          color: #3a2c18;
          font-weight: bold;
          border-radius: 1rem;
          border: 2px solid #d9b16e;
          padding: 0.65rem 1.2rem;
          transition: background 0.18s, color 0.18s, transform 0.14s;
          box-shadow: 0 2px 12px #a3927b22;
        }
        .settings-btn:hover {
          background: #ffe6a3;
          color: #7b5625;
          transform: scale(1.04);
        }
        .modal-error {
          color: #a97c50;
          font-size: 0.98rem;
          margin-top: 0.4rem;
        }
        @media (max-width: 600px) {
          .profile-card { padding: 1.2rem 0.3rem; }
          .modal { padding: 1.2rem 0.7rem; }
        }
      `}</style>
      <div className="profile-card">
        <div className="profile-header">
          <img
            className="profile-avatar"
            src={viewedUser?.avatar || "https://robohash.org/" + (viewedUser?.username || "anon") + "?set=set5&size=100x100"}
            alt="User avatar"
          />
          <div className="profile-username">{viewedUser?.username || loggedInUsername || "Anonymous"}</div>
          <div className="profile-email">{viewedUser?.email || loggedInUser?.email || ""}</div>
        </div>
        <div className="profile-actions">
          <button className="profile-btn" onClick={() => { setStatsModalOpen(true); loadStats(); }}>
            Stats
          </button>
          {ownProfile && (
            <button className="profile-btn" onClick={() => setSettingsModalOpen(true)}>
              Settings
            </button>
          )}
          <Link className="profile-btn" href="/">
            Home
          </Link>
        </div>
        <div className="profile-tabs">
          <button className={`tab-btn${currentTab === "wall" ? " active" : ""}`} onClick={() => setCurrentTab("wall")}>
            Wall
          </button>
          <button className={`tab-btn${currentTab === "takes" ? " active" : ""}`} onClick={() => setCurrentTab("takes")}>
            Takes
          </button>
          <button className={`tab-btn${currentTab === "teams" ? " active" : ""}`} onClick={() => setCurrentTab("teams")}>
            Teams
          </button>
        </div>
        <div className="tab-content">{tabContent}</div>
        {profileError && <div className="empty-msg">{profileError}</div>}
      </div>

      {/* Stats Modal */}
      {statsModalOpen && (
        <div className="modal-bg">
          <div className="modal">
            <button className="close-btn" onClick={() => setStatsModalOpen(false)}>Close</button>
            <h2 style={{ marginBottom: "16px" }}>My Stats</h2>
            <div id="statsContent">
              <div className="modal-list">
                <div>
                  <strong>Trivia Avg:</strong> {stats.triviaAvg}
                </div>
                <div>
                  <strong>Name the Player Avg:</strong> {stats.playerAvg}
                </div>
                <div>
                  <strong>College Avg:</strong> {stats.collegeAvg}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {settingsModalOpen && (
        <div className="modal-bg">
          <div className="modal">
            <button className="close-btn" onClick={() => setSettingsModalOpen(false)}>Close</button>
            <h2 style={{ marginBottom: "16px" }}>Settings</h2>
            {!editUsernameOpen && !editPasswordOpen && (
              <div className="settings-options">
                <button className="settings-btn" onClick={handleEditUsername}>
                  Change Username
                </button>
                <button className="settings-btn" onClick={handleEditPassword}>
                  Change Password
                </button>
                <button className="settings-btn" onClick={handleSignOut}>
                  Sign Out
                </button>
              </div>
            )}
            {editUsernameOpen && (
              <form onSubmit={handleUsernameSubmit}>
                <label htmlFor="newUsername">New Username</label>
                <input
                  type="text"
                  id="newUsername"
                  autoComplete="off"
                  style={{ width: "90%", padding: "7px", borderRadius: "6px" }}
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
                <button type="submit" className="settings-btn" style={{ marginTop: "0.7rem" }}>Update Username</button>
                <div className="modal-error">{usernameError}</div>
              </form>
            )}
            {editPasswordOpen && (
              <form onSubmit={handlePasswordSubmit}>
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  autoComplete="off"
                  style={{ width: "90%", padding: "7px", borderRadius: "6px" }}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button type="submit" className="settings-btn" style={{ marginTop: "0.7rem" }}>Update Password</button>
                <div className="modal-error">{passwordError}</div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PubProfile;
