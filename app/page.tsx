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
      <div className="w-full max-w-xl text-center bg-[#a96c1d]/90 border-2 border-yellow-200 rounded-xl p-8 shadow-2xl relative pt-16" style={{boxShadow:"0 8px 32px 0 rgba(31, 38, 135, 0.37)"}}>
        {/* Sign Up/Login Button positioned to match the reference */}
        <button
          className="absolute top-5 right-5 bg-yellow-300 text-amber-900 font-bold px-6 py-2 rounded-lg shadow transition text-xl hover:bg-yellow-400"
          onClick={() => setModalOpen(true)}
        >
          Sign Up/Login
        </button>
        <h1 className="text-5xl font-extrabold text-yellow-100 drop-shadow mb-2">Welcome to the Pub</h1>
        <p className="text-xl text-yellow-200 mb-8 font-medium drop-shadow">
          Your ultimate sports bar and media experience. Grab a seat.
        </p>
        <div className="space-y-6">
          <Link
            href="/index-nfl"
            className="block w-full bg-[#dc9832] hover:bg-yellow-400 text-white font-bold py-8 px-8 text-3xl rounded shadow-lg transition duration-150 border border-yellow-200"
            style={{letterSpacing: "0.5px"}}
          >
            <div>
              Games
              <div className="text-lg font-normal text-white mt-2 leading-tight">
                Pub Games test your trivia, player, and college knowledge.
              </div>
            </div>
          </Link>
          <Link
            href="/news"
            className="block w-full bg-[#dc9832] hover:bg-yellow-400 text-white font-bold py-8 px-8 text-3xl rounded shadow-lg transition duration-150 border border-yellow-200"
          >
            <div>
              Newsstand
              <div className="text-lg font-normal text-white mt-2 leading-tight">
                Pick up The Pub Times for the most ridiculous takes in sports.
              </div>
            </div>
          </Link>
          <Link
            href="/index-bar"
            className="block w-full bg-[#dc9832] hover:bg-yellow-400 text-white font-bold py-8 px-8 text-3xl rounded shadow-lg transition duration-150 border border-yellow-200"
          >
            <div>
              Bulletin
              <div className="text-lg font-normal text-white mt-2 leading-tight">
                TALK YOUR SHIT!
              </div>
            </div>
          </Link>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-sm relative ring-2 ring-amber-700/50">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-3xl font-extrabold transition"
              onClick={() => setModalOpen(false)}
              aria-label="Close Modal"
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
