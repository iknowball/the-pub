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

// Define TypeScript interfaces
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

  // Handle auth state changes
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

  // Handle user button click
  const handleUserBtnClick = () => {
    if (currentUser) {
      window.location.href = 'myprofile.html';
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

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Handle modal background click
  const handleModalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setIsModalOpen(false);
    }
  };

  // Handle signup
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

  // Handle login
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

  // Handle Google sign-in
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
    <div
      className="flex flex-col items-center justify-center min-h-screen font-[Montserrat] pb-16"
      style={{
        backgroundImage: "url('https://awolvision.com/cdn/shop/articles/sports_bar_awolvision.jpg?v=1713302733&width=1500')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundColor: '#451a03',
      }}
    >
      <div className="w-full max-w-md text-center bg-amber-800/90 border-2 border-yellow-600 rounded-lg p-6 shadow-lg relative pt-14">
        <button
          onClick={handleUserBtnClick}
          className="absolute top-4 right-4 bg-yellow-300 text-amber-900 font-bold px-4 py-2 rounded hover:bg-yellow-400 shadow transition"
        >
          {currentUser ? 'My Profile' : 'Sign Up/Login'}
        </button>
        <h1 className="text-4xl font-bold text-yellow-300 mb-2">Welcome to the Pub</h1>
        <p className="text-sm text-yellow-300 mb-8">Your ultimate sports bar and media experience. Grab a seat.</p>
        <a
          href="index-nfl.html"
          className="block w-full bg-amber-600 text-white font-bold p-4 rounded-lg hover:bg-amber-700 transform hover:scale-105 transition duration-200 border-2 border-yellow-600 shadow-md mt-2 flex flex-col space-y-1"
        >
          <span className="text-3xl">Games</span>
          <p className="text-sm text-white">Prove that you know ball.</p>
        </a>
        <a
          href="news.html"
          className="block w-full bg-amber-600 text-white font-bold p-4 rounded-lg hover:bg-amber-700 transform hover:scale-105 transition duration-200 border-2 border-yellow-600 shadow-md mt-2 flex flex-col space-y-1"
        >
          <span className="text-3xl">News</span>
          <p className="text-sm text-white">Pick up The Pub Times for the most ridiculous takes in sports.</p>
        </a>
        <a
          href="index-bar.html"
          className="block w-full bg-amber-600 text-white font-bold p-4 rounded-lg hover:bg-amber-700 transform hover:scale-105 transition duration-200 border-2 border-yellow-600 shadow-md mt-2 flex flex-col space-y-1"
        >
          <span className="text-3xl">Take a Seat</span>
          <p className="text-sm text-white">Sit at the Pub Bar, or join a table or booth.</p>
        </a>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={handleModalClick}
        >
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-sm relative">
            <button
              onClick={closeModal}
              className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-2xl font-bold"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-4 text-amber-900 text-center">Sign Up / Login</h2>
            <div className="flex flex-col gap-2 mb-2">
              <button
                onClick={handleGoogleSignIn}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <img
                  src="https://www.svgrepo.com/show/475656/google-color.svg"
                  className="w-5 h-5"
                  alt="Google logo"
                />
                Sign in with Google
              </button>
            </div>
            <div className="text-center text-sm my-2 text-gray-500">or</div>
            <div className="space-y-4">
              <input
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                required
                placeholder="Email"
                className="w-full border-2 border-amber-700 rounded-lg px-3 py-2"
              />
              <input
                type="password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                required
                placeholder="Password"
                className="w-full border-2 border-amber-700 rounded-lg px-3 py-2"
              />
              <input
                type="text"
                value={signupUsername}
                onChange={(e) => setSignupUsername(e.target.value)}
                required
                placeholder="Choose a username"
                className="w-full border-2 border-amber-700 rounded-lg px-3 py-2"
              />
              <button
                onClick={handleSignup}
                className="w-full bg-amber-600 text-white py-2 rounded-lg font-bold hover:bg-amber-700"
              >
                Create Account
              </button>
            </div>
            <div className="text-center text-sm my-2 text-gray-500">or</div>
            <div className="space-y-4">
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                placeholder="Email"
                className="w-full border-2 border-amber-700 rounded-lg px-3 py-2"
              />
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                placeholder="Password"
                className="w-full border-2 border-amber-700 rounded-lg px-3 py-2"
              />
              <button
                onClick={handleLogin}
                className="w-full bg-yellow-300 text-amber-900 py-2 rounded-lg font-bold hover:bg-yellow-400"
              >
                Log In
              </button>
            </div>
            <p
              className={`mt-4 text-center ${signupMsg.includes('successfully') ? 'text-green-600' : signupMsg ? 'text-red-600' : ''}`}
            >
              {signupMsg}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
