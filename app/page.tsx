import React from "react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen font-montserrat pb-16">
      <div className="w-full max-w-md text-center bg-amber-800/90 border-2 border-yellow-600 rounded-lg p-6 shadow-lg relative">
        <h1 className="text-4xl font-bold text-yellow-300 mb-6">Welcome to The Pub</h1>
        <p className="text-lg text-yellow-300 mb-8">
          Your ultimate sports bar and media experience. Grab a seat.
        </p>
        <div className="space-y-2">
          <Link
            href="/games-room"
            className="block w-full bg-amber-600 text-white font-bold p-4 rounded-lg hover:bg-amber-700 shadow-md text-center mt-2"
          >
            Games Room
          </Link>
          <Link
            href="/bar"
            className="block w-full bg-amber-600 text-white font-bold p-4 rounded-lg hover:bg-amber-700 shadow-md text-center mt-2"
          >
            Bar
          </Link>
          <Link
            href="/news"
            className="block w-full bg-amber-600 text-white font-bold p-4 rounded-lg hover:bg-amber-700 shadow-md text-center mt-2"
          >
            Newsstand
          </Link>
          <Link
            href="/myprofile"
            className="block w-full bg-yellow-300 text-amber-900 font-bold p-4 rounded-lg hover:bg-yellow-400 shadow-md text-center mt-2"
          >
            My Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
