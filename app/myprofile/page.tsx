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

// --- EMAIL NOTIFICATION FUNCTION ---
async function sendWallPostEmail(toEmail: string, postAuthor: string, postText: string, userName: string) {
  try {
    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: toEmail,
        subject: `New Wall Post from ${postAuthor}`,
        text: `Hi,\n\n${postAuthor} posted on your wall:\n\n"${postText}"\n\nLog in to see your wall: https://thepub-sigma.web.app/profile?user=${userName}`,
      }),
    });
  } catch (err) {}
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

  // --- EMAIL NOTIFICATION ON WALL POST ---
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
      // Send email if profile owner has an email address
      if (viewedUser?.email && viewedUser?.username) {
        await sendWallPostEmail(viewedUser.email, loggedInUsername, inputEl.value.trim(), viewedUser.username);
      }
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
      {/* ...CSS styles as before... */}
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
      {/* ...other modals unchanged... */}
    </div>
  );
};

export default PubProfile;
