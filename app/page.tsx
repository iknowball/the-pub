"use client";
import Link from "next/link";
import React, { useState, useEffect } from "react";

export default function WelcomePub() {
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add("font-montserrat");
    document.body.style.backgroundImage =
      "url('https://awolvision.com/cdn/shop/articles/sports_bar_awolvision.jpg?v=1713302733&width=1500')";
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundAttachment = "fixed";
    document.body.style.backgroundColor = "#2f2e22";
    return () => {
      document.body.classList.remove("font-montserrat");
      document.body.style.backgroundImage = "";
      document.body.style.backgroundSize = "";
      document.body.style.backgroundPosition = "";
      document.body.style.backgroundAttachment = "";
      document.body.style.backgroundColor = "";
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen font-montserrat pb-16">
      <div className="w-full max-w-md text-center bg-black/80 border-2 border-yellow-600 rounded-xl p-8 shadow-2xl relative pt-16">
        <button
          className="absolute top-5 right-5 bg-yellow-300 text-amber-900 font-bold px-5 py-2 rounded-full hover:bg-yellow-400 shadow transition"
          onClick={() => setModalOpen(true)}
        >
          My Profile
        </button>
        <h1 className="text-5xl font-extrabold text-yellow-200 drop-shadow mb-4">Welcome to the Pub</h1>
        <p className="text-lg text-yellow-100 mb-8 font-medium">
          Your ultimate sports bar and media experience. Grab a seat.
        </p>
        <div className="space-y-4">
          <Link
            href="/index-nfl"
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-amber-900 font-bold py-6 px-8 text-2xl rounded-full shadow-lg transition flex flex-col items-center"
          >
            <span>Games</span>
            <span className="text-sm font-normal text-amber-900 mt-2">Prove that you know ball.</span>
          </Link>
          <Link
            href="/news"
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-amber-900 font-bold py-6 px-8 text-2xl rounded-full shadow-lg transition flex flex-col items-center"
          >
            <span>News</span>
            <span className="text-sm font-normal text-amber-900 mt-2">
              Pick up The Pub Times for the most ridiculous takes in sports.
            </span>
          </Link>
          <Link
            href="/index-bar"
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-amber-900 font-bold py-6 px-8 text-2xl rounded-full shadow-lg transition flex flex-col items-center"
          >
            <span>Take a Seat</span>
            <span className="text-sm font-normal text-amber-900 mt-2">
              Sit at the Pub Bar, or join a table or booth.
            </span>
          </Link>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-sm relative ring-2 ring-amber-700/50">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-3xl font-extrabold transition"
              onClick={() => setModalOpen(false)}
            >
              &times;
            </button>
            <h2 className="text-3xl font-extrabold mb-5 text-amber-900 text-center drop-shadow">
              Sign Up / Login
            </h2>
            {/* Add login/signup forms here if needed */}
          </div>
        </div>
      )}
    </div>
  );
}
