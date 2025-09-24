import React, { useEffect } from "react";

const PubBar: React.FC = () => {
  // Set background styling on mount
  useEffect(() => {
    document.body.style.backgroundImage =
      "url('https://awolvision.com/cdn/shop/articles/sports_bar_awolvision.jpg?v=1713302733&width=1500')";
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundAttachment = "fixed";
    document.body.style.backgroundColor = "#451a03";
    document.body.classList.add("font-montserrat");
    return () => {
      // Clean up if needed
      document.body.style.backgroundImage = "";
      document.body.style.backgroundSize = "";
      document.body.style.backgroundPosition = "";
      document.body.style.backgroundAttachment = "";
      document.body.style.backgroundColor = "";
      document.body.classList.remove("font-montserrat");
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen font-montserrat pb-16">
      <div className="w-full max-w-md bg-amber-800/90 border-2 border-yellow-600 rounded-lg p-6 shadow-lg relative text-center">
        {/* Home button bar row above the welcome text, left-aligned */}
        <div className="flex items-center mb-2">
          <a
            href="index.html"
            className="bg-amber-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-amber-700 transform hover:scale-105 transition duration-200 border-2 border-yellow-600 shadow-md text-center mr-auto"
          >
            Home
          </a>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-yellow-300 mb-4">
            Grab a Seat!
          </h1>
          <p className="text-base text-yellow-300 mb-4">
            Welcome to The Pub Bar. Pull up a stool, join a booth for game discussion, or debate at a table.
          </p>
          <p className="text-base text-yellow-300 mb-4">Jump in!</p>
        </div>
        <div className="space-y-2">
          <a
            href="table.html"
            className="block w-full bg-amber-600 text-white font-bold p-4 rounded-lg hover:bg-amber-700 transform hover:scale-105 transition duration-200 border-2 border-yellow-600 shadow-md text-center mt-2"
          >
            Tables
          </a>
          <a
            href="booth.html"
            className="block w-full bg-amber-600 text-white font-bold p-4 rounded-lg hover:bg-amber-700 transform hover:scale-105 transition duration-200 border-2 border-yellow-600 shadow-md text-center mt-2"
          >
            Booths
          </a>
          <a
            href="bulletin.html"
            className="block w-full bg-amber-600 text-white font-bold p-4 rounded-lg hover:bg-amber-700 transform hover:scale-105 transition duration-200 border-2 border-yellow-600 shadow-md text-center mt-2"
          >
            Bar
          </a>
        </div>
      </div>
    </div>
  );
};

export default PubBar;
