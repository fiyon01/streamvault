'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ListPlus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type ListItem = {
  id: string;
  tmdb_id: string;
  type: 'movie' | 'tv' | 'anime';
  title: string;
  poster_path: string | null;
  added_at: string;
};

type UserList = {
  id: string;
  name: string;
  emoji: string;
  items: ListItem[];
  createdAt: string;
};

const LISTS_KEY = 'streamvault-lists';

export function AddToListButton({
  id,
  title,
  type,
  posterPath,
  className,
}: {
  id: string;
  title: string;
  type: 'movie' | 'tv' | 'anime';
  posterPath: string | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<UserList[]>([]);
  const [newName, setNewName] = useState('');
  const [added, setAdded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const loadLists = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(LISTS_KEY) || '[]') as UserList[];
      setLists(Array.isArray(parsed) ? parsed : []);
    } catch {
      setLists([]);
    }
  };

  const saveLists = (next: UserList[]) => {
    localStorage.setItem(LISTS_KEY, JSON.stringify(next));
    setLists(next);
    window.dispatchEvent(new Event('streamvault-lists-updated'));
  };

  const item: ListItem = {
    id: `${type}-${id}`,
    tmdb_id: id,
    type,
    title,
    poster_path: posterPath,
    added_at: new Date().toISOString(),
  };

  const addToList = (listId: string) => {
    const next = lists.map((list) => {
      if (list.id !== listId) return list;
      if (list.items.some((existing) => existing.id === item.id)) return list;
      return { ...list, items: [item, ...list.items] };
    });
    saveLists(next);
    setAdded(true);
    setOpen(false);
  };

  const createAndAdd = (name = 'Tonight Queue') => {
    const list: UserList = {
      id: crypto.randomUUID(),
      name: name.trim() || 'Tonight Queue',
      emoji: 'list',
      items: [item],
      createdAt: new Date().toISOString(),
    };
    saveLists([list, ...lists]);
    setNewName('');
    setAdded(true);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          loadLists();
          setOpen((value) => !value);
        }}
        className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-black/65 text-white backdrop-blur-md transition hover:bg-white hover:text-black"
        title="Add to list"
      >
        {added ? <Check size={15} /> : <ListPlus size={15} />}
      </button>

      {open && (
        <div
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          className="absolute left-0 top-10 z-[80] w-56 rounded-xl border border-white/15 bg-[#080a12]/95 p-2 text-left shadow-2xl backdrop-blur-xl"
        >
          <div className="px-2 pb-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Save to list</div>
          {lists.length > 0 ? (
            <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
              {lists.map((list) => (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => addToList(list.id)}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-xs font-bold text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  <span className="truncate">{list.name}</span>
                  <span className="text-white/35">{list.items.length}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="px-2 py-2 text-xs leading-relaxed text-white/55">No lists yet. Create one and this title goes in immediately.</p>
          )}
          <div className="mt-2 flex gap-1 border-t border-white/10 pt-2">
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="New list"
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-xs text-white outline-none focus:border-white/30"
            />
            <button
              type="button"
              onClick={() => createAndAdd(newName)}
              className="grid h-8 w-8 place-items-center rounded-lg bg-white text-black transition hover:bg-white/85"
              title="Create list"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
