"use client";

import { useState } from "react";

// Tahmin bilgilerinin yapısı
interface Prediction {
  id: number;
  matchName: string; // Hangi maç olduğu
  resultType: string; // MS 1, MS 0, MS 2
  goalDifference: string; // Kaç fark olacağı
}

export default function PredictionsPage() {
  // Hafızadaki örnek tahmin listesi
  const [predictions, setPredictions] = useState<Prediction[]>([
    { id: 1, matchName: "Fenerbahçe - Galatasaray", resultType: "MS 1 (Ev Sahibi)", goalDifference: "1 Fark" },
    { id: 2, matchName: "Real Madrid - Barcelona", resultType: "MS 2 (Deplasman)", goalDifference: "3 Fark" }
  ]);

  // Form kutularının hafıza alanları
  const [matchName, setMatchName] = useState("");
  const [resultType, setResultType] = useState("MS 1");
  const [goalDifference, setGoalDifference] = useState("Herhangi (Fark Yok)");

  // Yeni Tahmin Ekleme Fonksiyonu
  const handleAddPrediction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchName) {
      alert("Lütfen bir maç adı yazın!");
      return;
    }

    const newPrediction: Prediction = {
      id: Date.now(),
      matchName: matchName,
      resultType: resultType,
      goalDifference: goalDifference
    };

    setPredictions([...predictions, newPrediction]);
    setMatchName(""); // Kutuyu temizle
  };

  // Tahmin Silme Fonksiyonu
  const handleDeletePrediction = (idToCancel: number) => {
    setPredictions(predictions.filter((p) => p.id !== idToCancel));
  };

  return (
    <div className="space-y-8">
      {/* Sayfa Başlığı */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">📝 Tahmin Yönetimi</h1>
        <p className="text-sm text-slate-500 mt-1">
          Sadece Maç Sonucu ve Gol Farkı üzerinden basit tahminler ekle.
        </p>
      </div>

      {/* TAHMİN EKLEME FORMU */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="w-2 h-5 bg-blue-500 rounded-full"></span>
          Yeni Tahmin Oluştur
        </h3>

        <form onSubmit={handleAddPrediction} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          
          {/* Maç Seçimi / Adı */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Maç Adı</label>
            <input 
              type="text" 
              placeholder="Örn: Fenerbahçe - Galatasaray" 
              value={matchName}
              onChange={(e) => setMatchName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-hidden" 
            />
          </div>

          {/* Maç Sonucu Seçimi (Açılır Kutu - Select) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Maç Sonucu</label>
            <select 
              value={resultType}
              onChange={(e) => setResultType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-hidden"
            >
              <option value="MS 1 (Ev Sahibi)">MS 1 (Ev Sahibi Kazanır)</option>
              <option value="MS 0 (Beraberlik)">MS 0 (Berabere Biter)</option>
              <option value="MS 2 (Deplasman)">MS 2 (Deplasman Kazanır)</option>
            </select>
          </div>

          {/* Gol Farkı Seçimi (Açılır Kutu - Select) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Aradaki Gol Farkı</label>
            <select 
              value={goalDifference}
              onChange={(e) => setGoalDifference(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-hidden"
            >
              <option value="Herhangi (Fark Yok)">Herhangi (Fark Yok)</option>
              <option value="1 Fark">1 Farkla Biter</option>
              <option value="2 Fark">2 Farkla Biter</option>
              <option value="3 Fark">3 Farkla Biter</option>
              <option value="4 Fark">4 Farkla Biter</option>
              <option value="5 Fark">5 veya Üzeri Farkla Biter</option>
            </select>
          </div>

          {/* Kaydet Butonu */}
          <button 
            type="submit" 
            className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-semibold text-sm py-2 px-4 rounded-lg shadow-sm cursor-pointer transition-colors"
          >
            ✨ Tahmini Kaydet
          </button>
        </form>
      </div>

      {/* TAHMİN LİSTESİ TABLOSU */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-800">Aktif Tahminler</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="py-3 px-6">Maç</th>
                <th className="py-3 px-6">Tahmin (Maç Sonucu)</th>
                <th className="py-3 px-6">Gol Farkı</th>
                <th className="py-3 px-6 text-right">İşlem</th> 
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {predictions.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-6 font-semibold text-slate-800">{p.matchName}</td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
                      {p.resultType}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-medium text-slate-600">{p.goalDifference}</td>
                  <td className="py-4 px-6 text-right">
                    <button 
                      onClick={() => handleDeletePrediction(p.id)}
                      className="inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-600 active:bg-rose-200 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border border-rose-200/40 transition-colors"
                    >
                      🗑️ Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}