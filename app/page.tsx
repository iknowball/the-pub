import React from "react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-8 text-yellow-300">Welcome to The Pub!</h1>
      <div className="space-y-4">
        <Link href="/games-room" className="block bg-amber-600 text-white p-4 rounded-lg shadow text-center">Games Room</Link>
        <Link href="/bar" className="block bg-amber-600 text-white p-4 rounded-lg shadow text-center">Bar</Link>
        <Link href="/news" className="block bg-amber-600 text-white p-4 rounded-lg shadow text-center">Newsstand</Link>
      </div>
    </main>
  );
}
