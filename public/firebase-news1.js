// 1. Add Firebase SDKs in your HTML (see step 2 below)

// 2. Firebase config (replace with your own from Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyBtsOBlh52YZagsLXp9_dcCq4qhkHBSWnU",
  authDomain: "thepub-sigma.firebaseapp.com",
  projectId: "thepub-sigma",
  storageBucket: "thepub-sigma.appspot.com",
  messagingSenderId: "108972507038",
  appId: "1:108972507038:web:4503cbe63cb3f7a3e4e08f"
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
