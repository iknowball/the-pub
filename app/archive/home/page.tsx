"use client";

import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBtsOBlh52YZagsLXp9_dcCq4qhkHBSWnU",
  authDomain: "thepub-sigma.firebaseapp.com",
  projectId: "thepub-sigma",
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

interface UserData {
  username?: string;
  email?: string;
  avatar?: string;
  provider?: string;
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<firebase.User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupMsg, setSignupMsg] = useState('');

  useEffect(() => {
    document.body.style.backgroundImage =
      "url('https://awolvision.com/cdn/shop/articles/sports_bar_awolvision.jpg?v=1713302733&width=1500')";
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundAttachment = "fixed";
    document.body.style.backgroundColor = "#451a03";
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

  useEffect(() => {
    const unsubscribe = firebase.auth().onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        const userRef = db.collection('users').doc(user.uid);
        const doc = await userRef.get();
        if (!doc.exists || !doc.data()?.username) {
          let uname = '';
          while (!uname || uname.length < 2) {
            uname = prompt('Create a username for your account:') || '';
            if (uname === null) break;
          }
          if (uname) {
            await userRef.set(
              {
                username: uname,
                avatar: user.photoURL || '',
                email: user.email,
                provider: user.providerData[0]?.providerId || 'google',
              },
              { merge: true }
            );
          }
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleUserBtnClick = () => {
    if (currentUser) {
      window.location.href = 'myprofile';
    } else {
      setIsModalOpen(true);
      setSignupMsg('');
      setSignupEmail('');
      setSignupPassword('');
      setSignupUsername('');
      setLoginEmail('');
      setLoginPassword('');
    }
  };

  const closeModal = () => setIsModalOpen(false);

  const handleModalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) setIsModalOpen(false);
  };

  const handleSignup = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setSignupMsg('');
    if (!signupUsername || signupUsername.length < 2) {
      setSignupMsg('Username must be at least 2 characters.');
      return;
    }
    try {
      const cred = await firebase.auth().createUserWithEmailAndPassword(signupEmail, signupPassword);
      await db.collection('users').doc(cred.user!.uid).set(
        {
          username: signupUsername,
          email: signupEmail,
          avatar: '',
          provider: 'password',
        },
        { merge: true }
      );
      setSignupMsg('Account created successfully!');
      setTimeout(() => setIsModalOpen(false), 1000);
    } catch (err: any) {
      setSignupMsg(err.message);
    }
  };

  const handleLogin = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setSignupMsg('');
    try {
      await firebase.auth().signInWithEmailAndPassword(loginEmail, loginPassword);
      setSignupMsg('Logged in successfully!');
      setTimeout(() => setIsModalOpen(false), 1000);
    } catch (err: any) {
      setSignupMsg(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const result = await firebase.auth().signInWithPopup(provider);
      const user = result.user;
      if (user) {
        const userRef = db.collection('users').doc(user.uid);
        const doc = await userRef.get();
        if (!doc.exists || !doc.data()?.username) {
          let uname = '';
          while (!uname || uname.length < 2) {
            uname = prompt('Create a username for your account:') || '';
            if (uname === null) break;
          }
          if (uname) {
            await userRef.set(
              {
                username: uname,
                avatar: user.photoURL || '',
                email: user.email,
                provider: 'google',
              },
              { merge: true }
            );
          }
        }
        setIsModalOpen(false);
      }
    } catch (err: any) {
      setSignupMsg(err.message);
    }
  };

  return (
    <div className="auth-container">
      <style>
        {`
        .auth-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: 'Montserrat', Arial, sans-serif;
          padding-bottom: 4rem;
        }
        .main-card {
          width: 100%;
          max-width: 430px;
          text-align: center;
          background: rgba(146, 64, 14, 0.93);
          border: 2px solid #facc15;
          border-radius: 16px;
          padding: 2.5rem 1.3rem 2.5rem 1.3rem;
          box-shadow: 0 6px 32px rgba(0,0,0,0.18);
          position: relative;
        }
        .user-btn {
          position: absolute;
          top: 1.1rem;
          right: 1.1rem;
          background: #fde68a;
          color: #92400e;
          font-weight: bold;
          padding: 0.7rem 1.1rem;
          border-radius: 8px;
          box-shadow: 0 2px 10px #0001;
          border: none;
          transition: background 0.17s;
          cursor: pointer;
        }
        .user-btn:hover {
          background: #fef08a;
        }
        .main-card h1 {
          color: #fde68a;
          font-size: 2.2rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }
        .main-card p {
          color: #fde68a;
          font-size: 1rem;
          margin-bottom: 2rem;
        }
        .main-links {
          margin-top: 1.2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.7rem;
        }
        .main-link {
          display: block;
          width: 100%;
          max-width: 200px;
          margin-left: auto;
          margin-right: auto;
          background: #d97706;
          color: #fff;
          font-weight: bold;
          padding: 0.85rem 0.2rem 0.7rem 0.2rem;
          border-radius: 12px;
          text-decoration: none;
          border: 2px solid #facc15;
          box-shadow: 0 2px 10px #0002;
          font-size: 1.1rem;
          transition: background 0.16s, transform 0.12s;
          text-align: center;
        }
        .main-link:hover {
          background: #b45309;
          transform: scale(1.03);
        }
        .main-link span {
          font-size: 1.3rem;
          font-weight: bold;
          color: #fff;
        }
        .main-link p {
          margin: 0.18rem 0 0 0;
          font-size: 1.01rem;
          color: #fff;
          font-weight: normal;
        }
        /* Modal Styles */
        .modal-bg {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.48);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
        }
        .modal-content {
          background: #fff;
          border-radius: 18px;
          box-shadow: 0 6px 32px rgba(0,0,0,0.18);
          padding: 2.2rem 1.6rem 2.2rem 1.6rem;
          width: 100%;
          max-width: 370px;
          position: relative;
        }
        .modal-close {
          position: absolute;
          top: 0.6rem;
          right: 1.1rem;
          background: none;
          border: none;
          color: #aaa;
          font-size: 2.3rem;
          font-weight: bold;
          cursor: pointer;
          transition: color 0.17s;
        }
        .modal-close:hover {
          color: #ef4444;
        }
        .modal-title {
          font-size: 1.5rem;
          font-weight: bold;
          color: #92400e;
          margin-bottom: 1.1rem;
          text-align: center;
        }
        .google-btn {
          width: 100%;
          background: #2563eb;
          color: #fff;
          padding: 0.7rem 0;
          border-radius: 8px;
          font-weight: bold;
          border: none;
          margin-bottom: 0.6rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 1.08rem;
          cursor: pointer;
          transition: background 0.17s;
        }
        .google-btn:hover {
          background: #1d4ed8;
        }
        .modal-divider {
          color: #aaa;
          text-align: center;
          font-size: 1rem;
          margin: 0.8rem 0;
        }
        .modal-input {
          width: 100%;
          border: 2px solid #b45309;
          border-radius: 8px;
          padding: 0.7rem 1rem;
          font-size: 1rem;
          margin-bottom: 0.7rem;
        }
        .modal-action-btn {
          width: 100%;
          background: #d97706;
          color: #fff;
          padding: 0.7rem 0;
          border-radius: 8px;
          font-weight: bold;
          border: none;
          font-size: 1.1rem;
          cursor: pointer;
          transition: background 0.17s;
        }
        .modal-action-btn:hover {
          background: #b45309;
        }
        .modal-login-btn {
          background: #fde68a;
          color: #92400e;
        }
        .modal-login-btn:hover {
          background: #fef08a;
        }
        .modal-msg {
          margin-top: 1.1rem;
          text-align: center;
          font-size: 1.02rem;
        }
        .modal-msg.success {
          color: #16a34a;
        }
        .modal-msg.error {
          color: #b91c1c;
        }
        @media (max-width: 600px) {
          .main-card { padding: 1rem 0.3rem 1rem 0.3rem; }
          .modal-content { padding: 1.2rem 0.5rem 1.2rem 0.5rem; }
          .main-link { max-width: 90vw; font-size: 1rem; }
        }
        `}
      </style>
      <div className="main-card">
        <button
          onClick={handleUserBtnClick}
          className="user-btn"
        >
          {currentUser ? 'My Profile' : 'Sign Up/Login'}
        </button>
        <h1>Welcome to the Pub</h1>
        <p>Your ultimate sports bar and media experience. Grab a seat.</p>
        <div className="main-links">
          <a
            href="index-nfl"
            className="main-link"
          >
            <span>Games</span>
            <p>Prove that you know ball.</p>
          </a>
          <a
            href="news"
            className="main-link"
          >
            <span>News</span>
            <p>Pick up The Pub Times for the most ridiculous takes in sports.</p>
          </a>
          <a
            href="index-bar"
            className="main-link"
          >
            <span>Take a Seat</span>
            <p>Sit at the Pub Bar, or join a table or booth.</p>
          </a>
        </div>
      </div>
      {isModalOpen && (
        <div
          className="modal-bg"
          onClick={handleModalClick}
        >
          <div className="modal-content">
            <button
              onClick={closeModal}
              className="modal-close"
            >
              &times;
            </button>
            <div className="modal-title">Sign Up / Login</div>
            <button
              onClick={handleGoogleSignIn}
              className="google-btn"
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                style={{ width: 20, height: 20 }}
                alt="Google logo"
              />
              Sign in with Google
            </button>
            <div className="modal-divider">or</div>
            <input
              type="email"
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
              required
              placeholder="Email"
              className="modal-input"
            />
            <input
              type="password"
              value={signupPassword}
              onChange={(e) => setSignupPassword(e.target.value)}
              required
              placeholder="Password"
              className="modal-input"
            />
            <input
              type="text"
              value={signupUsername}
              onChange={(e) => setSignupUsername(e.target.value)}
              required
              placeholder="Choose a username"
              className="modal-input"
            />
            <button
              onClick={handleSignup}
              className="modal-action-btn"
            >
              Create Account
            </button>
            <div className="modal-divider">or</div>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
              placeholder="Email"
              className="modal-input"
            />
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
              placeholder="Password"
              className="modal-input"
            />
            <button
              onClick={handleLogin}
              className="modal-action-btn modal-login-btn"
            >
              Log In
            </button>
            <div
              className={`modal-msg ${signupMsg.includes('successfully') ? 'success' : signupMsg ? 'error' : ''}`}
            >
              {signupMsg}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
