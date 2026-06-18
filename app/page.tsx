"use client";

import { useState, useEffect } from "react";
// Firebase bağımlılıklarını ekliyoruz
import { auth, googleProvider, db } from "../firebase"; 
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";

interface Match {
  id: number | string;
  homeTeam: string;
  awayTeam: string;
  homePoints: number;
  awayPoints: number;
  drawPoints: number;
  league: string;
  status: string; // "Beklemede", "Canlı", "Sonuçlandı"
  homeScore?: number;
  awayScore?: number;
}

interface UserPrediction {
  id: number;
  matchId: number | string;
  matchName: string;
  userResult: string; // "MS 1 (Ev Sahibi)", "MS 0 (Beraberlik)", "MS 2 (Deplasman)"
  userDifference: string; // "Herhangi (Fark Yok)", "1 Fark", ... "6 veya Üzeri Fark"
  estimatedPoints: number;
}

interface LeaderboardUser {
  rank: number;
  username: string;
  totalPoints: number;
  correctPredictions: number;
  league: string;
}

export default function HomePage() {
  // Kullanıcı Durumları (Auth States)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [dbUsername, setDbUsername] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [inputUsername, setInputUsername] = useState<string>("");
  const [usernameError, setUsernameError] = useState<string>("");
  const [submittingUsername, setSubmittingUsername] = useState<boolean>(false);

  const [activeMatches, setActiveMatches] = useState<Match[]>([]);
  const [myPredictions, setMyPredictions] = useState<UserPrediction[]>([]);
  
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [resultType, setResultType] = useState("MS 1 (Ev Sahibi)");
  const [goalDifference, setGoalDifference] = useState("Herhangi (Fark Yok)");
  
  const [currentLeague] = useState<string>("dunya_kupasi");
  const [viewMode, setViewMode] = useState<string>("maclar");

  // Liderlik tablosu ve Sayfalama (Pagination) State'leri
  const [allLeaderboards, setAllLeaderboards] = useState<LeaderboardUser[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 50;

  // 1. KISIM: Google Auth ve Kullanıcı Takibi Kontrolü
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          // Firestore'dan kullanıcının seçtiği kullanıcı adını kontrol et
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists() && userDoc.data().username) {
            setDbUsername(userDoc.data().username);
          }
        } catch (error) {
          console.error("Firestore veri çekme hatası:", error);
        }
      } else {
        setCurrentUser(null);
        setDbUsername("");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. KISIM: Gerçek Kullanıcıları Veritabanından Çekme Alanı
  useEffect(() => {
    // Maçları yerel hafızadan yükle
    const savedMatchesRaw = localStorage.getItem("tornado_matches") || localStorage.getItem("system_matches") || localStorage.getItem("matches");
    let combinedMatches: Match[] = [];

    if (savedMatchesRaw) {
      combinedMatches = JSON.parse(savedMatchesRaw);
    } else {
      const sample = [
        { id: 1, homeTeam: "Brezilya", awayTeam: "Arjantin", homePoints: 1, awayPoints: 3, drawPoints: 2, league: "dunya_kupasi", status: "Beklemede" },
        { id: 2, homeTeam: "Fransa", awayTeam: "Fas", homePoints: 1, awayPoints: 4, drawPoints: 2, league: "dunya_kupasi", status: "Beklemede" }
      ];
      combinedMatches = sample;
      localStorage.setItem("tornado_matches", JSON.stringify(sample));
    }
    setActiveMatches(combinedMatches);

    const savedPredictions = localStorage.getItem("user_predictions");
    if (savedPredictions) {
      setMyPredictions(JSON.parse(savedPredictions));
    }

    // Firestore'dan gerçek kullanıcıları çekiyoruz
    const fetchRealLeaderboard = async () => {
      try {
        const q = query(collection(db, "users"), orderBy("totalPoints", "desc"));
        const querySnapshot = await getDocs(q);
        
        const realUsersList: LeaderboardUser[] = [];
        let rank = 1;

        querySnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          if (data.username) { // Sadece kullanıcı adı belirlemiş kişileri listele
            realUsersList.push({
              rank: rank++,
              username: data.username,
              totalPoints: data.totalPoints || 0,
              correctPredictions: data.correctPredictions || 0,
              league: "dunya_kupasi"
            });
          }
        });

        setAllLeaderboards(realUsersList);
      } catch (error) {
        console.error("Liderlik tablosu verileri çekilirken hata oluştu:", error);
      }
    };

    fetchRealLeaderboard();
  }, [viewMode, dbUsername]);

  // 3. KISIM: OTOMATİK PUAN SİSTEMİ - Maç Sonuçlandığında Puanı Firestore'a Otomatik Eşitler
  useEffect(() => {
    if (!currentUser || !dbUsername || activeMatches.length === 0 || myPredictions.length === 0) return;

    let totalPointsCalculated = 0;
    let correctCount = 0;

    myPredictions.forEach((pred) => {
      const targetMatch = activeMatches.find(m => m.id === pred.matchId);
      if (targetMatch && targetMatch.status === "Sonuçlandı") {
        const hScore = targetMatch.homeScore ?? 0;
        const aScore = targetMatch.awayScore ?? 0;
        
        let actualResult = "";
        if (hScore > aScore) actualResult = "MS 1 (Ev Sahibi)";
        else if (hScore === aScore) actualResult = "MS 0 (Beraberlik)";
        else actualResult = "MS 2 (Deplasman)";

        const actualDiff = Math.abs(hScore - aScore);
        let actualDiffLabel = "Herhangi (Fark Yok)";
        if (actualDiff === 1) actualDiffLabel = "1 Fark";
        else if (actualDiff === 2) actualDiffLabel = "2 Fark";
        else if (actualDiff === 3) actualDiffLabel = "3 Fark";
        else if (actualDiff === 4) actualDiffLabel = "4 Fark";
        else if (actualDiff === 5) actualDiffLabel = "5 Fark";
        else if (actualDiff >= 6) actualDiffLabel = "6 veya Üzeri Fark";

        let adminBasePoints = Number(targetMatch.homePoints) || 0;
        if (actualResult === "MS 0 (Beraberlik)") adminBasePoints = Number(targetMatch.drawPoints) || 0;
        if (actualResult === "MS 2 (Deplasman)") adminBasePoints = Number(targetMatch.awayPoints) || 0;

        if (pred.userResult === actualResult) {
          correctCount += 1;
          totalPointsCalculated += adminBasePoints;
          if (pred.userDifference === actualDiffLabel) {
            totalPointsCalculated += 2;
          }
        }
      }
    });

    // Veritabanına puanları kaydetme fonksiyonu
    const updateLivePoints = async () => {
      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const currentDbPoints = userDoc.data().totalPoints || 0;
          const currentDbCorrect = userDoc.data().correctPredictions || 0;

          // Sadece puanlarda veya doğru tahmin sayısında bir değişiklik varsa güncelleme yap (Sonsuz döngüyü önler)
          if (currentDbPoints !== totalPointsCalculated || currentDbCorrect !== correctCount) {
            await setDoc(userDocRef, {
              totalPoints: totalPointsCalculated,
              correctPredictions: correctCount
            }, { merge: true });
          }
        }
      } catch (err) {
        console.error("Kullanıcı puanı Firestore'a eşitlenirken hata:", err);
      }
    };

    updateLivePoints();
  }, [activeMatches, myPredictions, currentUser, dbUsername]);


  // Google Giriş Fonksiyonu
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Giriş hatası:", error);
      alert("Google ile giriş yapılırken bir hata oluştu.");
    }
  };

  // Çıkış Yapma Fonksiyonu
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Çıkış hatası:", error);
    }
  };

  // Benzersiz Kullanıcı Adı Kaydetme Fonksiyonu
  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingUsername) return;

    setUsernameError("");
    
    const cleanedUsername = inputUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");

    if (cleanedUsername.length < 3) {
      setUsernameError("Kullanıcı adı en az 3 karakter olmalı, boşluk ve Türkçe karakter içermemelidir.");
      return;
    }

    if (!currentUser) return;
    setSubmittingUsername(true);

    try {
      const q = query(collection(db, "users"), where("username", "==", cleanedUsername));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setUsernameError("Bu kullanıcı adı zaten alınmış! Lütfen başka bir tane deneyin.");
        setSubmittingUsername(false);
        return;
      }

      await setDoc(doc(db, "users", currentUser.uid), {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        username: cleanedUsername,
        totalPoints: 0,
        correctPredictions: 0,
        createdAt: new Date()
      }, { merge: true });

      setDbUsername(cleanedUsername);
      alert("Kullanıcı adınız başarıyla kaydedildi! Turnuvaya hazırsınız. 🚀");
    } catch (error: any) {
      console.error("Kullanıcı adı kaydetme hatası:", error);
      setUsernameError("Veritabanına bağlanılamadı. Lütfen Firestore ayarlarınızı kontrol edin.");
    } finally {
      setSubmittingUsername(false);
    }
  };

  const filteredMatches = activeMatches.filter(
    (m) => (m.league === currentLeague || !m.league) && m.status !== "Sonuçlandı"
  );

  const filteredLeaderboard = allLeaderboards.filter(u => u.league === currentLeague);
  const totalPages = Math.max(1, Math.ceil(filteredLeaderboard.length / itemsPerPage));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLeaderboardPageItems = filteredLeaderboard.slice(indexOfFirstItem, indexOfLastItem);

  const openPredictionModal = (match: Match) => {
    if (match.status === "Canlı") {
      alert("⚠️ Bu maç kilitlenmiştir, canlı durumdayken tahmin yapılamaz!");
      return;
    }

    const alreadyPredicted = myPredictions.some((p) => p.matchId === match.id);
    if (alreadyPredicted) {
      alert("⚠️ Bu maça zaten daha önce tahmin yaptınız!");
      return;
    }

    setSelectedMatch(match);
    setResultType("MS 1 (Ev Sahibi)");
    setGoalDifference("Herhangi (Fark Yok)");
  };

  const getSelectedPointsCalculation = () => {
    if (!selectedMatch) return { basePoints: 0, totalPoints: 0 };
    
    let basePoints = Number(selectedMatch.homePoints) || 0;
    if (resultType === "MS 0 (Beraberlik)") basePoints = Number(selectedMatch.drawPoints) || 0;
    if (resultType === "MS 2 (Deplasman)") basePoints = Number(selectedMatch.awayPoints) || 0;

    const extraPoints = 2;

    return { basePoints, totalPoints: basePoints + extraPoints };
  };

  const { basePoints, totalPoints: calculatedPoints } = getSelectedPointsCalculation();

  const handleSendPrediction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch) return;

    const fullMatchName = `${selectedMatch.homeTeam} - ${selectedMatch.awayTeam}`;

    const newPrediction: UserPrediction = {
      id: Date.now(),
      matchId: selectedMatch.id,
      matchName: fullMatchName,
      userResult: resultType,
      userDifference: goalDifference,
      estimatedPoints: calculatedPoints
    };

    const updatedPredictions = [...myPredictions, newPrediction];
    setMyPredictions(updatedPredictions);
    localStorage.setItem("user_predictions", JSON.stringify(updatedPredictions));

    setSelectedMatch(null); 
    alert(`🎯 Tahmininiz başarıyla kaydedildi! Maksimum kazanç: ${calculatedPoints} Puan 🚀`);
  };

  const checkPredictionResult = (pred: UserPrediction) => {
    const targetMatch = activeMatches.find(m => m.id === pred.matchId);
    if (!targetMatch) return { label: "Maç Sistemden Silindi", color: "bg-slate-100 text-slate-500" };
    
    if (targetMatch.status !== "Sonuçlandı") {
      if (targetMatch.status === "Canlı") {
        return { label: "⏱️ Canlı / Kilitli", color: "bg-red-50 text-red-600 border border-red-100 font-bold animate-pulse" };
      }
      return { label: "⏳ Sonuç Bekleniyor", color: "bg-blue-50 text-blue-600 border border-blue-100" };
    }

    const hScore = targetMatch.homeScore ?? 0;
    const aScore = targetMatch.awayScore ?? 0;
    
    let actualResult = "";
    if (hScore > aScore) actualResult = "MS 1 (Ev Sahibi)";
    else if (hScore === aScore) actualResult = "MS 0 (Beraberlik)";
    else actualResult = "MS 2 (Deplasman)";

    const actualDiff = Math.abs(hScore - aScore);
    let actualDiffLabel = "Herhangi (Fark Yok)";
    if (actualDiff === 1) actualDiffLabel = "1 Fark";
    else if (actualDiff === 2) actualDiffLabel = "2 Fark";
    else if (actualDiff === 3) actualDiffLabel = "3 Fark";
    else if (actualDiff === 4) actualDiffLabel = "4 Fark";
    else if (actualDiff === 5) actualDiffLabel = "5 Fark";
    else if (actualDiff >= 6) actualDiffLabel = "6 veya Üzeri Fark";

    let adminBasePoints = Number(targetMatch.homePoints) || 0;
    if (actualResult === "MS 0 (Beraberlik)") adminBasePoints = Number(targetMatch.drawPoints) || 0;
    if (actualResult === "MS 2 (Deplasman)") adminBasePoints = Number(targetMatch.awayPoints) || 0;

    if (pred.userResult === actualResult) {
      let finalEarnedPoints = adminBasePoints;
      if (pred.userDifference === actualDiffLabel) finalEarnedPoints += 2;

      return { 
        label: `🟢 Kazandı (+${finalEarnedPoints} P)`, 
        color: "bg-emerald-100 text-emerald-800 border border-emerald-200 font-black",
        scoreLabel: `Skor: ${hScore}-${aScore}`
      };
    } else {
      return { 
        label: "🔴 Kaybetti (0 P)", 
        color: "bg-rose-100 text-rose-800 border border-rose-200",
        scoreLabel: `Skor: ${hScore}-${aScore}`
      };
    }
  };

  const visiblePredictions = myPredictions.filter((pred) =>
    activeMatches.some((match) => match.id === pred.matchId)
  );

  // YÜKLENİYOR EKRANI
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-500">
        Sistem yükleniyor, lütfen bekleyin...
      </div>
    );
  }

  // GİRİŞ YAPILMAMIŞSA GÖSTERİLECEK EKRAN
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full text-center space-y-5">
          <span className="text-5xl block">🏆</span>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">TORNADO CUP'A HOŞ GELDİN</h2>
          <p className="text-slate-500 text-xs font-medium leading-relaxed">
            Dünya Kupası maç tahminlerine katılmak, puan toplamak ve liderlik tablosunda yarışmak için giriş yapmalısın.
          </p>
          <button 
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold py-3 px-4 rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google Hesabı ile Giriş Yap
          </button>
        </div>
      </div>
    );
  }

  // GİRİŞ YAPILMİŞ AMA KULLANICI ADI SEÇİLMEMİŞSE GÖSTERİLECEK EKRAN
  if (!dbUsername) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-300 shadow-2xl max-w-sm w-full space-y-5">
          <div className="text-center space-y-2">
            <span className="text-4xl block">👤</span>
            <h2 className="text-lg font-black text-slate-900 uppercase">Kullanıcı Adı Belirle</h2>
            <p className="text-slate-600 text-[11px] font-medium leading-relaxed">
              Liderlik tablosunda diğer oyunculara görünecek benzersiz bir takma ad seçin. Türkçe karakter ve boşluk bırakmayın.
            </p>
          </div>
          <form onSubmit={handleSaveUsername} className="space-y-4">
            <div className="flex flex-col gap-1">
              <input 
                type="text"
                placeholder="Örn: tornado_tahmin"
                value={inputUsername}
                onChange={(e) => setInputUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-400 bg-white text-slate-900 text-sm font-bold shadow-xs outline-hidden focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
                required
              />
              {usernameError && (
                <span className="text-[11px] font-extrabold text-rose-600 bg-rose-5 p-2 rounded-md border border-rose-200 mt-1 block">
                  ⚠️ {usernameError}
                </span>
              )}
            </div>
            <button 
              type="submit"
              disabled={submittingUsername}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-amber-400 font-black py-3 px-4 rounded-xl text-xs tracking-wide transition-colors cursor-pointer shadow-md uppercase"
            >
              {submittingUsername ? "Kontrol Ediliyor..." : "Kullanıcı Adını Onayla ve Başla"}
            </button>
          </form>
          <div className="text-center pt-2">
            <button onClick={handleLogout} className="text-[10px] text-slate-500 underline font-bold hover:text-slate-800">Başka Hesapla Giriş Yap</button>
          </div>
        </div>
      </div>
    );
  }

  // ANA SİTE EKRANI
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* ÜST BAR */}
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            <h1 className="text-lg font-black tracking-wider text-amber-400 uppercase">Tornado Cup</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-black text-amber-400">@{dbUsername}</p>
              <p className="text-[10px] text-slate-400 font-medium">{currentUser.email}</p>
            </div>
            <button onClick={handleLogout} className="text-[10px] font-bold bg-slate-800 hover:bg-rose-900 hover:text-white px-2.5 py-1.5 rounded-md text-slate-300 border border-slate-700 transition-colors cursor-pointer">Çıkış Yap</button>
          </div>
        </div>
      </header>

      {/* İÇ NAVİGASYON */}
      <div className="bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 flex gap-6">
          <button onClick={() => setViewMode("maclar")} className={`py-3.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${viewMode === "maclar" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"}`}>📋 Fikstür & Tahmin Yap</button>
          <button onClick={() => setViewMode("sirala")} className={`py-3.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${viewMode === "sirala" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-600"}`}>📊 Dünya Kupası Sıralaması</button>
        </div>
      </div>

      {/* İÇERİK ALANI */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {viewMode === "maclar" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* SOL TARAF: FİKSTÜR */}
            <div className="lg:col-span-2 space-y-4">
              <div className="border-b border-slate-200 pb-2 mb-4">
                <h2 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2"><span>⚡</span> Dünya Kupası Maç Fikstürü</h2>
              </div>

              {filteredMatches.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs">
                  <span className="text-4xl block mb-2">🗓️</span>
                  <p className="text-slate-500 text-sm font-medium">Aktif bir maç girilmemiştir.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredMatches.map((match) => {
                    const isPredicted = myPredictions.some((p) => p.matchId === match.id);
                    const isLive = match.status === "Canlı";
                    
                    return (
                      <div key={match.id} className={`bg-white rounded-xl border transition-all p-5 flex flex-col sm:flex-row justify-between items-center gap-4 ${isPredicted ? "border-emerald-200 bg-emerald-50/10 shadow-xs" : "border-slate-200 hover:shadow-xs"}`}>
                        <div className="text-center sm:text-left space-y-2">
                          <h3 className="text-base font-bold text-slate-800 flex items-center justify-center sm:justify-start gap-3">
                            <span className="bg-slate-900 text-amber-400 text-[10px] font-black uppercase px-2 py-0.5 rounded-sm tracking-wide">{isLive ? "🔴 CANLI / KİLİTLİ" : "Dünya Kupası"}</span>
                            <span className="tracking-tight capitalize">{match.homeTeam}</span>
                            <span className="text-slate-400 font-medium text-xs">vs</span>
                            <span className="tracking-tight capitalize">{match.awayTeam}</span>
                          </h3>
                          <div className="flex gap-2 text-[10px] font-mono justify-center sm:justify-start">
                            <span className="text-emerald-600 bg-emerald-50/80 px-2 py-0.5 rounded border border-emerald-100">1: +{match.homePoints} P</span>
                            <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/50">X: +{match.drawPoints} P</span>
                            <span className="text-blue-600 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-100">2: +{match.awayPoints} P</span>
                          </div>
                        </div>
                        <div className="w-full sm:w-auto text-center">
                          {isPredicted ? (
                            <span className="inline-flex justify-center w-full sm:w-auto items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-bold px-4 py-2 rounded-xl border border-emerald-200">✅ Tahmin Yapıldı</span>
                          ) : isLive ? (
                            <span className="inline-flex justify-center w-full sm:w-auto items-center gap-1 bg-slate-100 text-slate-400 text-xs font-bold px-4 py-2 rounded-xl border border-slate-200">🔒 Kilitli</span>
                          ) : (
                            <button onClick={() => openPredictionModal(match)} className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold px-5 py-2.5 rounded-xl transition-colors cursor-pointer shadow-xs">⚽ Tahmin Yap</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SAĞ TARAF: TAHMİN GEÇMİŞİ */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center justify-between">
                <span>📌 TAHMİN GEÇMİŞİM & KUPONLARIM</span>
                <span className="bg-slate-900 text-amber-400 font-mono text-xs px-2 py-0.5 rounded-md">{visiblePredictions.length}</span>
              </h3>
              
              {visiblePredictions.length === 0 ? (
                <div className="py-12 text-center text-slate-400 italic text-xs">Henüz gönderilmiş tahmininiz yok.</div>
              ) : (
                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {[...visiblePredictions].reverse().map((p) => {
                    const statusInfo = checkPredictionResult(p);
                    return (
                      <div key={p.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 shadow-3xs">
                        <div className="flex justify-between items-start gap-2">
                          <p className="font-bold text-xs text-slate-800 tracking-tight capitalize">{p.matchName}</p>
                          {statusInfo.scoreLabel && (
                            <span className="text-[10px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded">{statusInfo.scoreLabel}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                          <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">{p.userResult}</span>
                          <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-md">{p.userDifference}</span>
                        </div>
                        <div className={`text-[10px] text-center p-1 rounded-md font-bold ${statusInfo.color}`}>{statusInfo.label}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* LİDERLİK TABLOSU */}
        {viewMode === "sirala" && (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden max-w-2xl mx-auto">
            <div className="p-6 bg-slate-900 text-white border-b border-slate-800 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black text-amber-400 uppercase tracking-wider">🥇 Dünya Kupası Sıralaması</h2>
              </div>
              <span className="bg-slate-800 border border-slate-700 text-amber-400 font-mono text-xs font-bold px-3 py-1.5 rounded-lg">Sayfa {currentPage} / {totalPages}</span>
            </div>
            <div className="overflow-x-auto">
              {filteredLeaderboard.length === 0 ? (
                <div className="p-12 text-center text-slate-500 font-medium">
                  Henüz kayıtlı kullanıcı bulunmamaktadır.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b">
                    <tr className="text-slate-400 text-[10px] font-bold uppercase">
                      <th className="py-3 px-6 text-center w-20">Sıra</th>
                      <th className="py-3 px-6">Kullanıcı Adı</th>
                      <th className="py-3 px-6 text-center">Tutturulan Maç</th>
                      <th className="py-3 px-6 text-right">Turnuva Puanı</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-medium">
                    {currentLeaderboardPageItems.map((user) => (
                      <tr key={user.rank} className="hover:bg-slate-50/60">
                        <td className="py-4 px-6 text-center">
                          {user.rank <= 3 ? <span className="font-bold bg-amber-100 px-1.5 py-0.5 rounded">#{user.rank}</span> : `#${user.rank}`}
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-900">@{user.username}</td>
                        <td className="py-4 px-6 text-center text-slate-500">{user.correctPredictions} Maç</td>
                        <td className="py-4 px-6 text-right font-black text-amber-600">{user.totalPoints} Pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>

      {/* TAHMİN YAPMA MODAL */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full border shadow-xl overflow-hidden transform animate-in fade-in duration-150">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Dünya Kupası Tahmini</span>
              <button onClick={() => setSelectedMatch(null)} className="text-slate-400 hover:text-white font-bold text-sm bg-slate-800 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSendPrediction} className="p-5 space-y-4">
              <div className="text-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                <h4 className="font-extrabold text-base text-slate-800 capitalize">{selectedMatch.homeTeam} - {selectedMatch.awayTeam}</h4>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center font-mono text-[10px] bg-slate-900 text-white p-2.5 rounded-xl">
                <div className="py-1 rounded bg-slate-800">1: <span className="text-emerald-400 font-bold">+{selectedMatch.homePoints} P</span></div>
                <div className="py-1 rounded bg-slate-800">X: <span className="text-slate-400 font-bold">+{selectedMatch.drawPoints} P</span></div>
                <div className="py-1 rounded bg-slate-800">2: <span className="text-blue-400 font-bold">+{selectedMatch.awayPoints} P</span></div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Maç Sonucu</label>
                  <select value={resultType} onChange={(e) => setResultType(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white outline-hidden">
                    <option value="MS 1 (Ev Sahibi)">MS 1 ({selectedMatch.homeTeam} Kazanır)</option>
                    <option value="MS 0 (Beraberlik)">MS 0 (Berabere Biter)</option>
                    <option value="MS 2 (Deplasman)">MS 2 ({selectedMatch.awayTeam} Kazanır)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Aradaki Gol Farkı</label>
                  <select value={goalDifference} onChange={(e) => setGoalDifference(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white outline-hidden">
                    <option value="Herhangi (Fark Yok)">Herhangi (Fark Yok) (+2 Bonus Puan)</option>
                    <option value="1 Fark">1 Farkla Biter (+2 Bonus Puan)</option>
                    <option value="2 Fark">2 Farkla Biter (+2 Bonus Puan)</option>
                    <option value="3 Fark">3 Farkla Biter (+2 Bonus Puan)</option>
                    <option value="4 Fark">4 Farkla Biter (+2 Bonus Puan)</option>
                    <option value="5 Fark">5 Farkla Biter (+2 Bonus Puan)</option>
                    <option value="6 veya Üzeri Fark">6 veya Üzeri Farkla Biter (+2 Bonus Puan)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200/60 rounded-xl flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium">Seçim Değeri: <strong>+{basePoints} P</strong></span>
                <span className="text-slate-800 font-bold">Toplam Kazanç: <span className="bg-amber-500 text-slate-950 font-black px-2 py-1 rounded-md ml-1">+{calculatedPoints} Puan</span></span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button type="button" onClick={() => setSelectedMatch(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl cursor-pointer">Vazgeç</button>
                <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold py-2.5 rounded-xl cursor-pointer shadow-md">Tahmini Gönder</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}