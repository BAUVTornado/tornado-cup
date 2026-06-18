"use client";

import React, { useState, useEffect } from "react";

interface Match {
  id: number;
  homeTeam: string;
  awayTeam: string;
  homePoints: number;
  drawPoints: number;
  awayPoints: number;
  status: string;
  homeScore?: number;
  awayScore?: number;
}

export default function AdminDashboard() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [ms1, setMs1] = useState<number>(1);
  const [msX, setMsX] = useState<number>(2);
  const [ms2, setMs2] = useState<number>(3);
  const [scores, setScores] = useState<{ [key: number]: { home: string; away: string } }>({});

  // Düzenleme modu için state'ler
  const [editingMatchId, setEditingMatchId] = useState<number | null>(null);

  const loadMatches = () => {
    const savedMatches = localStorage.getItem("tornado_matches");
    if (savedMatches) {
      const parsedMatches: Match[] = JSON.parse(savedMatches);
      // İlk yüklemede de ID'ye göre büyükten küçüğe (yeniden eskiye) sıralıyoruz
      const sortedMatches = parsedMatches.sort((a, b) => b.id - a.id);
      setMatches(sortedMatches);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  // Form gönderildiğinde hem "Yeni Ekleme" hem de "Güncelleme" işlemini tek elden yönetiyoruz
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeTeam.trim() || !awayTeam.trim()) return alert("⚠️ Lütfen takım isimlerini doldurun!");

    if (editingMatchId !== null) {
      // DÜZENLEME MODU: ID'yi koruyarak sadece içerikleri haritalandırıp güncelliyoruz
      const updated = matches.map((m) => {
        if (m.id === editingMatchId) {
          return {
            ...m,
            homeTeam: homeTeam.trim(),
            awayTeam: awayTeam.trim(),
            homePoints: Number(ms1),
            drawPoints: Number(msX),
            awayPoints: Number(ms2),
          };
        }
        return m;
      });

      // Düzenleme sonrası sırayı bozmamak için tekrar sıralıyoruz
      const sortedUpdated = updated.sort((a, b) => b.id - a.id);
      setMatches(sortedUpdated);
      localStorage.setItem("tornado_matches", JSON.stringify(sortedUpdated));
      alert("🔄 Maç bilgileri ve puanları başarıyla güncellendi! Kullanıcı tahminleri korundu.");
      
      // Düzenleme modundan çık ve formu sıfırla
      setEditingMatchId(null);
    } else {
      // YENİ MAÇ EKLEME MODU
      const newMatch: Match = {
        id: Date.now(), // ID zaman damgası olduğu için yeni maçın ID'si her zaman daha büyüktür
        homeTeam: homeTeam.trim(),
        awayTeam: awayTeam.trim(),
        homePoints: Number(ms1),
        drawPoints: Number(msX),
        awayPoints: Number(ms2),
        status: "Beklemede"
      };

      // YENİLİK BURADA: 'newMatch' elemanını dizinin sonuna değil, BAŞINA ekliyoruz [...matches] yerine [newMatch, ...matches]
      const updated = [newMatch, ...matches];
      setMatches(updated);
      localStorage.setItem("tornado_matches", JSON.stringify(updated));
      alert("⚽ Yeni maç başarıyla listenin en üstüne eklendi!");
    }

    // Form alanlarını temizle
    setHomeTeam("");
    setAwayTeam("");
    setMs1(1);
    setMsX(2);
    setMs2(3);
  };

  // Düzenle butonuna basıldığında ilgili maçın verilerini yukarıdaki forma taşır
  const handleStartEdit = (match: Match) => {
    setEditingMatchId(match.id);
    setHomeTeam(match.homeTeam);
    setAwayTeam(match.awayTeam);
    setMs1(match.homePoints);
    setMsX(match.drawPoints);
    setMs2(match.awayPoints);
    
    // Sayfayı yukarı form alanına yumuşakça kaydırır
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Düzenleme işleminden vazgeçme fonksiyonu
  const handleCancelEdit = () => {
    setEditingMatchId(null);
    setHomeTeam("");
    setAwayTeam("");
    setMs1(1);
    setMsX(2);
    setMs2(3);
  };

  const handleToggleLock = (matchId: number) => {
    const updated = matches.map((m) => {
      if (m.id === matchId) {
        const nextStatus = m.status === "Beklemede" ? "Canlı" : "Beklemede";
        return { ...m, status: nextStatus };
      }
      return m;
    });
    setMatches(updated);
    localStorage.setItem("tornado_matches", JSON.stringify(updated));
  };

  const handleSaveScore = (matchId: number) => {
    const matchScore = scores[matchId];
    if (!matchScore || matchScore.home === "" || matchScore.away === "") {
      return alert("⚠️ Lütfen geçerli bir skor girin!");
    }

    const hScore = Number(matchScore.home);
    const aScore = Number(matchScore.away);

    // Negatif skor girilmesini engellemek için kontrol
    if (hScore < 0 || aScore < 0) {
      return alert("⚠️ Skorlar negatif değer alamaz!");
    }

    const updated = matches.map((m) => {
      if (m.id === matchId) {
        return {
          ...m,
          status: "Sonuçlandı",
          homeScore: hScore,
          awayScore: aScore
        };
      }
      return m;
    });

    setMatches(updated);
    localStorage.setItem("tornado_matches", JSON.stringify(updated));
    
    if (editingMatchId === matchId) {
      handleCancelEdit();
    }

    alert(`🎯 Skor kaydedildi! (${hScore} - ${aScore})`);
  };

  const handleDeleteMatch = (id: number) => {
    if (confirm("Bu maçı silmek istediğinize emin misiniz?")) {
      const updated = matches.filter((m) => m.id !== id);
      setMatches(updated);
      localStorage.setItem("tornado_matches", JSON.stringify(updated));
      
      if (editingMatchId === id) {
        handleCancelEdit();
      }
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🏆 Tornado Cup — Yönetim Paneli</h1>
        <p className="text-xs text-slate-500 mt-1">
          {editingMatchId !== null 
            ? "⚠️ Şu anda mevcut bir maçı düzenliyorsunuz. ID sabit kalacağı için tahminler silinmez." 
            : "Sistem, tüm fark seçimlerini otomatik +2 bonus puan olarak işler."}
        </p>
      </div>

      {/* DİNAMİK FORM ALANI */}
      <form onSubmit={handleFormSubmit} className={`bg-white rounded-2xl border p-6 space-y-4 transition-all ${editingMatchId !== null ? "border-amber-400 bg-amber-50/10 shadow-md" : "border-slate-100 shadow-xs"}`}>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex justify-between items-center">
          <span>{editingMatchId !== null ? "📝 KARŞILAŞMAYI DÜZENLE" : "✨ YENİ KARŞILAŞMA OLUŞTUR"}</span>
          {editingMatchId !== null && (
            <button type="button" onClick={handleCancelEdit} className="text-red-500 hover:underline normal-case font-bold cursor-pointer"> Düzenlemeyi İptal Et</button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Ev Sahibi Takım</label>
            <input type="text" placeholder="Örn: Türkiye" value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-orange-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Deplasman Takım</label>
            <input type="text" placeholder="Örn: Fransa" value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-orange-500" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1 text-center">
            <label className="text-[10px] font-bold text-slate-400 uppercase">MS 1 PUANI</label>
            <input type="number" min={1} value={ms1} onChange={(e) => setMs1(Number(e.target.value))} className="w-full text-center border border-slate-200 rounded-xl py-2.5 text-xs font-black" />
          </div>
          <div className="flex flex-col gap-1 text-center">
            <label className="text-[10px] font-bold text-slate-400 uppercase">MS X PUANI</label>
            <input type="number" min={1} value={msX} onChange={(e) => setMsX(Number(e.target.value))} className="w-full text-center border border-slate-200 rounded-xl py-2.5 text-xs font-black" />
          </div>
          <div className="flex flex-col gap-1 text-center">
            <label className="text-[10px] font-bold text-slate-400 uppercase">MS 2 PUANI</label>
            <input type="number" min={1} value={ms2} onChange={(e) => setMs2(Number(e.target.value))} className="w-full text-center border border-slate-200 rounded-xl py-2.5 text-xs font-black" />
          </div>
        </div>

        <button type="submit" className={`w-full text-white text-xs font-bold py-3 rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-xs ${editingMatchId !== null ? "bg-amber-500 hover:bg-amber-600" : "bg-orange-500 hover:bg-orange-600"}`}>
          {editingMatchId !== null ? "Değişiklikleri Güncelle" : "Maçı Oluştur ve Yayınla"}
        </button>
      </form>

      {/* FİKSTÜR LİSTESİ */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/60">
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-tight">📋 AKTİF FİKSTÜR LİSTESİ</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[600px]">
            <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b">
              <tr>
                <th className="p-4">MAÇ KARŞILAŞMASI</th>
                <th className="p-4 text-center">1 PUAN</th>
                <th className="p-4 text-center">X PUAN</th>
                <th className="p-4 text-center">2 PUAN</th>
                <th className="p-4 text-center">SKOR GİRİŞİ</th>
                <th className="p-4 text-right">KONTROL / AKSİYON</th>
              </tr>
            </thead>
            <tbody className="divide-y font-medium text-slate-700">
              {matches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 italic">Henüz bir maç eklenmemiş.</td>
                </tr>
              ) : (
                matches.map((match) => {
                  const isFinished = match.status === "Sonuçlandı";
                  const isLive = match.status === "Canlı";
                  const isBeingEdited = editingMatchId === match.id;

                  return (
                    <tr key={match.id} className={`transition-colors ${isBeingEdited ? "bg-amber-50/40" : "hover:bg-slate-50/40"}`}>
                      <td className="p-4">
                        <div className="font-bold text-slate-800 text-sm capitalize">{match.homeTeam} vs {match.awayTeam}</div>
                        <div className="mt-1">
                          {isFinished ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Bitti</span>
                          ) : isLive ? (
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 animate-pulse">🔒 Canlı / Kilitli</span>
                          ) : (
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">🔓 Tahmine Açık</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center font-bold text-emerald-600">+{match.homePoints} P</td>
                      <td className="p-4 text-center font-bold text-slate-500">+{match.drawPoints} P</td>
                      <td className="p-4 text-center font-bold text-blue-600">+{match.awayPoints} P</td>
                      
                      <td className="p-4 text-center">
                        {isFinished ? (
                          <span className="bg-emerald-100 text-emerald-800 font-black px-3 py-1 rounded-lg">MS: {match.homeScore} - {match.awayScore}</span>
                        ) : (
                          <div className="flex gap-1 justify-center items-center">
                            <input type="number" min={0} placeholder="0" className="w-8 text-center border rounded py-0.5 text-xs font-bold" value={scores[match.id]?.home ?? ""} onChange={(e) => setScores(prev => ({ ...prev, [match.id]: { ...prev[match.id], home: e.target.value } }))} />
                            <span>-</span>
                            <input type="number" min={0} placeholder="0" className="w-8 text-center border rounded py-0.5 text-xs font-bold" value={scores[match.id]?.away ?? ""} onChange={(e) => setScores(prev => ({ ...prev, [match.id]: { ...prev[match.id], away: e.target.value } }))} />
                            <button onClick={() => handleSaveScore(match.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-0.5 text-[10px] rounded cursor-pointer transition-colors">Bitir</button>
                          </div>
                        )}
                      </td>

                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        <button onClick={() => handleStartEdit(match)} disabled={isFinished} className={`px-2 py-1 text-[10px] font-bold rounded transition-colors cursor-pointer ${isFinished ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
                          ✏️ Düzenle
                        </button>

                        {!isFinished && (
                          <button onClick={() => handleToggleLock(match.id)} className={`px-2 py-1 text-[10px] font-bold rounded transition-colors cursor-pointer ${isLive ? "bg-slate-800 text-amber-400 hover:bg-slate-700" : "bg-red-500 hover:bg-red-600 text-white"}`}>
                            {isLive ? "🔓 Aç" : "🔒 Kapat"}
                          </button>
                        )}
                        
                        <button onClick={() => handleDeleteMatch(match.id)} className="text-slate-400 hover:text-red-500 font-bold text-xs transition-colors cursor-pointer">Sil</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}