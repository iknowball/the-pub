"use client";
import React, { useEffect, useState } from "react";
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
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyBtsOBlh52YZagsLXp9_dcCq4qhkHBSWnU",
  authDomain: "thepub-sigma.firebaseapp.com",
  projectId: "thepub-sigma",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

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
  const [editAvatarOpen, setEditAvatarOpen] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [stats, setStats] = useState<{ triviaAvg: string; playerAvg: string; collegeAvg: string }>({
    triviaAvg: "N/A",
    playerAvg: "N/A",
    collegeAvg: "N/A",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownUsers, setDropdownUsers] = useState<string[]>([]);

  useEffect(() => {
    document.body.style.background = "linear-gradient(135deg, #181c23 0%, #2c2e36 100%)";
    document.body.style.fontFamily = "'Montserrat', 'Segoe UI', Arial, sans-serif";
    return () => {
      document.body.style.background = "";
      document.body.style.fontFamily = "";
    };
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setLoggedInUser(user);
      if (user) {
        setLoggedInUid(user.uid);
        const loggedInDoc = await getDoc(doc(db, "users", user.uid));
        setLoggedInUsername(loggedInDoc.data()?.username || null);
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

  useEffect(() => {
    if (!statsModalOpen) return;
    const loadStats = async () => {
      if (!viewedUid) {
        setStats({ triviaAvg: "N/A", playerAvg: "N/A", collegeAvg: "N/A" });
        return;
      }
      try {
        const [triviaDoc, playerDoc, collegeDoc] = await Promise.all([
          getDoc(doc(db, "triviaAverages", viewedUid)),
          getDoc(doc(db, "userAverages", viewedUid)),
          getDoc(doc(db, "collegeAverages", viewedUid)),
        ]);
        setStats({
          triviaAvg: triviaDoc.exists() && triviaDoc.data().averageScore != null ? Number(triviaDoc.data().averageScore).toFixed(2) : "N/A",
          playerAvg: playerDoc.exists() && playerDoc.data().averageScore != null ? Number(playerDoc.data().averageScore).toFixed(2) : "N/A",
          collegeAvg: collegeDoc.exists() && collegeDoc.data().averageScore != null ? Number(collegeDoc.data().averageScore).toFixed(2) : "N/A",
        });
      } catch {
        setStats({ triviaAvg: "N/A", playerAvg: "N/A", collegeAvg: "N/A" });
      }
    };
    loadStats();
  }, [statsModalOpen, viewedUid]);

  const handleSignOut = async () => {
    await signOut(auth);
    window.location.href = "/";
  };
  const handleEditUsername = () => {
    setEditUsernameOpen(true);
    setEditPasswordOpen(false);
    setEditAvatarOpen(false);
    setUsernameError("");
    setNewUsername("");
  };
  const handleEditPassword = () => {
    setEditPasswordOpen(true);
    setEditUsernameOpen(false);
    setEditAvatarOpen(false);
    setPasswordError("");
    setNewPassword("");
  };
  const handleEditAvatar = () => {
    setEditAvatarOpen(true);
    setEditUsernameOpen(false);
    setEditPasswordOpen(false);
    setAvatarError("");
  };
  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) {
      setUsernameError("Enter a username.");
      return;
    }
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

  const handleAvatarUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setAvatarError("");
    setAvatarUploading(true);
    const fileInput = document.getElementById("avatarFile") as HTMLInputElement;
    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
      setAvatarError("Please select an image file.");
      setAvatarUploading(false);
      return;
    }
    const file = fileInput.files[0];
    if (!file.type.startsWith("image/")) {
      setAvatarError("File must be an image.");
      setAvatarUploading(false);
      return;
    }
    try {
      if (loggedInUid) {
        const storageRef = ref(storage, `avatars/${loggedInUid}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        await updateDoc(doc(db, "users", loggedInUid), { avatar: url });
        setViewedUser((u) => u ? { ...u, avatar: url } : u);
        setAvatarError("Profile image updated!");
      }
    } catch (err: any) {
      setAvatarError("Failed to upload. Try a different file.");
    }
    setAvatarUploading(false);
  };

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
  const handleDropdownClick = (username: string) => {
    setViewedUsername(username);
    setDropdownUsers([]);
    setSearchTerm("");
  };

  const handleWallPost = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputEl = document.getElementById("wallInput") as HTMLInputElement;
    if (
      inputEl?.value.trim() &&
      loggedInUsername &&
      viewedUid
    ) {
      const newWall = [...wallPosts, { author: loggedInUsername, text: inputEl.value.trim() }];
      setWallPosts(newWall);
      await updateDoc(doc(db, "users", viewedUid), { wall: newWall });
      inputEl.value = "";
    }
  };

  const handleTakePost = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputEl = document.getElementById("takeInput") as HTMLInputElement;
    if (inputEl?.value.trim() && ownProfile) {
      const newTakes = [...takes, inputEl.value.trim()];
      setTakes(newTakes);
      await updateDoc(doc(db, "users", viewedUid!), { takes: newTakes });
      inputEl.value = "";
    }
  };
  const handleRemoveTake = async (idx: number) => {
    if (!ownProfile) return;
    const newTakes = takes.slice();
    newTakes.splice(idx, 1);
    setTakes(newTakes);
    await updateDoc(doc(db, "users", viewedUid!), { takes: newTakes });
  };

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputEl = document.getElementById("teamNameInput") as HTMLInputElement;
    if (inputEl?.value.trim() && ownProfile) {
      const newTeams = [...teams, { name: inputEl.value.trim() }];
      setTeams(newTeams);
      await updateDoc(doc(db, "users", viewedUid!), { teams: newTeams });
      inputEl.value = "";
    }
  };
  const handleRemoveTeam = async (idx: number) => {
    if (!ownProfile) return;
    const newTeams = teams.slice();
    newTeams.splice(idx, 1);
    setTeams(newTeams);
    await updateDoc(doc(db, "users", viewedUid!), { teams: newTeams });
  };

  // --- TABS CONTENT ---
  let tabContent;
  if (currentTab === "wall") {
    tabContent = (
      <div>
        <form className="post-form" id="wallForm" onSubmit={handleWallPost}>
          <input type="text" id="wallInput" placeholder="Post something on the wall..." maxLength={120} />
          <button type="submit">Post</button>
        </form>
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
        {!takes.length && <div className="empty-msg">No takes yet.</div>}
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
        {!teams.length && <div className="empty-msg">No teams yet.</div>}
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
          background: linear-gradient(135deg, #181c23 0%, #2c2e36 100%);
        }
        .profile-card {
          background: #222936;
          box-shadow: 0 8px 40px 8px #000d2f44;
          border-radius: 2rem;
          max-width: 560px;
          width: 100%;
          padding: 2.7rem 2rem;
          margin: 1rem;
          border: 3px solid #e1b40c;
          position: relative;
        }
        .profile-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .profile-avatar {
          width: 110px;
          height: 110px;
          border-radius: 50%;
          object-fit: cover;
          box-shadow: 0 2px 18px #e1b40c66;
          border: 3.5px solid #e1b40c;
          margin-bottom: 1rem;
          background: #fffbe3;
        }
        .profile-username {
          font-size: 2.2rem;
          font-weight: bold;
          color: #ffe146;
          margin-bottom: 0.25rem;
          letter-spacing: 1px;
          text-shadow: 1px 2px 7px #000c;
        }
        .profile-email {
          font-size: 1rem;
          color: #ffc107b5;
          margin-bottom: 1.4rem;
        }
        .profile-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-bottom: 1.8rem;
        }
        .profile-btn {
          background: linear-gradient(90deg, #e1b40c 50%, #f8be37 100%);
          color: #222936;
          font-weight: bold;
          border-radius: 1rem;
          border: 2px solid #ffe146;
          padding: 0.65rem 1.2rem;
          transition: background 0.16s, color 0.14s, transform 0.14s;
          box-shadow: 0 2px 12px #ffe14644;
          text-shadow: 0 1px 5px #fffac0;
        }
        .profile-btn:hover {
          background: #fffbe3;
          color: #b28704;
          transform: scale(1.06);
        }
        .profile-tabs {
          display: flex;
          gap: 1.2rem;
          justify-content: center;
          margin-bottom: 1.7rem;
        }
        .tab-btn {
          background: transparent;
          border: none;
          font-size: 1.19rem;
          font-weight: 600;
          color: #ffe146a8;
          padding: 0.48rem 1.05rem;
          border-radius: 0.8rem 0.8rem 0 0;
          cursor: pointer;
          transition: background 0.19s, color 0.14s;
          border-bottom: 3px solid transparent;
          letter-spacing: 0.5px;
        }
        .tab-btn.active {
          background: #ffe14618;
          color: #ffe146;
          font-weight: bold;
          border-bottom: 3px solid #ffe146;
        }
        .tab-content {
          margin-bottom: 1.2rem;
        }
        .wall-post-card, .take-card, .team-card {
          background: linear-gradient(90deg, #222936 75%, #ffe1461a 100%);
          border-radius: 1.1rem;
          padding: 1rem 1.1rem;
          margin-bottom: 0.8rem;
          box-shadow: 0 2px 10px #ffe14628;
          font-size: 1.11rem;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #fffbe3;
        }
        .wall-post-author {
          font-weight: bold;
          color: #ffe146;
          margin-right: 0.6rem;
        }
        .remove-btn {
          background: #ffe146;
          color: #222936;
          font-size: 0.98rem;
          border: none;
          border-radius: 0.8rem;
          padding: 0.3rem 0.8rem;
          font-weight: bold;
          cursor: pointer;
          margin-left: 1rem;
          box-shadow: 0 1px 4px #ffe14644;
        }
        .remove-btn:hover {
          background: #fffbe3;
        }
        .post-form, .take-form, .team-form {
          display: flex;
          gap: 0.7rem;
          margin-bottom: 1rem;
        }
        .post-form input, .take-form input, .team-form input {
          flex: 1;
          padding: 0.7rem 1rem;
          border: 1.5px solid #ffe146;
          border-radius: 0.9rem;
          font-size: 1rem;
          background: #181c23;
          color: #ffe146;
        }
        .post-form button, .take-form button, .team-form button {
          background: #ffe146;
          color: #222936;
          font-weight: bold;
          border-radius: 0.9rem;
          border: none;
          padding: 0.7rem 1.1rem;
          font-size: 1rem;
          cursor: pointer;
        }
        .post-form button:hover, .take-form button:hover, .team-form button:hover {
          background: #fffbe3;
        }
        .empty-msg {
          color: #ffe146a0;
          text-align: center;
          font-size: 1.1rem;
          margin-top: 0.7rem;
        }
        .modal-bg {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(40, 42, 46, 0.42);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal {
          background: #222936;
          border-radius: 1.3rem;
          padding: 1.8rem 2.2rem;
          box-shadow: 0 8px 36px 0 #ffe14633;
          min-width: 320px;
          max-width: 90vw;
          position: relative;
          border: 3px solid #ffe146;
          color: #ffe146;
        }
        .close-btn {
          position: absolute;
          right: 1.3rem;
          top: 1.3rem;
          background: #ffe146;
          color: #222936;
          border: none;
          border-radius: 1rem;
          font-weight: bold;
          font-size: 1rem;
          padding: 0.4rem 1rem;
          cursor: pointer;
          box-shadow: 0 1px 4px #ffe14644;
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
          background: #ffe146;
          color: #222936;
          font-weight: bold;
          border-radius: 1rem;
          border: 2px solid #ffe146;
          padding: 0.65rem 1.2rem;
          transition: background 0.16s, color 0.14s, transform 0.13s;
          box-shadow: 0 2px 12px #ffe14644;
        }
        .settings-btn:hover {
          background: #fffbe3;
          color: #b28704;
          transform: scale(1.04);
        }
        .modal-error {
          color: #ff6868;
          font-size: 0.98rem;
          margin-top: 0.4rem;
        }
        label {
          color: #ffe146b0;
          font-weight: 500;
        }
        input[type="file"]::-webkit-file-upload-button {
          background: #ffe146;
          color: #222936;
          font-weight: bold;
          border-radius: 0.55rem;
          border: none;
          font-size: 1rem;
          padding: 0.5rem 1.1rem;
          cursor: pointer;
        }
        /* --- SEARCH BAR --- */
        .search-users-bar {
          width: 260px;
          max-width: 80vw;
          display: block;
          margin: 0 auto 0.6rem auto;
          padding: 0.5rem 1rem;
          border-radius: 0.7rem;
          border: 2px solid #ffe146;
          font-size: 1rem;
          background: #181c23;
          color: #ffe146;
          box-sizing: border-box;
          transition: box-shadow 0.14s;
          box-shadow: 0 2px 12px #ffe14611;
        }
        @media (max-width: 600px) {
          .profile-card { padding: 1.2rem 0.3rem; }
          .modal { padding: 1.2rem 0.7rem; }
          .search-users-bar {
            width: 96vw;
            font-size: 0.99rem;
            padding: 0.5rem 0.6rem;
            margin-bottom: 0.6rem;
          }
        }
      `}</style>
      <div className="profile-card">
        {/* --- SEARCH BAR --- */}
        <div style={{ marginBottom: "1.2rem", position: "relative", zIndex: 20, display: "flex", justifyContent: "center" }}>
          <input
            type="text"
            className="search-users-bar"
            placeholder="Search for users..."
            value={searchTerm}
            onChange={handleSearchInput}
            autoComplete="off"
            style={{
              marginBottom: dropdownUsers.length ? 0 : "1.2rem"
            }}
          />
          {/* Dropdown */}
          {dropdownUsers.length > 0 && (
            <div
              style={{
                background: "#222936",
                border: "2px solid #ffe146",
                borderTop: "none",
                borderRadius: "0 0 0.7rem 0.7rem",
                boxShadow: "0 4px 20px #ffe14622",
                position: "absolute",
                zIndex: 100,
                width: "100%",
                maxWidth: "260px",
                left: "50%",
                transform: "translateX(-50%)",
                maxHeight: "210px",
                overflowY: "auto"
              }}
            >
              {dropdownUsers.map((username, idx) => (
                <div
                  key={username}
                  style={{
                    padding: "0.65rem 1rem",
                    color: "#ffe146",
                    fontWeight: 500,
                    cursor: "pointer",
                    background: idx % 2 === 0 ? "#181c23" : "#222936"
                  }}
                  onClick={() => handleDropdownClick(username)}
                >
                  {username}
                </div>
              ))}
            </div>
          )}
        </div>
        {/* --- Profile Content --- */}
        <div className="profile-header">
          <img
            className="profile-avatar"
            src={viewedUser?.avatar || "https://robohash.org/" + (viewedUser?.username || "anon") + "?set=set5&size=100x100"}
            alt="User avatar"
          />
          <div className="profile-username">{viewedUser?.username || loggedInUsername || "Anonymous"}</div>
        </div>
        <div className="profile-actions">
          <button className="profile-btn" onClick={() => setStatsModalOpen(true)}>
            <span role="img" aria-label="stats">📊</span> Stats
          </button>
          {ownProfile && (
            <button className="profile-btn" onClick={() => setSettingsModalOpen(true)}>
              <span role="img" aria-label="settings">⚙️</span> Settings
            </button>
          )}
          <Link className="profile-btn" href="/">
            <span role="img" aria-label="home">🏠</span> Home
          </Link>
        </div>
        <div className="profile-tabs">
          <button className={`tab-btn${currentTab === "wall" ? " active" : ""}`} onClick={() => setCurrentTab("wall")}>
            <span role="img" aria-label="wall">📝</span> Wall
          </button>
          <button className={`tab-btn${currentTab === "takes" ? " active" : ""}`} onClick={() => setCurrentTab("takes")}>
            <span role="img" aria-label="takes">🔥</span> Takes
          </button>
          <button className={`tab-btn${currentTab === "teams" ? " active" : ""}`} onClick={() => setCurrentTab("teams")}>
            <span role="img" aria-label="teams">🏈</span> Teams
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
            <h2 style={{ marginBottom: "16px" }}><span role="img" aria-label="stats">📊</span> My Stats</h2>
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
            <h2 style={{ marginBottom: "16px" }}><span role="img" aria-label="settings">⚙️</span> Settings</h2>
            {!editUsernameOpen && !editPasswordOpen && !editAvatarOpen && (
              <div className="settings-options">
                <button className="settings-btn" onClick={handleEditUsername}>
                  Change Username
                </button>
                <button className="settings-btn" onClick={handleEditPassword}>
                  Change Password
                </button>
                <button className="settings-btn" onClick={handleEditAvatar}>
                  Change Profile Image
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
            {editAvatarOpen && (
              <form onSubmit={handleAvatarUpload}>
                <label htmlFor="avatarFile">Upload Profile Image</label>
                <input
                  type="file"
                  accept="image/*"
                  id="avatarFile"
                  style={{ width: "90%", padding: "7px", borderRadius: "6px", background: "#222936", color: "#ffe146" }}
                  disabled={avatarUploading}
                />
                <button
                  type="submit"
                  className="settings-btn"
                  style={{ marginTop: "0.7rem", opacity: avatarUploading ? 0.7 : 1 }}
                  disabled={avatarUploading}
                >
                  {avatarUploading ? "Uploading..." : "Update Image"}
                </button>
                <div className="modal-error">{avatarError}</div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PubProfile;
