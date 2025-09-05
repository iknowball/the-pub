// 1. Add Firebase SDKs in your HTML (see step 2 below)

// 2. Firebase config (replace with your own from Firebase Console)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// 3. Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 4. Function to fetch news posts
async function loadNews() {
  const newsRef = db.collection("news").orderBy("createdAt", "desc");
  const snapshot = await newsRef.get();
  const newsList = document.getElementById("news-list");
  newsList.innerHTML = ""; // Clear old content

  snapshot.forEach(doc => {
    const data = doc.data();
    // Template for each news article
    const article = document.createElement("article");
    article.className = "bg-white p-4 border border-gray-900 shadow-md animate-fade-in";
    article.innerHTML = `
      <h2 class="text-2xl font-bold text-gray-900 mb-2">${data.title}</h2>
      <p class="text-sm text-gray-700 mb-2">By ${data.author || "Sports Desk"} | ${data.date || ""}</p>
      ${data.image ? `<img src="${data.image}" alt="" class="w-full h-48 object-cover mb-4 border border-gray-900">` : ""}
      <p class="text-gray-900">${data.content}</p>
      <p class="text-gray-700 mt-2 text-sm">${data.source ? "Source: " + data.source : ""}</p>
    `;
    newsList.appendChild(article);
  });
}

// Optionally, call loadNews() on page load
document.addEventListener("DOMContentLoaded", loadNews);
