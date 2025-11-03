import { useRouter } from "expo-router";
import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// -- FIREBASE CONFIG --
const firebaseConfig = {
  apiKey: "AIzaSyBtsOBlh52YZagsLXp9_dcCq4qhkHBSWnU",
  authDomain: "thepub-sigma.firebaseapp.com",
  projectId: "thepub-sigma",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Fetch questions from a single document: 'triviaQuestions' collection, 'questions' document
async function fetchAllQuestions() {
  const docRef = doc(db, "triviaQuestions", "questions");
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().questions || [];
  } else {
    return [];
  }
}

// Get trivia stats for the current user, or zeroed stats if not exist
async function getStatsFromFirebase(userId: string) {
  const statsRef = doc(db, "triviaStats", userId);
  const statsSnap = await getDoc(statsRef);
  if (statsSnap.exists()) {
    return statsSnap.data();
  } else {
    return { totalAnswered: 0, totalCorrect: 0 };
  }
}

// Save or update stats for this user
async function setStatsToFirebase(userId: string, totalAnswered: number, totalCorrect: number) {
  const statsRef = doc(db, "triviaStats", userId);
  await setDoc(statsRef, { totalAnswered, totalCorrect }, { merge: true });
}

// -- Sign In Component --
function SignInScreen({ onSuccess, onCancel }: { onSuccess: (user: any) => void; onCancel: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === "signin") {
        const result = await signInWithEmailAndPassword(auth, email, password);
        onSuccess(result.user);
      } else {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        onSuccess(result.user);
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <View style={styles.centered}>
      <Text style={{ fontSize: 27, fontWeight: "bold", color: "#ffe066", marginBottom: 14 }}>
        {mode === "signin" ? "Sign In" : "Create Account"}
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        placeholderTextColor="#ffefb6"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        secureTextEntry
        onChangeText={setPassword}
        placeholderTextColor="#ffefb6"
      />
      {error ? (
        <Text style={{ color: "#ff4444", marginBottom: 8, textAlign: "center" }}>{error}</Text>
      ) : null}
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleAction}
        disabled={loading}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>
          {loading
            ? "Loading..."
            : mode === "signin"
            ? "Sign In"
            : "Create Account"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.nextButton, { backgroundColor: "#917300", marginTop: 12, paddingVertical: 10 }]}
        onPress={() => setMode(mode === "signin" ? "signup" : "signin")}
        activeOpacity={0.8}
      >
        <Text style={[styles.buttonText, { fontSize: 15 }]}>
          {mode === "signin" ? "No account? Create one" : "Already have an account? Sign In"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.nextButton, { backgroundColor: "#9f2f2f", marginTop: 10, paddingVertical: 9 }]}
        onPress={onCancel}
        activeOpacity={0.8}
      >
        <Text style={[styles.buttonText, { fontSize: 15 }]}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function HomeScreen() {
  const [user, setUser] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<any>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [result, setResult] = useState("");
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [showSignIn, setShowSignIn] = useState(false);
  const router = useRouter();

  // Listen for user sign in/out
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) setShowSignIn(false);
    });
    return () => unsub();
  }, []);

  // Fetch questions and stats on mount or on user change
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const qs = await fetchAllQuestions();
        setQuestions(qs);
        if (qs.length) setCurrent(qs[Math.floor(Math.random() * qs.length)]);
        // Fetch stats
        const stats = await getStatsFromFirebase(user.uid);
        setTotalAnswered(stats.totalAnswered || 0);
        setTotalCorrect(stats.totalCorrect || 0);
      } catch (err: any) {
        Alert.alert("Error", err.message || String(err));
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Helper: typo-tolerance
  function isCorrectAnswer(guess: string, correctAnswer: string) {
    const correctWords = correctAnswer.split(/\s+/).filter(Boolean);
    const guessWords = guess.split(/\s+/).filter(Boolean);

    for (const cw of correctWords) {
      for (const gw of guessWords) {
        if (gw === cw || levenshtein(gw, cw) <= 2) {
          return true;
        }
      }
    }
    if (levenshtein(guess, correctAnswer) <= 2) return true;
    return false;
  }

  // Handle score and average updates
  const handleSubmit = async () => {
    if (!current) return;
    const correct = (current.answer || "").trim().toLowerCase();
    const guess = userAnswer.trim().toLowerCase();
    let gotIt = false;
    if (isCorrectAnswer(guess, correct)) {
      gotIt = true;
      setResult("✅ Correct!");
    } else {
      setResult(`❌ Incorrect. The answer is: ${current.answer}`);
    }

    // Update state stats
    setTotalAnswered((prev) => prev + 1);
    setTotalCorrect((prev) => prev + (gotIt ? 1 : 0));
    // Update Firestore stats
    try {
      const newTotalAnswered = totalAnswered + 1;
      const newTotalCorrect = totalCorrect + (gotIt ? 1 : 0);
      await setStatsToFirebase(user.uid, newTotalAnswered, newTotalCorrect);
    } catch (err: any) {
      console.error("Error saving stats:", err);
    }
  };

  // Reset for next question, no stats update here
  const handleNext = () => {
    if (questions.length) {
      let next;
      do {
        next = questions[Math.floor(Math.random() * questions.length)];
      } while (current && next && next.question === current.question && questions.length > 1);
      setCurrent(next);
      setUserAnswer("");
      setResult("");
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null);
    setTotalAnswered(0);
    setTotalCorrect(0);
    setQuestions([]);
    setCurrent(null);
    setUserAnswer("");
    setResult("");
    setLoading(false);
  };

  const percentCorrect = totalAnswered > 0 ? ((totalCorrect / totalAnswered) * 100).toFixed(1) : "0.0";

  // Show sign-in form as overlay/modal if requested
  if (showSignIn) {
    return <SignInScreen onSuccess={setUser} onCancel={() => setShowSignIn(false)} />;
  }

  if (loading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#ea9800" />
      </View>
    );

  if (!current)
    return (
      <View style={styles.centered}>
        <Text style={styles.noQuestions}>No trivia questions found.</Text>
      </View>
    );

  return (
    <KeyboardAvoidingView
      style={styles.barBackground}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="light" />
      <Image
        source={{
          uri: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=80",
        }}
        style={styles.backgroundImage}
        blurRadius={2}
        resizeMode="cover"
      />
      <View style={styles.overlay} />
      <View style={styles.container}>
        <Text style={styles.appName}>🍺 The Pub Trivia 🍺</Text>
        {/* Button Row for Daily Challenge, News, Stats, Sign In/Out */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.smallButton}
            onPress={() => router.push("/ridethebus")}
            activeOpacity={0.85}
          >
            <Text style={styles.smallButtonText}>🎯 Daily</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.smallButton}
            onPress={() => router.push("/news")}
            activeOpacity={0.85}
          >
            <Text style={styles.smallButtonText}>📰 News</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.smallButton}
            onPress={() => router.push("/stats")}
            activeOpacity={0.85}
          >
            <Text style={styles.smallButtonText}>📊 Stats</Text>
          </TouchableOpacity>

          {user ? (
            <TouchableOpacity
              style={[styles.smallButton, { backgroundColor: "#e35d31" }]}
              onPress={handleSignOut}
              activeOpacity={0.85}
            >
              <Text style={[styles.smallButtonText, { color: "#fff" }]}>🚪 Sign Out</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.smallButton, { backgroundColor: "#3b82f6" }]}
              onPress={() => setShowSignIn(true)}
              activeOpacity={0.85}
            >
              <Text style={[styles.smallButtonText, { color: "#fff" }]}>🔐 Sign In</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.card}>
          <Text style={styles.heading}>NFL Trivia</Text>
          <Text style={styles.question}>{current.question}</Text>
          {(current.imageurl || current.imageUrl) ? (
            <Image
              source={{ uri: current.imageurl || current.imageUrl }}
              style={styles.triviaImage}
              resizeMode="contain"
            />
          ) : null}
          <TextInput
            style={styles.input}
            value={userAnswer}
            onChangeText={setUserAnswer}
            placeholder="Type your answer"
            placeholderTextColor="#ffefb6"
            editable={!result}
          />
          {!result ? (
            <TouchableOpacity
              style={[styles.button, !userAnswer && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={!userAnswer}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>Submit</Text>
            </TouchableOpacity>
          ) : (
            <>
              <Text style={styles.result}>{result}</Text>
              <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.85}>
                <Text style={styles.buttonText}>Next Question</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
        {/* Show stats directly on the HomeScreen (optional!) */}
        <View style={{ marginTop: 8, alignItems: "center" }}>
          <Text style={{ color: "#ffe066", fontWeight: "bold", fontSize: 18 }}>
            📊 Total: {totalAnswered} | ✅: {totalCorrect} | Avg: {percentCorrect}%
          </Text>
          <Text style={{ color: "#fffbe7", fontSize: 13 }}>Stats are saved to your profile.</Text>
        </View>
        <Text style={styles.footer}>
          Powered by <Text style={{ fontWeight: "bold", color: "#fff" }}>The Pub</Text> • Enjoy responsibly!
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

// Levenshtein distance helper for typo-tolerance
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const v0 = new Array(b.length + 1).fill(0);
  const v1 = new Array(b.length + 1).fill(0);
  for (let i = 0; i < v0.length; i++) v0[i] = i;
  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j < v0.length; j++) v0[j] = v1[j];
  }
  return v1[b.length];
}

const styles = StyleSheet.create({
  barBackground: {
    flex: 1,
    backgroundColor: "#3c2200",
    position: "relative",
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.27,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#3c2200",
    opacity: 0.88,
  },
  container: {
    flex: 1,
    padding: 22,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
    gap: 8,
    flexWrap: "wrap",
  },
  smallButton: {
    backgroundColor: "#b45309",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 15,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.13,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
    marginHorizontal: 4,
    marginVertical: 2,
  },
  smallButtonText: {
    color: "#fffbe7",
    fontSize: 15,
    fontWeight: "bold",
    letterSpacing: 0.2,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#351a05",
  },
  appName: {
    fontSize: 30,
    fontWeight: "900",
    color: "#ffe066",
    textAlign: "center",
    marginBottom: 30,
    letterSpacing: 1.5,
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  heading: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    color: "#ea9800",
    marginBottom: 12,
    letterSpacing: 0.5,
    textShadowColor: "#fffbe755",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  card: {
    backgroundColor: "rgba(255,255,210,0.95)",
    borderRadius: 18,
    padding: 26,
    width: "100%",
    maxWidth: 370,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.13,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    marginBottom: 22,
  },
  question: {
    fontSize: 19,
    color: "#5a3200",
    marginBottom: 18,
    textAlign: "center",
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  triviaImage: {
    width: 210,
    height: 180,
    marginBottom: 13,
    borderRadius: 13,
    backgroundColor: "#ffe06633",
    alignSelf: "center",
  },
  input: {
    borderWidth: 1.8,
    borderColor: "#eab308",
    borderRadius: 11,
    padding: 12,
    fontSize: 17,
    marginBottom: 13,
    backgroundColor: "#fffbe7",
    width: "100%",
    color: "#7a4f00",
  },
  button: {
    backgroundColor: "#ea9800",
    paddingVertical: 13,
    borderRadius: 14,
    width: "100%",
    alignItems: "center",
    marginBottom: 5,
    marginTop: 3,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 5,
    elevation: 1,
  },
  buttonDisabled: {
    backgroundColor: "#e0a92b99",
  },
  buttonText: {
    color: "#fffbe7",
    fontWeight: "bold",
    fontSize: 18,
    letterSpacing: 0.5,
    textShadowColor: "#00000033",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  nextButton: {
    backgroundColor: "#22c55e",
    paddingVertical: 13,
    borderRadius: 14,
    width: "100%",
    alignItems: "center",
    marginTop: 16,
    shadowColor: "#000",
    shadowOpacity: 0.09,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  result: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 12,
    color: "#b45309",
    textShadowColor: "#fffbe799",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
  },
  noQuestions: {
    color: "#fffbe7",
    fontSize: 19,
    fontWeight: "600",
  },
  footer: {
    marginTop: 18,
    fontSize: 14,
    color: "#ffe066bb",
    textAlign: "center",
    fontWeight: "500",
    textShadowColor: "#00000044",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});
