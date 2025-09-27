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
  // Profile and state variables
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
  const [loggedInUsername, setLoggedInUsername] = useState<string | null>(null);
  const [loggedInUid, setLoggedInUid] = useState<string | null>(null);
  const [viewedUsername, setViewedUsername] = useState<string | null>(
    getQueryParam("user")
  );
  const [viewedUid, setViewedUid] = useState<string | null>(null);
  const [viewedUser, setViewedUser] = useState<UserProfile | null>(null);
  const [ownProfile, setOwnProfile] = useState<boolean>(true);
  const [userNotFound, setUserNotFound] = useState<boolean>(false);

  // UI states
  const [profileError, setProfileError] = useState<string>("");
  const [currentTab, setCurrentTab] = useState<"wall" | "takes" | "teams">(
    "wall"
  );
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
  const [stats, setStats] = useState<{
    triviaAvg: string;
    playerAvg: string;
    collegeAvg: string;
  }>({ triviaAvg: "N/A", playerAvg: "N/A", collegeAvg: "N/A" });
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownUsers, setDropdownUsers] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);

  // Styling
  useEffect(() => {
    document.body.style.backgroundImage =
      "url('https://www.transparenttextures.com/patterns/wood-pattern.png'), linear-gradient(135deg, #26313d 0%, #4c2b16 100%)";
    document.body.style.backgroundSize = "400px, cover";
    document.body.style.backgroundRepeat = "repeat, no-repeat";
    document.body.style.backgroundAttachment = "fixed";
    document.body.style.minHeight = "100vh";
    document.body.style.fontFamily = "'Montserrat', sans-serif";
    return () => {
      document.body.style.backgroundImage = "";
      document.body.style.backgroundSize = "";
      document.body.style.backgroundRepeat = "";
      document.body.style.backgroundAttachment = "";
      document.body.style.minHeight = "";
      document.body.style.fontFamily = "";
    };
  }, []);

  // Auth logic and profile loading
  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setLoggedInUser(user);
      if (user) {
        setLoggedInUid(user.uid);
        const loggedInDoc = await getDoc(doc(db, "users", user.uid));
        setLoggedInUsername(loggedInDoc.data()?.username || null);

        // Load correct profile (own or viewed)
        if (viewedUsername && viewedUsername !== loggedInDoc.data()?.username) {
          const q = query(
            collection(db, "users"),
            where("username", "==", viewedUsername)
          );
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
            setViewedUid(userDoc.id);
            setViewedUser(userDoc.data() as UserProfile);
            setWallPosts(userDoc.data().wall || []);
            setTakes(userDoc.data().takes || []);
            setTeams(userDoc.data().teams || []);
          }
        } else {
          setOwnProfile(true);
          setViewedUid(user.uid);
          setViewedUser(loggedInDoc.data() as UserProfile);
          setWallPosts(loggedInDoc.data().wall || []);
          setTakes(loggedInDoc.data().takes || []);
          setTeams(loggedInDoc.data().teams || []);
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
    // eslint-disable-next-line
  }, [viewedUsername]);

  // Stats modal loading
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

  // Settings modal logic
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
    const q = query(
      collection(db, "users"),
      where("username", "==", newUsername.trim())
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      setUsernameError("That username is taken.");
      return;
    }
    if (loggedInUid) {
      await updateDoc(doc(db, "users", loggedInUid), {
        username: newUsername.trim(),
      });
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

  // Search logic
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
      allUsernames.filter((u) =>
        u.toLowerCase().includes(e.target.value.trim().toLowerCase())
      )
    );
  };
  const handleSearchBtn = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const allUsernames = await fetchAllUsernames();
    setSearchResults(
      allUsernames.filter((u) =>
        u.toLowerCase().includes(searchTerm.trim().toLowerCase())
      )
    );
  };
  const handleViewProfile = async (username: string) => {
    setSelectedProfile(username);
    setViewedUsername(username);
    setSearchResults([]);
  };

  // Wall, Takes, Teams update logic
  const updateViewedUserField = async (field: string, value: any) => {
    if (!viewedUid) return;
    try {
      await updateDoc(doc(db, "users", viewedUid), { [field]: value });
    } catch {
      setProfileError("Failed to post. Please try again.");
    }
  };

  // Wall render logic
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

  // Takes render logic
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

  // Teams render logic
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

  // Tab content renderer
  let tabContent;
  if (currentTab === "wall") {
    tabContent = (
      <div>
        <form className="post-form" id="wallForm" onSubmit={handleWallPost}>
          <input
            type="text"
            id="wallInput"
            placeholder={
              ownProfile
                ? "Post something on your wall..."
                : `Post something on ${viewedUser?.username}'s wall...`
            }
            maxLength={120}
          />
          <button type="submit">Post</button>
        </form>
        {!wallPosts.length && (
          <div style={{ color: "#aaa", textAlign: "center" }}>No posts yet.</div>
        )}
        {wallPosts
          .slice()
          .reverse()
          .map((post, idx) => (
            <div className="wall-post" key={idx}>
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
            <input
              type="text"
              id="takeInput"
              placeholder="Share your take..."
              maxLength={120}
            />
            <button type="submit">Add Take</button>
          </form>
        )}
        {!takes.length && (
          <div style={{ color: "#aaa", textAlign: "center" }}>No takes yet.</div>
        )}
        {takes
          .slice()
          .reverse()
          .map((take, i) => (
            <div className="my-take" key={i}>
              {take}
              {ownProfile && (
                <button
                  className="remove-btn"
                  onClick={() => handleRemoveTake(takes.length - 1 - i)}
                >
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
            <input
              type="text"
              id="teamNameInput"
              placeholder="Team name..."
              maxLength={60}
            />
            <button type="submit">Add Team</button>
          </form>
        )}
        {!teams.length && (
          <div style={{ color: "#aaa", textAlign: "center" }}>No teams yet.</div>
        )}
        {teams.map((team, i) => (
          <div className="team-card" key={i}>
            <span>{team.name}</span>
            {ownProfile && (
              <button
                className="remove-btn"
                onClick={() => handleRemoveTeam(i)}
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="pub-sign" id="pubTitle">
        {viewedUser ? `${viewedUser.username}'s Pub` : "Your Pub"}
      </div>
      <div className="search-bar-container">
        <input
          type="text"
          id="searchInput"
          autoComplete="off"
          placeholder="Search..."
          value={searchTerm}
          onChange={handleSearchInput}
          onFocus={handleSearchInput}
        />
        <button id="searchBtn" onClick={handleSearchBtn}>
          Search
        </button>
        {dropdownUsers.length > 0 && (
          <ul className="search-dropdown" style={{ display: "block" }}>
            {dropdownUsers.map((u) => (
              <li
                key={u}
                tabIndex={0}
                data-username={u}
                onMouseDown={() => handleViewProfile(u)}
              >
                {u}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div
        id="selectedProfileContainer"
        className="selected-profile-container"
        style={{ display: selectedProfile ? "" : "none" }}
      >
        <span className="selected-profile-label">Current Profile:</span>
        <span className="selected-profile-name">{selectedProfile}</span>
      </div>
      <div className="actions-bar">
        <button className="action-btn" id="statsBtn" onClick={() => { setStatsModalOpen(true); loadStats(); }}>
          My Stats
        </button>
        <button className="action-btn" id="settingsBtn" onClick={() => setSettingsModalOpen(true)}>
          Settings
        </button>
        <Link className="action-btn home-btn" id="homeBtn" href="/">
          Home
        </Link>
      </div>
      {searchResults.length > 0 && (
        <div id="searchResults" className="search-results" style={{ display: "" }}>
          {searchResults.map((user) => (
            <div className="user-result" key={user}>
              <span>@{user}</span>
              <button className="view-profile-btn" onClick={() => handleViewProfile(user)}>
                View Profile
              </button>
            </div>
          ))}
        </div>
      )}
      {profileError && (
        <div id="profileError" className="error-message" style={{ display: "" }}>
          {profileError}
        </div>
      )}

      <div className="tv-frame">
        <div className="tv-bezel">PubTV</div>
        <div className="flex flex-row justify-center gap-2 mb-0 pt-2 pb-1" id="tabBar">
          <button
            className={`tab-btn${currentTab === "wall" ? " active" : ""}`}
            data-tab="wall"
            onClick={() => setCurrentTab("wall")}
          >
            Wall
          </button>
          <button
            className={`tab-btn${currentTab === "takes" ? " active" : ""}`}
            data-tab="takes"
            onClick={() => setCurrentTab("takes")}
          >
            My Takes
          </button>
          <button
            className={`tab-btn${currentTab === "teams" ? " active" : ""}`}
            data-tab="teams"
            onClick={() => setCurrentTab("teams")}
          >
            My Teams
          </button>
        </div>
        <div className="tv-screen">
          <div className="tv-content" id="tabContent">
            {tabContent}
          </div>
        </div>
      </div>

      {/* Stats Modal */}
      {statsModalOpen && (
        <div className="modal-bg" id="statsModalBg" style={{ display: "flex" }}>
          <div className="modal" id="statsModal">
            <button className="close-btn" id="closeStatsBtn" onClick={() => setStatsModalOpen(false)}>
              Close
            </button>
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
        <div className="modal-bg" id="settingsModalBg" style={{ display: "flex" }}>
          <div className="modal" id="settingsModal">
            <button className="close-btn" id="closeSettingsBtn" onClick={() => setSettingsModalOpen(false)}>
              Close
            </button>
            <h2 style={{ marginBottom: "16px" }}>Settings</h2>
            {!editUsernameOpen && !editPasswordOpen && (
              <div className="settings-options" id="settingsOptions">
                <button className="settings-btn" id="editUsernameBtn" onClick={handleEditUsername}>
                  Change Username
                </button>
                <button className="settings-btn" id="editPasswordBtn" onClick={handleEditPassword}>
                  Change Password
                </button>
                <button className="settings-btn" id="signOutBtn" onClick={handleSignOut}>
                  Sign Out
                </button>
              </div>
            )}
            {editUsernameOpen && (
              <form id="usernameForm" onSubmit={handleUsernameSubmit}>
                <label htmlFor="newUsername">New Username</label>
                <input
                  type="text"
                  id="newUsername"
                  autoComplete="off"
                  style={{ width: "90%", padding: "7px", borderRadius: "6px" }}
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
                <button type="submit">Update Username</button>
                <div className="modal-error" id="usernameError">
                  {usernameError}
                </div>
              </form>
            )}
            {editPasswordOpen && (
              <form id="passwordForm" onSubmit={handlePasswordSubmit}>
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  autoComplete="off"
                  style={{ width: "90%", padding: "7px", borderRadius: "6px" }}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button type="submit">Update Password</button>
                <div className="modal-error" id="passwordError">
                  {passwordError}
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PubProfile;
