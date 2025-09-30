"use client";
import Link from "next/link";
import React, { useState } from "react";

export default function WelcomePub() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen font-montserrat pb-16">
      <div className="w-full max-w-md text-center bg-amber-800/90 border-2 border-yellow-600 rounded-lg p-6 shadow-lg relative pt-14">
        <button
          className="absolute top-4 right-4 bg-yellow-300 text-amber-900 font-bold px-4 py-2 rounded hover:bg-yellow-400 shadow transition"
          onClick={() => setModalOpen(true)}
        >
          Sign Up/Login
        </button>
        <h1 className="text-4xl font-bold text-yellow-300 mb-2">Welcome to the Pub</h1>
        <p className="text-sm text-yellow-300 mb-8">Your ultimate sports bar and media experience. Grab a seat.</p>
        <Link
          href="/index-nfl"
          className="block w-full bg-amber-600 text-white font-bold p-4 rounded-lg hover:bg-amber-700 transform hover:scale-105 transition duration-200 border-2 border-yellow-600 shadow-md mt-2 flex flex-col space-y-1"
        >
          <span className="text-3xl">Games</span>
          <p className="text-sm text-white">Prove that you know ball.</p>
        </Link>
        <Link
          href="/news"
          className="block w-full bg-amber-600 text-white font-bold p-4 rounded-lg hover:bg-amber-700 transform hover:scale-105 transition duration-200 border-2 border-yellow-600 shadow-md mt-2 flex flex-col space-y-1"
        >
          <span className="text-3xl">News</span>
          <p className="text-sm text-white">Pick up The Pub Times for the most ridiculous takes in sports.</p>
        </Link>
        <Link
          href="/index-bar"
          className="block w-full bg-amber-600 text-white font-bold p-4 rounded-lg hover:bg-amber-700 transform hover:scale-105 transition duration-200 border-2 border-yellow-600 shadow-md mt-2 flex flex-col space-y-1"
        >
          <span className="text-3xl">Take a Seat</span>
          <p className="text-sm text-white">Sit at the Pub Bar, or join a table or booth.</p>
        </Link>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-sm relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-2xl font-bold"
              onClick={() => setModalOpen(false)}
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-4 text-amber-900 text-center">Sign Up / Login</h2>
            {/* Forms go here */}
          </div>
        </div>
      )}
    </div>
  );
}
