"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { auth, db } from "./firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  User,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

const WelcomePub: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [signupMsg, setSignupMsg] = useState("");
  const [signupMsgClass, setSignupMsgClass] = useState("mt-4 text-center");
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const signupEmailRef = useRef<HTMLInputElement>(null);
  const signupPasswordRef = useRef<HTMLInputElement>(null);
  const signupUsernameRef = useRef<HTMLInputElement>(null);
  const loginEmailRef = useRef<HTMLInputElement>(null);
  const loginPasswordRef = useRef<HTMLInputElement>(null);
  const userBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.body.classList.add("font-montserrat");
    document.body.style.backgroundImage =
      "url('https://awolvision.com/cdn/shop/articles/sports_bar_awolvision.jpg?v=1713302733&width=1500')";
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundAttachment = "fixed";
    document.body.style.backgroundColor = "#451a03";
    return () => {
      document.body.classList.remove("font-montserrat");
      document.body.style.backgroundImage = "";
      document.body.style.backgroundSize = "";
      document.body.style.backgroundPosition = "";
      document.body.style.backgroundAttachment = "";
      document.body.style.backgroundColor = "";
    };
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        if (userBtnRef.current) userBtnRef.current.textContent = "My Profile";
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);
        if (!docSnap.exists() || !docSnap.data()?.username) {
          let uname = "";
          while (!uname || uname.length < 2) {
            uname = window.prompt("Create a username for your account:") ?? "";
            if (uname === null) break;
          }
          if (uname) {
            await setDoc(
              userRef,
              {
                username: uname,
                avatar: user.photoURL || "",
                email: user.email,
                provider: user.providerData[0]?.providerId || "google",
              },
              { merge: true }
            );
          }
        }
      } else {
        if (userBtnRef.current) userBtnRef.current.textContent = "Sign Up/Login";
      }
    });
    return unsub;
  }, []);

  const openModal = () => {
    setModalOpen(true);
    setSignupMsg("");
    setSignupMsgClass("mt-4 text-center");
    if (signupEmailRef.current) signupEmailRef.current.value = "";
    if (signupPasswordRef.current) signupPasswordRef.current.value = "";
    if (signupUsernameRef.current) signupUsernameRef.current.value = "";
    if (loginEmailRef.current) loginEmailRef.current.value = "";
    if (loginPasswordRef.current) loginPasswordRef.current.value = "";
  };
  const closeModal = () => setModalOpen(false);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const modalEl = document.getElementById("signupModal");
      if (modalOpen && modalEl && event.target === modalEl) closeModal();
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [modalOpen]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupMsg("");
    setSignupMsgClass("mt-4 text-center");
    const email = signupEmailRef.current?.value || "";
    const password = signupPasswordRef.current?.value || "";
    const username = signupUsernameRef.current?.value.trim() || "";
    if (!username || username.length < 2) {
      setSignupMsg("Username must be at least 2 characters.");
      setSignupMsgClass("mt-4 text-center text-red-600");
      return;
    }
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(
        doc(db, "users", cred.user.uid),
        {
          username,
          email,
          avatar: "",
          provider: "password",
        },
        { merge: true }
      );
      setSignupMsg("Account created successfully!");
      setSignupMsgClass("mt-4 text-center text-green-600");
      if (signupEmailRef.current) signupEmailRef.current.value = "";
      if (signupPasswordRef.current) signupPasswordRef.current.value = "";
      if (signupUsernameRef.current) signupUsernameRef.current.value = "";
      setTimeout(() => closeModal(), 1000);
    } catch (err: any) {
      setSignupMsg(err.message);
      setSignupMsgClass("mt-4 text-center text-red-600");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupMsg("");
    setSignupMsgClass("mt-4 text-center");
    const email = loginEmailRef.current?.value || "";
    const password = loginPasswordRef.current?.value || "";
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setSignupMsg("Logged in successfully!");
      setSignupMsgClass("mt-4 text-center text-green-600");
      if (loginEmailRef.current) loginEmailRef.current.value = "";
      if (loginPasswordRef.current) loginPasswordRef.current.value = "";
      setTimeout(() => closeModal(), 1000);
    } catch (err: any) {
      setSignupMsg(err.message);
      setSignupMsgClass("mt-4 text-center text-red-600");
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);
      if (!docSnap.exists() || !docSnap.data()?.username) {
        let uname = "";
        while (!uname || uname.length < 2) {
          uname = window.prompt("Create a username for your account:") ?? "";
          if (uname === null) break;
        }
        if (uname) {
          await setDoc(
            userRef,
            {
              username: uname,
              avatar: user.photoURL || "",
              email: user.email,
              provider: "google",
            },
            { merge: true }
          );
        }
      }
      closeModal();
    } catch (err: any) {
      setSignupMsg(err.message);
      setSignupMsgClass("mt-4 text-center text-red-600");
    }
  };

  const handleUserBtnClick = () => {
    if (currentUser) {
      window.location.href = "/myprofile";
    } else {
      openModal();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen font-montserrat pb-16">
      <div className="w-full max-w-md text-center bg-black/70 border-2 border-yellow-600 rounded-xl p-8 shadow-2xl relative pt-16">
        {/* My Profile/Sign Up/Login Button */}
        <button
          id="userBtn"
          ref={userBtnRef}
          className="absolute top-5 right-5 bg-yellow-300 text-amber-900 font-bold px-5 py-2 rounded-full hover:bg-yellow-400 shadow transition-all duration-200"
          onClick={handleUserBtnClick}
        >
          Sign Up/Login
        </button>
        <h1 className="text-5xl font-extrabold text-yellow-100 drop-shadow mb-4">Welcome to the Pub</h1>
        <p className="text-base text-yellow-200 mb-8 font-medium">
          Your ultimate sports bar and media experience. Grab a seat.
        </p>
        <div className="space-y-6">
          <Link href="/index-nfl" className="block w-full">
            <button className="w-full bg-yellow-400 hover:bg-yellow-500 text-amber-900 font-bold py-6 px-8 text-2xl rounded-full shadow-lg transition-all duration-200 flex flex-col items-center">
              <span>Games</span>
              <span className="text-sm font-normal text-amber-900 mt-2">Prove that you know ball.</span>
            </button>
          </Link>
          <Link href="/news" className="block w-full">
            <button className="w-full bg-yellow-400 hover:bg-yellow-500 text-amber-900 font-bold py-6 px-8 text-2xl rounded-full shadow-lg transition-all duration-200 flex flex-col items-center">
              <span>News</span>
              <span className="text-sm font-normal text-amber-900 mt-2">
                Pick up The Pub Times for the most ridiculous takes in sports.
              </span>
            </button>
          </Link>
          <Link href="/index-bar" className="block w-full">
            <button className="w-full bg-yellow-400 hover:bg-yellow-500 text-amber-900 font-bold py-6 px-8 text-2xl rounded-full shadow-lg transition-all duration-200 flex flex-col items-center">
              <span>Take a Seat</span>
              <span className="text-sm font-normal text-amber-900 mt-2">
                Sit at the Pub Bar, or join a table or booth.
              </span>
            </button>
          </Link>
        </div>
      </div>

      {/* Sign Up/Login Modal */}
      {modalOpen && (
        <div
          id="signupModal"
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 transition-all duration-200"
        >
          <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-sm relative ring-2 ring-amber-700/50">
            <button
              id="closeSignUp"
              className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-3xl font-extrabold transition"
              onClick={closeModal}
            >
              &times;
            </button>
            <h2 className="text-3xl font-extrabold mb-5 text-amber-900 text-center drop-shadow">
              Sign Up / Login
            </h2>
            <div className="flex flex-col gap-2 mb-2">
              <button
                id="googleSignInBtn"
                type="button"
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center gap-2 shadow"
                onClick={handleGoogleSignIn}
              >
                <img
                  src="https://www.svgrepo.com/show/475656/google-color.svg"
                  className="w-5 h-5"
                  alt="Google logo"
                />
                Sign in with Google
              </button>
            </div>
            <div className="text-center text-sm my-2 text-gray-400">or</div>
            <form id="signupForm" className="space-y-4" onSubmit={handleSignup}>
              <input
                type="email"
                ref={signupEmailRef}
                required
                placeholder="Email"
                className="w-full border-2 border-amber-700 rounded-lg px-3 py-2 bg-amber-50 focus:outline-none focus:border-yellow-500 transition"
              />
              <input
                type="password"
                ref={signupPasswordRef}
                required
                placeholder="Password"
                className="w-full border-2 border-amber-700 rounded-lg px-3 py-2 bg-amber-50 focus:outline-none focus:border-yellow-500 transition"
              />
              <input
                type="text"
                ref={signupUsernameRef}
                required
                placeholder="Choose a username"
                className="w-full border-2 border-amber-700 rounded-lg px-3 py-2 bg-amber-50 focus:outline-none focus:border-yellow-500 transition"
              />
              <button
                type="submit"
                className="w-full bg-amber-600 text-white py-2 rounded-lg font-bold hover:bg-amber-700 shadow"
              >
                Create Account
              </button>
            </form>
            <div className="text-center text-sm my-2 text-gray-400">or</div>
            <form id="loginForm" className="space-y-4" onSubmit={handleLogin}>
              <input
                type="email"
                ref={loginEmailRef}
                required
                placeholder="Email"
                className="w-full border-2 border-amber-700 rounded-lg px-3 py-2 bg-amber-50 focus:outline-none focus:border-yellow-500 transition"
              />
              <input
                type="password"
                ref={loginPasswordRef}
                required
                placeholder="Password"
                className="w-full border-2 border-amber-700 rounded-lg px-3 py-2 bg-amber-50 focus:outline-none focus:border-yellow-500 transition"
              />
              <button
                type="submit"
                className="w-full bg-yellow-300 text-amber-900 py-2 rounded-lg font-bold hover:bg-yellow-400 shadow"
              >
                Log In
              </button>
            </form>
            <p id="signupMsg" className={signupMsgClass}>{signupMsg}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WelcomePub;
