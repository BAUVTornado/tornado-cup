"use client";

import React, { useState, useEffect } from "react";

interface LeaderboardUser {
  rank: number;
  username: string;
  totalPoints: number;
  correctPredictions: number;
  league: string;
}

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
  // SEKMELERİ TAKİP EDEN STATE ("matches" veya "leaderboard")
  const [activeTab, setActiveTab] = useState<"matches" | "leaderboard">("matches");

  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  
  // SIRALAMA SAYFALAMA STATE'LERİ
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50; 
  const totalPages = 20;   

  // Verileri yükle
  useEffect(() => {
    const savedMatches = localStorage.getItem("tornado_matches");
    if (savedMatches) setMatches(JSON.parse(savedMatches));

    const savedLeaderboard = localStorage.getItem("tornado_leaderboard");
    if (savedLeaderboard) {
      setLeaderboard(JSON.parse(savedLeaderboard));
    } else {
      // Hafızada yoksa otomatik 1000 kişi üret
      const mockUsers = Array.from({ length: 1000 }, (_, i) => ({
        rank: i + 1,
        username: `Katılımcı_${i + 1}`,
        totalPoints: 1500 - i * 1,
        correctPredictions: Math.max(0, 30 - Math.floor(i / 30)),
        league: "sampiyonlar_ligi"
      }));
      setLeaderboard(mockUsers);
      localStorage.setItem("tornado_leaderboard", JSON.stringify(mockUsers));
    }
  }, []);

  // Sıralama Sayfa Değişimi
  const handlePageChange = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Aktif sayfadaki kullanıcılar
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = leaderboard.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="space-y-6">
      
      {/* BAŞLIK */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">📊 Panel Özeti</h1>
        <p className="text-xs text-slate-500 mt-1">Turnuva durumunu sekmelerden anlık olarak takip edin.</p>
      </div>

      {/* ŞEKİLSEL SEKMELER (TABS PANELİ) */}
      <div className="flex bg-slate-200/70 p-1 rounded-xl w-fit gap-1 shadow-inner">
        <button
          onClick={() => setActiveTab("matches")}
          className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
            activeTab === "matches"
              ? "bg-amber-500 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
          }`}
        >
          ⚽ Maçların Durumu
        </button>
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
            activeTab === "leaderboard"
              ? "bg-amber-500 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
          }`}
        >
          🏆 1000 Kişilik Sıralama
        </button>
      </div>

      {/* --- SEKMEYE GÖRE DEĞİŞEN İÇERİK ALANI --- */}
      
      {/* 1. SEKME: MAÇLARIN DURUMU SEKMESİ */}
      {activeTab === "matches" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-amber-50/20">
            <h2 className="text-sm font-bold text-slate-800">Sistemdeki Aktif & Biten Maçlar</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase font-bold border-b border-slate-100">
                <tr>
                  <th className="p-4">MAÇ</th>
                  <th className="p-4 text-center">1 ORANI</th>
                  <th className="p-4 text-center">X ORANI</th>
                  <th className="p-4 text-center">2 ORANI</th>
                  <th className="p-4 text-right">DURUM / SKOR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {matches.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">Henüz bir maç eklenmemiş.</td>
                  </tr>
                ) : (
                  matches.map((match) => {
                    const isFinished = match.status === "Sonuçlandı";
                    return (
                      <tr key={match.id} className="hover:bg-amber-50/10">
                        <td className="p-4 font-bold text-slate-800">
                          {match.homeTeam} vs {match.awayTeam}
                        </td>
                        <td className="p-4 text-center text-amber-600 font-bold">+{match.homePoints} Pts</td>
                        <td className="p-4 text-center text-amber-600 font-bold">+{match.drawPoints} Pts</td>
                        <td className="p-4 text-center text-amber-600 font-bold">+{match.awayPoints} Pts</td>
                        <td className="p-4 text-right">
                          {isFinished ? (
                            <span className="inline-block bg-emerald-50 text-emerald-700 font-extrabold px-3 py-1 rounded-lg border border-emerald-200">
                              MS: {match.homeScore} - {match.awayScore}
                            </span>
                          ) : (
                            <span className="inline-block bg-amber-50 text-amber-700 font-extrabold px-3 py-1 rounded-lg border border-amber-200 animate-pulse">
                              • Canlı / Beklemede
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. SEKME: SIRALAMA SEKMESİ */}
      {activeTab === "leaderboard" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-amber-50/20">
            <h2 className="text-sm font-bold text-slate-800">Canlı Sıralama (Top 1000)</h2>
            <span className="text-xs font-bold text-amber-700 bg-amber-100/70 px-2.5 py-1 rounded-lg">
              Sayfa {currentPage} / {totalPages}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase font-bold border-b border-slate-100">
                <tr>
                  <th className="p-4 w-20">SIRA</th>
                  <th className="p-4">KULLANICI ADI</th>
                  <th className="p-4 text-center">DOĞRU TAHMİN</th>
                  <th className="p-4 text-right">TOPLAM PUAN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {currentUsers.map((user) => (
                  <tr key={user.rank} className="hover:bg-amber-50/10">
                    <td className="p-4 font-bold text-slate-800">
                      {user.rank <= 3 ? (
                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-xs font-bold ${
                          user.rank === 1 ? "bg-amber-500 text-white shadow-xs" :
                          user.rank === 2 ? "bg-orange-400 text-white" :
                          "bg-amber-600/20 text-amber-800"
                        }`}>
                          {user.rank}
                        </span>
                      ) : (
                        <span className="text-slate-400 pl-1">#{user.rank}</span>
                      )}
                    </td>
                    <td className="p-4 font-bold text-slate-800">{user.username}</td>
                    <td className="p-4 text-center text-slate-500 font-semibold">{user.correctPredictions} Maç</td>
                    <td className="p-4 text-right font-bold text-amber-600">+{user.totalPoints} Pts</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 20 SAYFALIK PAGINATION BUTONLARI */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="w-full sm:w-auto px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold hover:bg-slate-50 hover:text-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              ◀ Önceki
            </button>

            <div className="flex items-center gap-1 overflow-x-auto max-w-xs sm:max-w-md py-1 px-2 no-scrollbar">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`w-7 h-7 flex items-center justify-center text-xs font-bold rounded-lg shrink-0 transition-all cursor-pointer ${
                    currentPage === page
                      ? "bg-amber-500 text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:border-amber-500 hover:text-amber-500"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="w-full sm:w-auto px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold hover:bg-slate-50 hover:text-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Sonraki ▶
            </button>
          </div>
        </div>
      )}

    </div>
  );
}