```tsx
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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

// TypeScript interfaces
interface UserData {
  username?: string;
  email?: string;
  avatar?: string;
  provider?: string;
}

const Home: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<firebase.User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupMsg, setSignupMsg] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Handle auth state changes
  useEffect(() => {
    try {
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
    } catch (err: any) {
      setError('Failed to initialize auth: ' + err.message);
    }
  }, []);

  // Handle user button click
  const handleUserBtnClick = () => {
    if (currentUser) {
      window.location.href = '/myprofile';
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

  if (error) {
    return <div className="text-red-600 text-center p-4">Error: {error}</div>;
  }

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen font-montserrat pb-16 bg-[#451a03]"
      style={{
        backgroundImage: "url('/images/sports_bar.jpg')", // Place image in public/images/
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
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
        <Link
          href="/nfl"
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
          href="/bar"
          className="block w-full bg-amber-600 text-white font-bold p-4 rounded-lg hover:bg-amber-700 transform hover:scale-105 transition duration-200 border-2 border-yellow-600 shadow-md mt-2 flex flex-col space-y-1"
        >
          <span className="text-3xl">Take a Seat</span>
          <p className="text-sm text-white">Sit at the Pub Bar, or join a table or booth.</p>
        </Link>
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
                className="w-full border-2 border-amber-700 rounded-lg px-3 py-2 font-montserrat"
              />
              <input
                type="password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                required
                placeholder="Password"
                className="w-full border-2 border-amber-700 rounded-lg px-3 py-2 font-montserrat"
              />
              <input
                type="text"
                value={signupUsername}
                onChange={(e) => setSignupUsername(e.target.value)}
                required
                placeholder="Choose a username"
                className="w-full border-2 border-amber-700 rounded-lg px-3 py-2 font-montserrat"
              />
              <button
                onClick={handleSignup}
                className="w-full bg-amber-600 text-white py-2 rounded-lg font-bold hover:bg-amber-700 font-montserrat"
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
                className="w-full border-2 border-amber-700 rounded-lg px-3 py-2 font-montserrat"
              />
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                placeholder="Password"
                className="w-full border-2 border-amber-700 rounded-lg px-3 py-2 font-montserrat"
              />
              <button
                onClick={handleLogin}
                className="w-full bg-yellow-300 text-amber-900 py-2 rounded-lg font-bold hover:bg-yellow-400 font-montserrat"
              >
                Log In
              </button>
            </div>
            <p
              className={`mt-4 text-center font-montserrat ${signupMsg.includes('successfully') ? 'text-green-600' : signupMsg ? 'text-red-600' : ''}`}
            >
              {signupMsg}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
```

### Setup Instructions
1. **Project Setup**:
   - Ensure you have a Next.js project with TypeScript:
     ```bash
     npx create-next-app@latest my-pub-app --typescript
     cd my-pub-app
     ```
   - Install Firebase:
     ```bash
     npm install firebase
     ```

2. **Tailwind CSS Configuration**:
   - Install Tailwind CSS:
     ```bash
     npm install -D tailwindcss postcss autoprefixer
     npx tailwindcss init -p
     ```
   - Update `tailwind.config.js`:
     ```js
     /** @type {import('tailwindcss').Config} */
     module.exports = {
       content: [
         './app/**/*.{js,ts,jsx,tsx}',
         './pages/**/*.{js,ts,jsx,tsx}',
         './components/**/*.{js,ts,jsx,tsx}',
       ],
       theme: {
         extend: {
           fontFamily: {
             montserrat: ['Montserrat', 'sans-serif'],
           },
         },
       },
       plugins: [],
     };
     ```
   - Update `app/globals.css`:
     ```css
     @tailwind base;
     @tailwind components;
     @tailwind utilities;

     @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700&display=swap');

     body {
       margin: 0;
       padding: 0;
       box-sizing: border-box;
     }
     ```

3. **Background Image**:
   - Download the background image from `https://awolvision.com/cdn/shop/articles/sports_bar_awolvision.jpg?v=1713302733&width=1500`.
   - Place it in `public/images/sports_bar.jpg`.
   - The TSX uses `url('/images/sports_bar.jpg')` to reference it locally, avoiding external URL issues.

4. **Firebase Scripts**:
   - Update `app/layout.tsx` to include Firebase SDKs and metadata:
     ```tsx
     import './globals.css';
     import { Metadata } from 'next';

     export const metadata: Metadata = {
       title: 'Welcome to the Pub',
       description: 'Your ultimate sports bar and media experience.',
     };

     export default function RootLayout({
       children,
     }: {
       children: React.ReactNode;
     }) {
       return (
         <html lang="en">
           <head>
             <link
               href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700&display=swap"
               rel="stylesheet"
             />
             <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js" async />
             <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js" async />
             <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js" async />
           </head>
           <body>{children}</body>
         </html>
       );
     }
     ```

5. **Create Route Pages**:
   - Create placeholder pages to avoid navigation errors:
     ```tsx
     // app/nfl/page.tsx
     export default function NFL() {
       return <div>NFL Page</div>;
     }
     ```
     - Repeat for `app/news/page.tsx`, `app/bar/page.tsx`, and `app/myprofile/page.tsx`.

6. **Run the App**:
   - Start the development server:
     ```bash
     npm run dev
     ```
   - Visit `http://localhost:3000` to verify.

### Troubleshooting Checklist
1. **Verify Styling**:
   - **Background Image**: Open dev tools (F12) and check if `/images/sports_bar.jpg` loads (Network tab). If not, ensure the file is in `public/images/`.
   - **Tailwind Classes**: Inspect the main container (`<div className="w-full max-w-md ...">`). Confirm it has `background-color: rgba(180, 83, 9, 0.9)` (for `bg-amber-800/90`) and `border: 2px solid #ca8a04` (for `border-yellow-600`).
   - **Font**: Inspect text elements (e.g., `<h1>Welcome to the Pub</h1>`). Ensure `font-family: Montserrat, sans-serif` is applied.
   - **Button Hover**: Hover over buttons (e.g., “Games”) and check for `transform: scale(1.05)` and color change (`bg-amber-700`).

2. **Modal Behavior**:
   - Click “Sign Up/Login” to open the modal. Verify it’s centered, has a dark overlay (`bg-black/50`), and closes when clicking outside or the `&times;` button.
   - Test form inputs and buttons. Ensure `signupMsg` displays in green (`text-green-600`) for success or red (`text-red-600`) for errors.

3. **Firebase Functionality**:
   - Test Google sign-in and email/password login. Check the console for Firebase errors (e.g., auth issues, Firestore permissions).
   - Verify the “Sign Up/Login” button changes to “My Profile” after login.

4. **Console Errors**:
   - Open dev tools (F12) and check the Console and Network tabs for:
     - CSS errors (e.g., missing Tailwind classes).
     - Image loading failures (404 for `/images/sports_bar.jpg` or Google logo).
     - Firebase errors (e.g., “Invalid API key” or “CORS issues”).
     - Hydration errors (Next.js mismatch between server and client).

5. **Compare with Original HTML**:
   - Open the original HTML in a browser and compare:
     - Main container: Amber semi-transparent background, yellow border, centered on page.
     - Buttons: Amber with yellow border, white text, scale on hover.
     - Modal: White background, centered, with amber and yellow buttons.
     - Font: Montserrat bold for all text.

### If It Still Looks Wrong
Please provide:
- **Specific Visual Issues**: E.g., “The background is black instead of the bar image,” “Buttons are square instead of rounded,” or “The modal doesn’t appear.”
- **Environment Details**: Are you using Vercel, CodeSandbox, or a local Next.js setup? Did you run `npm run build` or `npm run dev`?
- **Console Errors**: Copy any errors from the browser console or build process.
- **Screenshots (if possible)**: Describe how the preview differs from the original HTML.

### Additional Fixes to Try
- **Local Image**: If the background image still fails, verify `public/images/sports_bar.jpg` exists. Alternatively, revert to the external URL:
  ```tsx
  style={{
    backgroundImage: "url('https://awolvision.com/cdn/shop/articles/sports_bar_awolvision.jpg?v=1713302733&width=1500')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  }}
  ```
- **Tailwind CDN Fallback**: If Tailwind classes don’t work, add the CDN to `app/layout.tsx`:
  ```tsx
  <head>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700&display=swap" rel="stylesheet" />
  </head>
  ```
- **Reset CSS**: Add a CSS reset in `app/globals.css` to avoid Next.js defaults:
  ```css
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  ```
- **Disable SSR for Testing**: Add `dynamic: 'force-dynamic'` to `app/page.tsx` to ensure client-side rendering:
  ```tsx
  export const dynamic = 'force-dynamic';
  ```

### Next Steps
The updated TSX should resolve styling issues by using local assets and a proper Tailwind setup. If the preview still looks worse, please share specific details about the visual discrepancies or errors. I can refine the code further or provide a custom CSS fallback if Tailwind continues to cause issues. Let me know how it looks now or what specific problems persist!
