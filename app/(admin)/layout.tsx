"use client"; // Rota kontrolünü anlık yapmak için ekledik

import React from "react";
import { usePathname } from "next/navigation"; // O an hangi adreste olduğumuzu söyler

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname(); // Tarayıcıdaki adresi alır (Örn: /admin veya /admin/matches)

  // Linklerin aktif olup olmadığını kontrol eden küçük bir yardımcı fonksiyon
  const isActive = (path: string) => pathname === path;

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900 font-sans">
      
      {/* SOL MENÜ (SIDEBAR) */}
      <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col gap-6 shadow-xl">
        
        {/* Başlık alanı */}
        <div className="text-xl font-bold tracking-wider text-emerald-400 border-b border-slate-800 pb-4">
          TORNADO ADMIN
        </div>

        {/* Menü Linkleri */}
        <nav className="flex flex-col gap-2 flex-grow">
          <a
            href="/admin"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
              isActive("/admin")
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span>📊</span> Panel Özeti
          </a>

          <a
            href="/admin/matches"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
              isActive("/admin/matches")
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span>⚽</span> Maç Yönetimi
          </a>

          {/* Tahminler kısmı buradan kaldırıldı */}
        </nav>

        {/* Çıkış Yap Butonu */}
        <div className="border-t border-slate-800 pt-4">
          <a
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition-all duration-200"
          >
            <span>🚪</span> Çıkış Yap
          </a>
        </div>
      </aside>

      {/* SAĞ İÇERİK ALANI */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>

    </div>
  );
}