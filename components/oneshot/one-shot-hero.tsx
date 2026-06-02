'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flame, Laugh, Search, Shuffle, Smile, Sparkles, Wand2, Zap } from 'lucide-react';
import { ContentTypeSelector, type ContentTypeCard } from './content-type-selector';

const MOOD_CHIPS = [
  { id: 'comedy', label: 'Make me laugh', prompt: 'A genuinely funny comedy, not a romcom', icon: Laugh },
  { id: 'thriller', label: 'High tension', prompt: 'A gripping thriller or suspense film with high tension', icon: Zap },
  { id: 'feelgood', label: 'Feel good', prompt: 'Something warm, feel-good, uplifting', icon: Smile },
  { id: 'mindbend', label: 'Mind-bender', prompt: 'A mind-bending film with plot twists', icon: Sparkles },
  { id: 'action', label: 'Pure action', prompt: 'High-octane action film with great set pieces', icon: Flame },
  { id: 'lucky', label: 'Surprise me', prompt: 'Pick something from outside my usual comfort zone', icon: Shuffle },
];

export function OneShotHero() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showFormatSelector, setShowFormatSelector] = useState(false);
  const [formatCards, setFormatCards] = useState<ContentTypeCard[]>([]);
  const [interpretation, setInterpretation] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [finalQueryText, setFinalQueryText] = useState('');

  useEffect(() => {
    setShowFormatSelector(false);
    setQuery('');
  }, []);

  const handlePlay = async (event?: React.FormEvent, presetPrompt?: string) => {
    event?.preventDefault();
    const finalQuery = presetPrompt || query;
    if (!finalQuery.trim()) return;

    setIsLoading(true);
    setFinalQueryText(finalQuery);

    try {
      const res = await fetch('/api/ai/oneshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawQuery: finalQuery, userId: 'placeholder-user-id' }),
      });

      const data = await res.json();

      if (data.step === 'select_content_type') {
        setInterpretation(data.interpretation);
        setFormatCards(data.contentTypeCards);
        setSessionId(data.sessionId);
        setShowFormatSelector(true);
      } else {
        router.push(`/oneshot?q=${encodeURIComponent(finalQuery)}`);
      }
    } catch (err) {
      console.error(err);
      router.push(`/oneshot?q=${encodeURIComponent(finalQuery)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormatSelect = (type: string) => {
    router.push(`/oneshot?q=${encodeURIComponent(finalQueryText)}&format=${type}&session=${sessionId}`);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-white/8 bg-[linear-gradient(135deg,rgba(12,16,21,0.96),rgba(5,5,5,0.98))] p-5 shadow-2xl sm:p-7 md:p-9 lg:p-10">
      <div className="absolute left-1/2 top-0 h-full w-full max-w-[760px] -translate-x-1/2 rounded-full bg-[#00BFFF]/10 blur-[110px]" />
      <div className="absolute bottom-0 left-1/2 h-[45%] w-full max-w-[520px] -translate-x-1/2 rounded-full bg-[#8B5CF6]/10 blur-[90px]" />

      <div className="relative z-10 mx-auto w-full max-w-4xl space-y-7 text-center">
        {showFormatSelector ? (
          <ContentTypeSelector
            cards={formatCards}
            interpretation={interpretation}
            onSelect={handleFormatSelect}
          />
        ) : (
          <>
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#8B5CF6]/20 bg-[#8B5CF6]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-[#9f7aea]">
                <Sparkles size={14} />
                Vault One-Shot
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-lg sm:text-4xl md:text-5xl">
                Say the feeling. VAULT makes the call.
              </h1>
              <p className="mx-auto max-w-2xl text-sm font-medium leading-relaxed text-slate-400 md:text-base">
                No catalogue maze. Describe the night and StreamVault narrows it to a watch decision, not another row of maybe.
              </p>
            </div>

            <form onSubmit={handlePlay} className="relative w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#00BFFF] to-[#8B5CF6] opacity-30 blur transition duration-500 group-hover:opacity-60" />
              <div className="relative flex items-center overflow-hidden rounded-2xl border border-white/10 bg-black/60 p-2 shadow-2xl backdrop-blur-xl transition-all focus-within:border-white/30">
                <Search className="ml-4 hidden text-slate-400 sm:block" size={24} />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="e.g., completed crime drama, dark but not slow..."
                  className="flex-1 border-none bg-transparent px-3 py-3 text-base text-white placeholder:text-slate-500 focus:outline-none sm:px-4 sm:py-4 md:text-lg"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !query.trim()}
                  className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-black transition-transform hover:scale-105 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 sm:px-6 sm:py-4"
                >
                  {isLoading ? (
                    <>
                      <span className="h-5 w-5 rounded-full border-2 border-black border-t-transparent animate-spin" />
                      <span className="hidden sm:inline">Reading</span>
                    </>
                  ) : (
                    <>
                      <Wand2 size={19} />
                      <span className="hidden sm:inline">Decide</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
              <p className="mb-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Quick decisions</p>
              <div className="flex flex-wrap justify-center gap-2.5">
                {MOOD_CHIPS.map(({ id, label, prompt, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => handlePlay(undefined, prompt)}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-300 transition-all hover:scale-105 hover:bg-white/10 hover:text-white active:scale-95"
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
