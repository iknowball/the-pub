"use client";
import { auth } from "@/lib/firebase";
import { makeRedirectUri, ResponseType } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { addDoc, collection, doc, getDoc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useUser } from "../_layout";

WebBrowser.maybeCompleteAuthSession();

const db = getFirestore();

async function fetchAllQuestions() {
  const docRef = doc(db, "triviaQuestions", "questions");
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().questions || [];
  } else {
    return [];
  }
}

async function getStatsFromFirebase(userId: string) {
  const statsRef = doc(db, "triviaStats", userId);
  const statsSnap = await getDoc(statsRef);
  if (statsSnap.exists()) {
    return statsSnap.data();
  } else {
    return { totalAnswered: 0, totalCorrect: 0, lastAnsweredDay: "", answeredToday: 0 };
  }
}

async function setStatsToFirebase(userId: string, totalAnswered: number, totalCorrect: number, todayAnswered: number, todayDate: string) {
  const statsRef = doc(db, "triviaStats", userId);
  await setDoc(
    statsRef,
    { totalAnswered, totalCorrect, lastAnsweredDay: todayDate, answeredToday: todayAnswered },
    { merge: true }
  );
}

function getTodayDateStr() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

export default function HomeScreen() {
  const { user: globalUser, loading: authLoadingGlobal, signOutUser } = useUser();
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<any>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [result, setResult] = useState("");
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [answeredToday, setAnsweredToday] = useState(0);
  const [lastAnsweredDay, setLastAnsweredDay] = useState("");
  const router = useRouter();

  // Daily trivia settings
  const MAX_DAILY = 3;
  const todayDate = getTodayDateStr();

  // Auth modal states
  const [showSignIn, setShowSignIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  // Animation
  const cardAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(cardAnim, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
  }, []);

  const EXPO_CLIENT_ID = "<EXPO_CLIENT_ID>";
  const IOS_CLIENT_ID = "<IOS_CLIENT_ID>";
  const ANDROID_CLIENT_ID = "<ANDROID_CLIENT_ID>";
  const WEB_CLIENT_ID = "<WEB_CLIENT_ID>";

  const redirectUri = makeRedirectUri({ useProxy: true });

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: EXPO_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
    scopes: ["profile", "email"],
    redirectUri,
    responseType: ResponseType.IdToken,
  });

  // Track today's questions and index for uniqueness
  const [todaysQuestions, setTodaysQuestions] = useState<any[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const qs = await fetchAllQuestions();
        // Shuffle and pick 3 unique questions for today
        const shuffled = qs.sort(() => Math.random() - 0.5);
        setTodaysQuestions(shuffled.slice(0, MAX_DAILY));
        setQuestionIndex(0);
        if (shuffled.length) setCurrent(shuffled[0]);
        await loadStats();
      } catch (err: any) {
        Alert.alert("Error", err.message || String(err));
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStats = async () => {
    try {
      const id = globalUser?.uid ?? "anon_guest";
      const stats = await getStatsFromFirebase(id);
      setTotalAnswered(stats.totalAnswered || 0);
      setTotalCorrect(stats.totalCorrect || 0);
      // Track today's count and reset at new day
      if (stats.lastAnsweredDay === todayDate) {
        setAnsweredToday(stats.answeredToday ?? 0);
        setLastAnsweredDay(todayDate);
      } else {
        setAnsweredToday(0);
        setLastAnsweredDay(todayDate);
      }
    } catch (err) {
      console.warn("Failed to load stats", err);
    }
  };

  useEffect(() => {
    if (!authLoadingGlobal) {
      loadStats();
    }
    // eslint-disable-next-line
  }, [globalUser, authLoadingGlobal]);

  useEffect(() => {
    if (request) {
      try {
        // console.log("Google auth request URL:", (request as any).url);
      } catch (e) {}
    }
  }, [request, redirectUri]);

  useEffect(() => {
    (async () => {
      if (response?.type === "success") {
        setAuthLoading(true);
        try {
          const idToken = response.authentication?.idToken || response.params?.id_token;
          if (!idToken) throw new Error("No idToken returned from Google auth response.");
          const credential = GoogleAuthProvider.credential(idToken);
          await signInWithCredential(auth, credential);
          setShowSignIn(false);
          setAuthEmail("");
          setAuthPassword("");
          setAuthError("");
        } catch (err: any) {
          setAuthError(err.message || String(err));
        } finally {
          setAuthLoading(false);
        }
      } else if (response?.type === "error") {
        setAuthError("Google auth error: " + JSON.stringify(response));
      }
    })();
  }, [response]);

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

  // Handle answer submit and stats write
  const handleSubmit = async () => {
    if (!current) return;
    if (answeredToday >= MAX_DAILY) return;
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
    const newTotalAnswered = totalAnswered + 1;
    const newTotalCorrect = totalCorrect + (gotIt ? 1 : 0);
    const newAnsweredToday = answeredToday + 1;
    setTotalAnswered(newTotalAnswered);
    setTotalCorrect(newTotalCorrect);
    setAnsweredToday(newAnsweredToday);

    try {
      const id = globalUser?.uid ?? "anon_guest";
      await setStatsToFirebase(id, newTotalAnswered, newTotalCorrect, newAnsweredToday, todayDate);
    } catch (err: any) {
      console.error("Error saving stats:", err);
    }

    try {
      const id = globalUser?.uid ?? "anon_guest";
      await addDoc(collection(db, "challengeStats"), {
        userId: id,
        correct: gotIt ? 1 : 0,
        total: 1,
        ts: serverTimestamp(),
      });
    } catch (e) {}
  };

  // Step through unique questions
  const handleNext = () => {
    if (answeredToday >= MAX_DAILY) return;
    if (questionIndex < todaysQuestions.length - 1) {
      const nextIdx = questionIndex + 1;
      setQuestionIndex(nextIdx);
      setCurrent(todaysQuestions[nextIdx]);
      setUserAnswer("");
      setResult("");
    }
  };

  const percentCorrect = totalAnswered > 0 ? ((totalCorrect / totalAnswered) * 100).toFixed(1) : "0.0";

  const handleEmailSignIn = async () => {
    setAuthError("");
    setAuthLoading(true);
    try {
      await signInWithEmailAndPassword(auth, authEmail, authPassword);
      setShowSignIn(false);
      setAuthEmail("");
      setAuthPassword("");
    } catch (err: any) {
      setAuthError(err.message || String(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    setAuthError("");
    setAuthLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      setShowSignIn(false);
      setAuthEmail("");
      setAuthPassword("");
    } catch (err: any) {
      setAuthError(err.message || String(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGooglePress = async () => {
    setAuthError("");
    try {
      await promptAsync({ useProxy: true });
    } catch (err: any) {
      setAuthError(err.message || String(err));
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      Alert.alert("Signed out");
    } catch (err: any) {
      Alert.alert("Sign out failed", err.message || String(err));
    }
  };

  if (loading)
    return (
      <View style={feedStyles.centered}>
        <ActivityIndicator size="large" color="#ea9800" />
      </View>
    );

  return (
    <KeyboardAvoidingView style={feedStyles.barBackground} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar />
      <ScrollView contentContainerStyle={{flexGrow:1, justifyContent:"center", alignItems:"center"}}>
        <Image source={{ uri: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=80" }} style={feedStyles.backgroundImage} blurRadius={2} resizeMode="cover" />
        <View style={feedStyles.overlay} />
        <Animated.View
          style={[
            feedStyles.slickCard,
            {
              transform: [
                { scale: cardAnim.interpolate({ inputRange: [0,1], outputRange: [0.95,1] }) }
              ]
            },
          ]}>
          <View style={feedStyles.buttonRow}>
            <TouchableOpacity style={feedStyles.smallButton} onPress={() => router.push("/ridethebus")} activeOpacity={0.85}>
              <Text style={feedStyles.smallButtonText}>🎯 Daily</Text>
            </TouchableOpacity>
            <TouchableOpacity style={feedStyles.smallButton} onPress={() => router.push("/news")} activeOpacity={0.85}>
              <Text style={feedStyles.smallButtonText}>📰 News</Text>
            </TouchableOpacity>
            <TouchableOpacity style={feedStyles.smallButton} onPress={() => router.push("/stats")} activeOpacity={0.85}>
              <Text style={feedStyles.smallButtonText}>📊 Stats</Text>
            </TouchableOpacity>
            <TouchableOpacity style={feedStyles.smallButton} onPress={() => router.push("/socialbar")} activeOpacity={0.85}>
              <Text style={feedStyles.smallButtonText}>🍻 Social</Text>
            </TouchableOpacity>
          </View>
          <Text style={feedStyles.challengeTitle}>🍺 The Pub Trivia 🍺</Text>
          <Text style={feedStyles.heading}>NFL Trivia</Text>
          {(answeredToday >= MAX_DAILY || questionIndex >= todaysQuestions.length) ? (
            <View style={{alignItems:"center",paddingVertical:32}}>
              <Text style={feedStyles.noQuestions}>Swing by tomorrow for another shot!</Text>
              <Text style={{ color: "#fae6c6", marginTop: 8, fontSize: 15, textAlign:"center" }}>
                You’ve answered 3 questions today.{"\n"}Come back after midnight for more!
              </Text>
            </View>
          ) : current ? (
            <>
              <Text style={feedStyles.feedQuestion}>{current?.question ?? "No trivia questions found."}</Text>
              {(current?.imageurl || current?.imageUrl) ? (
                <Image source={{ uri: current.imageurl || current.imageUrl }} style={feedStyles.feedImage} resizeMode="contain" />
              ) : null}
              <View style={{height:32}}/>
              <TextInput
                style={feedStyles.input}
                value={userAnswer}
                onChangeText={setUserAnswer}
                placeholder="Type your answer"
                placeholderTextColor="#775703"
                editable={!result}
              />
              {!result ? (
                <TouchableOpacity
                  style={[feedStyles.actionButton, !userAnswer && feedStyles.actionDisabled]}
                  onPress={handleSubmit}
                  disabled={!userAnswer}
                  activeOpacity={0.85}
                >
                  <Text style={feedStyles.actionText}>Submit</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <Text style={feedStyles.feedResultNoShadow}>{result}</Text>
                  <TouchableOpacity style={feedStyles.nextButton} onPress={handleNext} activeOpacity={0.85}>
                    <Text style={feedStyles.actionText}>Next Question</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          ) : (
            <Text style={feedStyles.noQuestions}>No trivia questions found.</Text>
          )}
          <Text style={feedStyles.statsInfo}>
            📊 Total: {totalAnswered} | ✅: {totalCorrect} | Avg: {percentCorrect}%
          </Text>
        </Animated.View>
        <View style={{ marginTop: 8, alignItems: "center" }}>
          <Text style={{ color: "#fffbe7", fontSize: 13 }}>Stats are saved to your profile.</Text>
        </View>
        <View style={{ marginTop: 12, alignItems: "center", width: "100%" }}>
          {authLoadingGlobal ? (
            <ActivityIndicator color="#ea9800" />
          ) : globalUser ? (
            <>
              <Text style={{ color: "#fffbe7", fontWeight: "700", marginBottom: 8 }}>
                Signed in as {globalUser.email || globalUser.displayName || globalUser.uid}
                {globalUser?.isAnonymous ? " (anonymous)" : ""}
              </Text>
              <TouchableOpacity style={[feedStyles.actionButton, { backgroundColor: "#b91c1c" }]} onPress={handleSignOut}>
                <Text style={feedStyles.actionText}>Sign Out</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={feedStyles.actionButton} onPress={() => setShowSignIn(true)}>
                <Text style={feedStyles.actionText}>Sign in / Create account</Text>
              </TouchableOpacity>
              <Text style={{ color: "#ffe066", marginTop: 6 }}>Sign in to save scores & view your cloud stats.</Text>
            </>
          )}
        </View>
        <Text style={feedStyles.footer}>
          Powered by <Text style={{ fontWeight: "bold", color: "#fff" }}>The Pub</Text> • Enjoy responsibly!
        </Text>
      </ScrollView>
      <Modal visible={showSignIn} animationType="slide" transparent onRequestClose={() => { if (!authLoading) setShowSignIn(false); }}>
        <View style={modalStyles.modalBg}>
          <View style={modalStyles.modalContent}>
            <Text style={modalStyles.modalTitle}>Sign in or Create Account</Text>
            <TextInput style={modalStyles.authInput} placeholder="Email" placeholderTextColor="#ffd" value={authEmail} onChangeText={setAuthEmail} keyboardType="email-address" autoCapitalize="none" editable={!authLoading} />
            <TextInput style={modalStyles.authInput} placeholder="Password" placeholderTextColor="#ffd" value={authPassword} onChangeText={setAuthPassword} secureTextEntry editable={!authLoading} />
            <View style={{ flexDirection: "row", gap: 10, justifyContent: "center", marginTop: 6 }}>
              <TouchableOpacity style={[modalStyles.authBtn, { backgroundColor: "#facc15" }]} onPress={handleEmailSignIn} disabled={authLoading || !authEmail || !authPassword}>
                <Text style={{ fontWeight: "800" }}>{authLoading ? "Working..." : "Sign In"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[modalStyles.authBtn, { backgroundColor: "#b45309" }]} onPress={handleCreateAccount} disabled={authLoading || !authEmail || !authPassword}>
                <Text style={{ fontWeight: "800" }}>{authLoading ? "Working..." : "Create"}</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ textAlign: "center", marginVertical: 10, color: "#fffbe7" }}>— or —</Text>
            <TouchableOpacity style={[modalStyles.authBtn, modalStyles.authGoogle]} onPress={handleGooglePress} disabled={!request || authLoading}>
              <Text style={{ color: "#fff", fontWeight: "800" }}>{authLoading ? "Working..." : "Continue with Google"}</Text>
            </TouchableOpacity>
            {!!authError && <Text style={{ color: "#ffcccc", marginTop: 10, textAlign: "center" }}>{authError}</Text>}
            <TouchableOpacity style={[modalStyles.triviaCloseBtn, { marginTop: 12 }]} onPress={() => { if (!authLoading) { setShowSignIn(false); setAuthError(""); } }}>
              <Text style={{ color: "#fff", fontWeight: "800" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

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

const feedStyles = StyleSheet.create({
  barBackground: {
    flex: 1,
    backgroundColor: "#190f03",
    position: "relative",
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.19,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#190f03",
    opacity: 0.91,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#2b180e",
  },
  slickCard: {
    backgroundColor: "#33200d",
    borderWidth: 0,
    borderRadius: 25,
    paddingVertical: 33,
    paddingHorizontal: 18,
    maxWidth: 430,
    width: "96%",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOpacity: 0.33,
    shadowRadius: 17,
    shadowOffset: { width: 0, height: 7 },
    elevation: 7,
    zIndex:2,
    minHeight: 0,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
    width: "100%"
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
  },
  smallButtonText: {
    color: "#fffbe7",
    fontSize: 15,
    fontWeight: "bold",
    letterSpacing: 0.2,
  },
  challengeTitle: {
    color: "#ffe066",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 9,
    marginTop: 5,
    letterSpacing: 1,
    width: "100%",
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
  feedQuestion: {
    fontSize: 19,
    color: "#fae6c6",
    marginBottom: 16,
    textAlign: "center",
    fontWeight: "600",
    letterSpacing: 0.2
  },
  feedImage: {
    width: 272,
    height: 244,
    marginBottom: 13,
    borderRadius: 14,
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
    color: "#60460c"
  },
  actionButton: {
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
  actionDisabled: {
    backgroundColor: "#e0a92b99"
  },
  actionText: {
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
  feedResultNoShadow: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 12,
    color: "#b45309",
  },
  statsInfo: {
    color: "#ffe066",
    fontWeight: "bold",
    fontSize: 17,
    marginTop: 16,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  noQuestions: {
    color: "#fffbe7",
    fontSize: 19,
    fontWeight: "600"
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
  }
});

const modalStyles = StyleSheet.create({
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "92%", maxWidth: 420, backgroundColor: "#7a4210", borderRadius: 14, padding: 18, alignItems: "center" },
  modalTitle: { fontSize: 20, color: "#fde68a", fontWeight: "800", marginBottom: 10 },
  authInput: { width: "100%", padding: 10, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.06)", color: "#fde68a", marginBottom: 8, borderWidth: 1, borderColor: "#facc15" },
  authBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  authGoogle: { backgroundColor: "#4285F4", marginTop: 6 },
  triviaCloseBtn: { backgroundColor: "#d97706", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, marginTop: 12 },
});
