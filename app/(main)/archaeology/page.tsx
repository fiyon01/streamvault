'use client';

import { useState } from 'react';
import { Search, History, Upload, Download, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils/cn';

export default function ArchaeologyPage() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState<any>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setResults(null);

    try {
      const res = await fetch('/api/archaeology/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawQuery: query })
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStats(null);

    try {
      const text = await file.text();
      const res = await fetch('/api/archaeology/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent: text })
      });
      const data = await res.json();
      setImportStats(data);
    } catch (err) {
      console.error('Import failed', err);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg p-6 md:p-12 max-w-5xl mx-auto space-y-12 pb-32">
      
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-4 rounded-full bg-[#00BFFF]/10 text-[#00BFFF] mb-2">
          <History size={32} />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white">Find something you watched</h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Describe it however you remember it. Vague is fine. We'll figure it out.
        </p>
      </div>

      {/* Main Search Input */}
      <form onSubmit={handleSearch} className="relative group max-w-3xl mx-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-[#00BFFF] to-[#8B5CF6] rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
        <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 shadow-2xl focus-within:border-white/30 transition-colors">
          <textarea 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={"e.g., \"There was a show around 2012, a guy kept waking up on the same day, I think it was sci-fi, the ending was really dark...\""}
            className="w-full bg-transparent border-none text-white p-4 text-lg md:text-xl resize-none focus:outline-none placeholder:text-slate-600 min-h-[120px]"
            disabled={isLoading}
          />
          <div className="flex justify-end pt-2 border-t border-white/5">
            <button 
              type="submit"
              disabled={isLoading || !query.trim()}
              className="bg-white text-black px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              Find It
            </button>
          </div>
        </div>
      </form>

      {/* Results Section */}
      {results && (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-8">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <SparkleIcon /> We think it might be one of these:
          </h2>
          
          <div className="space-y-4">
            {results.map((res: any, idx: number) => (
              <div key={idx} className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 flex gap-6 hover:bg-white/[0.02] transition-colors">
                <div className="relative w-24 h-36 shrink-0 rounded-lg overflow-hidden bg-slate-900 border border-white/5">
                  {res.content?.poster_path && (
                    <Image
                      src={`https://image.tmdb.org/t/p/w342${res.content.poster_path}`}
                      alt={res.content.title || res.content.name}
                      fill
                      className="object-cover"
                    />
                  )}
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-2">
                    <span className="text-xs font-black text-[#00BFFF]">{Math.round((res.matchScore || 0.8) * 100)}% Match</span>
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-black text-white">{res.content?.title || res.content?.name}</h3>
                    <span className="text-slate-500 text-sm">{(res.content?.release_date || res.content?.first_air_date || '').split('-')[0]}</span>
                    {res.fromImportedHistory && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/30">
                        In your Netflix History
                      </span>
                    )}
                  </div>
                  
                  <div className="bg-[#8B5CF6]/5 border border-[#8B5CF6]/20 rounded-xl p-3 mb-4">
                    <p className="text-slate-300 text-sm">
                      <span className="text-[#8B5CF6] font-bold">Why it matches: </span>
                      {res.matchReason}
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <button className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-bold transition-colors">
                      ✓ That's it!
                    </button>
                    <button className="px-5 py-2 text-slate-500 hover:text-slate-300 text-sm font-bold transition-colors">
                      ✗ Not this
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {results.length === 0 && (
              <div className="text-center p-12 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-slate-400">We couldn't find any exact matches. Try adding a few more details!</p>
              </div>
            )}
          </div>
          
          <div className="text-center pt-4">
            <p className="text-slate-500 text-sm mb-3">Not finding it? Add more details ↓</p>
            <button className="text-[#00BFFF] hover:text-white font-bold text-sm transition-colors">
              + Add a detail
            </button>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center justify-center gap-4 text-slate-600 font-bold max-w-3xl mx-auto py-8">
        <div className="h-px bg-white/10 flex-1" />
        OR
        <div className="h-px bg-white/10 flex-1" />
      </div>

      {/* History Import Section */}
      <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 text-center hover:border-white/30 transition-colors group relative overflow-hidden">
          {isImporting && (
            <div className="absolute inset-0 bg-black/80 z-10 flex flex-col items-center justify-center backdrop-blur-sm">
              <Loader2 className="animate-spin text-[#E50914] mb-3" size={32} />
              <p className="text-white font-bold animate-pulse">Matching titles to Vault...</p>
            </div>
          )}
          
          {importStats ? (
            <div className="h-full flex flex-col items-center justify-center py-4">
              <CheckCircle2 size={48} className="text-green-500 mb-4" />
              <h3 className="text-white font-bold text-xl mb-1">Import Complete!</h3>
              <p className="text-slate-400 text-sm">Matched {importStats.matched} out of {importStats.total} items.</p>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto bg-[#E50914]/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Download size={24} className="text-[#E50914]" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Import Netflix History</h3>
              <p className="text-slate-400 text-sm mb-6">
                Search your own viewing archive. Upload your Netflix ViewingActivity.csv
              </p>
              
              <div className="flex justify-center gap-2">
                <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors inline-flex items-center gap-2">
                  <Upload size={16} /> Choose File
                  <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                </label>
                <a href="/mock-netflix-history.csv" download className="bg-transparent border border-white/20 hover:border-white/40 text-slate-300 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors inline-flex items-center gap-2">
                  <FileText size={16} /> Get Mock CSV
                </a>
              </div>
            </>
          )}
        </div>

        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 text-center opacity-50 cursor-not-allowed">
          <div className="w-16 h-16 mx-auto bg-[#00A8E1]/10 rounded-full flex items-center justify-center mb-4">
            <Download size={24} className="text-[#00A8E1]" />
          </div>
          <h3 className="text-white font-bold text-lg mb-2">Import Prime History</h3>
          <p className="text-slate-400 text-sm mb-6">
            Coming soon to StreamVault.
          </p>
          <button disabled className="bg-white/5 text-slate-500 px-5 py-2.5 rounded-xl font-bold text-sm">
            Coming Soon
          </button>
        </div>
      </div>
    </div>
  );
}

function SparkleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8B5CF6]">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}
