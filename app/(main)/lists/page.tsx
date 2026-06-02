'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bookmark, Check, Compass, FolderPlus, Layers, List as ListIcon, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ListItem {
  id: string;
  tmdb_id: string;
  type: 'movie' | 'tv' | 'anime';
  title: string;
  poster_path: string | null;
  added_at: string;
}

interface UserList {
  id: string;
  name: string;
  emoji: string;
  items: ListItem[];
  createdAt: string;
}

const LISTS_KEY = 'streamvault-lists';
const LIST_ICONS = ['Queue', 'Canon', 'Heavy', 'Family', 'Anime', 'Local', 'Rewatch', 'Hidden'];
const STARTER_LISTS = [
  { name: 'Tonight Queue', emoji: 'Queue' },
  { name: 'Sunday Reset', emoji: 'Rewatch' },
  { name: 'Serious Anime Bridge', emoji: 'Anime' },
  { name: 'African Canon', emoji: 'Local' },
];

function posterSrc(path: string | null) {
  if (!path) return null;
  return path.startsWith('http') ? path : `https://image.tmdb.org/t/p/w300${path}`;
}

function itemHref(item: ListItem) {
  if (item.type === 'movie') return `/movies/${item.tmdb_id}`;
  if (item.type === 'anime') return `/anime/${item.tmdb_id.replace(/^mal-/, '')}`;
  return `/shows/${item.tmdb_id}`;
}

export default function ListsPage() {
  const [lists, setLists] = useState<UserList[]>([]);
  const [mounted, setMounted] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('Queue');
  const [activeListId, setActiveListId] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      try {
        const saved = localStorage.getItem(LISTS_KEY);
        setLists(saved ? JSON.parse(saved) : []);
      } catch (error) {
        console.error('Failed to parse lists', error);
        setLists([]);
      }
    };

    load();
    window.addEventListener('streamvault-lists-updated', load);
    setMounted(true);
    return () => window.removeEventListener('streamvault-lists-updated', load);
  }, []);

  useEffect(() => {
    if (mounted) localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
  }, [lists, mounted]);

  const createList = (name: string, emoji = selectedEmoji, items: ListItem[] = []) => {
    if (!name.trim()) return;
    if (lists.some((list) => list.name.toLowerCase() === name.trim().toLowerCase())) return;

    const newList: UserList = {
      id: crypto.randomUUID(),
      name: name.trim(),
      emoji,
      items,
      createdAt: new Date().toISOString(),
    };

    setLists([newList, ...lists]);
  };

  const handleCreateList = (event: React.FormEvent) => {
    event.preventDefault();
    createList(newListName);
    setNewListName('');
    setShowCreate(false);
  };

  const handleDeleteList = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!confirm('Delete this list?')) return;
    setLists(lists.filter((list) => list.id !== id));
    if (activeListId === id) setActiveListId(null);
  };

  if (!mounted) return null;

  const activeList = lists.find((list) => list.id === activeListId);

  return (
    <div className="min-h-screen bg-[#05050f] text-white">
      <div className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-transparent to-pink-600/5" />
        <div className="relative mx-auto max-w-screen-xl px-6 py-10">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_0_24px_rgba(99,102,241,0.2)]">
                <Layers className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="mb-1 text-3xl font-black tracking-tight md:text-4xl">My Lists</h1>
                <p className="text-sm font-medium text-white/45">Taste shelves for plans, people, moods, canon, and rewatch value</p>
              </div>
            </div>

            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-black shadow-[0_0_20px_rgba(255,255,255,0.15)] transition hover:bg-slate-200"
            >
              <Plus size={18} />
              New List
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-screen-xl px-6 py-10">
        <div className="mb-8 grid gap-3 md:grid-cols-3">
          <GuideCard icon={Bookmark} title="Watchlist is intent" text="Use Watchlist for titles you want to watch. Use Lists when a title belongs to a shelf: family night, hidden gems, African canon, or rewatchable." />
          <GuideCard icon={Compass} title="Lists are navigation" text="A good list turns discovery into a route. VAULT can later read these shelves as durable taste signals." />
          <GuideCard icon={Sparkles} title="Cards save here" text="Hover any movie, show, or anime card and use the list icon. Create a shelf in-place without leaving discovery." />
        </div>

        <div className="mb-10 flex flex-wrap gap-2">
          {STARTER_LISTS.map((template) => (
            <button
              key={template.name}
              onClick={() => createList(template.name, template.emoji)}
              className="rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-xs font-bold text-white/70 transition hover:border-white/25 hover:text-white"
            >
              + {template.name}
            </button>
          ))}
        </div>

        {showCreate && (
          <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/80 p-4 backdrop-blur-sm fade-in">
            <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a14] p-6 shadow-2xl">
              <button onClick={() => setShowCreate(false)} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 transition hover:bg-white/10">
                <X size={16} />
              </button>

              <h2 className="mb-6 text-xl font-black">Create New List</h2>
              <form onSubmit={handleCreateList}>
                <div className="mb-6">
                  <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-white/40">Shelf Type</label>
                  <div className="flex flex-wrap gap-2">
                    {LIST_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setSelectedEmoji(icon)}
                        className={cn(
                          'flex h-10 min-w-16 items-center justify-center rounded-xl border px-3 text-[11px] font-black transition-all',
                          selectedEmoji === icon ? 'border-indigo-500/50 bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.25)]' : 'border-white/5 bg-white/[0.03] hover:bg-white/10'
                        )}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-8">
                  <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-white/40">List Name</label>
                  <input
                    type="text"
                    value={newListName}
                    onChange={(event) => setNewListName(event.target.value)}
                    placeholder="e.g. No filler anime"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white transition-colors focus:border-indigo-500/50 focus:outline-none"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowCreate(false)} className="flex-1 rounded-xl bg-white/5 py-3 font-bold transition hover:bg-white/10">
                    Cancel
                  </button>
                  <button type="submit" disabled={!newListName.trim()} className="flex-1 rounded-xl bg-indigo-600 py-3 font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                    Create List
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeList ? (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="mb-8 flex items-center gap-4">
              <button onClick={() => setActiveListId(null)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 transition hover:bg-white/10">
                <X size={20} />
              </button>
              <h2 className="flex items-center gap-3 text-2xl font-black">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black uppercase tracking-wider text-white/55">{activeList.emoji}</span>
                {activeList.name}
              </h2>
            </div>

            {activeList.items.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] py-20 text-center">
                <ListIcon className="mx-auto mb-4 h-12 w-12 text-white/20" />
                <h3 className="mb-2 text-xl font-bold">This list is empty</h3>
                <p className="mx-auto mb-6 max-w-sm text-white/40">Hover any movie, show, or anime card and use the list icon. Lists are for shelves, plans, and taste signals.</p>
                <Link href="/discover" className="inline-block rounded-xl bg-white/10 px-6 py-2.5 font-bold text-white transition hover:bg-white/20">
                  Find Content
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {activeList.items.map((item) => {
                  const poster = posterSrc(item.poster_path);
                  return (
                    <Link key={item.id} href={itemHref(item)} className="group relative aspect-[2/3] overflow-hidden rounded-xl border border-white/10 bg-[#111]">
                      {poster ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={poster} alt={item.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-white/5 p-3 text-center text-sm">{item.title}</div>
                      )}
                      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                        <p className="truncate text-sm font-bold">{item.title}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ) : lists.length === 0 ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
            <div className="relative mb-6 h-24 w-24">
              <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 blur-xl" />
              <div className="relative flex h-full w-full items-center justify-center rounded-full border border-white/10 bg-[#0a0a14]">
                <FolderPlus className="h-10 w-10 text-white/30" />
              </div>
            </div>
            <h2 className="mb-3 text-2xl font-black text-white">Create your first list</h2>
            <p className="mb-8 max-w-sm leading-relaxed text-white/40">Start with a shelf that solves a real viewing problem: tonight, family-safe, serious anime, African canon, or hidden gems.</p>
            <button onClick={() => setShowCreate(true)} className="rounded-xl bg-white px-6 py-3 font-bold text-black shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-transform hover:scale-105">
              Create List
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {lists.map((list) => (
              <div
                key={list.id}
                onClick={() => setActiveListId(list.id)}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 shadow-lg transition-all hover:border-white/20 hover:bg-white/[0.06]"
              >
                <div className="absolute right-0 top-0 p-4">
                  <button onClick={(event) => handleDeleteList(list.id, event)} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/40 opacity-0 transition-colors hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100">
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white/50">{list.emoji}</div>
                <h3 className="mb-1 text-xl font-black transition-colors group-hover:text-indigo-400">{list.name}</h3>
                <p className="text-sm font-medium text-white/40">{list.items.length} {list.items.length === 1 ? 'item' : 'items'}</p>

                {list.items.length > 0 && (
                  <div className="mt-6 flex -space-x-3">
                    {list.items.slice(0, 4).map((item, index) => {
                      const poster = posterSrc(item.poster_path);
                      return (
                        <div key={item.id} className="h-10 w-10 overflow-hidden rounded-full border-2 border-[#1a1a24] bg-[#222] shadow-sm" style={{ zIndex: 10 - index }}>
                          {poster && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={poster} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                      );
                    })}
                    {list.items.length > 4 && (
                      <div className="z-0 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#1a1a24] bg-white/10 text-[10px] font-bold">
                        +{list.items.length - 4}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GuideCard({ icon: Icon, title, text }: { icon: typeof Bookmark; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
      <Icon className="mb-3 h-5 w-5 text-white/60" />
      <h2 className="text-sm font-black">{title}</h2>
      <p className="mt-1 text-xs leading-relaxed text-white/45">{text}</p>
    </div>
  );
}
