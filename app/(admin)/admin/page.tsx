"use client";

import React, { useState, useEffect } from "react";
import { auth, googleProvider } from "@/firebase";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";

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
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"matches" | "leaderboard">("matches");
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const totalPages = 20;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && currentUser.email === "umitkoyun275@gmail.com") {
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const savedMatches = localStorage.getItem("tornado_matches");
      if (savedMatches) setMatches(JSON.parse(savedMatches));

      const savedLeaderboard = localStorage.getItem("tornado_leaderboard");
      if (savedLeaderboard) {
        setLeaderboard(JSON.parse(savedLeaderboard));
      } else {
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
    }
  }, [user]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = leaderboard.slice(indexOfFirstItem, indexOfLastItem);

  if (loading) return <div className="p-20 text-center font-bold">Yükleniyor...</div>;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <h1 className="text-2xl font-bold mb-6">Admin Paneline Giriş Yap</h1>
        <button 
          onClick={() => signInWithPopup(auth, googleProvider)}
          className="bg-amber-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-amber-600 transition"
        >
          Google ile Admin Girişi Yap
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">📊 Panel Özeti</h1>
          <p className="text-sm text-slate-500">Hoşgeldin, {user.email}</p>
        </div>
        <button onClick={() => signOut(auth)} className="text-xs bg-red-100 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-200">
          Çıkış Yap
        </button>
      </div>

      <div className="flex bg-slate-200/70 p-1 rounded-xl w-fit gap-1 shadow-inner">
        <button onClick={() => setActiveTab("matches")} className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === "matches" ? "bg-amber-500 text-white" : "text-slate-600"}`}>⚽ Maçlar</button>
        <button onClick={() => setActiveTab("leaderboard")} className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === "leaderboard" ? "bg-amber-500 text-white" : "text-slate-600"}`}>🏆 Sıralama</button>
      </div>

      {activeTab === "matches" && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <table className="w-full text-left text-xs">
            <thead><tr className="text-slate-400"><th>MAÇ</th></tr></thead>
            <tbody>{matches.map(m => <tr key={m.id} className="border-t"><td>{m.homeTeam} vs {m.awayTeam}</td></tr>)}</tbody>
          </table>
        </div>
      )}

      {activeTab === "leaderboard" && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 uppercase">
              <tr><th className="p-2">SIRA</th><th className="p-2">KULLANICI</th><th className="p-2">PUAN</th></tr>
            </thead>
            <tbody>
              {currentUsers.map(user => (
                <tr key={user.rank} className="border-t">
                  <td className="p-2 font-bold text-slate-800">#{user.rank}</td>
                  <td className="p-2">{user.username}</td>
                  <td className="p-2 text-amber-600 font-bold">{user.totalPoints} Pts</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}