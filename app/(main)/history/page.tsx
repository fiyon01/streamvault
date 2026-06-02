import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { tmdb } from '@/lib/tmdb/api';
import Image from 'next/image';
import Link from 'next/link';
import { History, Trash2, Clock, Film, Tv, PlayCircle } from 'lucide-react';
import { revalidatePath } from 'next/cache';

// Simple server action to clear history
export async function clearHistory() {
  'use server';
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const db = (() => {
      try {
        return createAdminClient();
      } catch {
        return supabase;
      }
    })();
    await db.from('watch_history').delete().eq('user_id', user.id);
    await db.from('user_youtube_history').delete().eq('user_id', user.id);
    revalidatePath('/history');
  }
}

export default async function HistoryPage() {
  const supabase = createClient();
  
  // Get user
  const { data: { user } } = await supabase.auth.getUser();
  
  let historyItems: any[] = [];
  let creatorHistoryItems: any[] = [];
  
  if (user) {
    const db = (() => {
      try {
        return createAdminClient();
      } catch {
        return supabase;
      }
    })();

    // Fetch history
    const { data: historyData } = await db
      .from('watch_history')
      .select('*, content:content_id(type,title,poster_path,release_date)')
      .eq('user_id', user.id)
      .order('last_watched', { ascending: false });
      
    if (historyData && historyData.length > 0) {
      // Enrich with TMDB details
      historyItems = await Promise.all(
        historyData.map(async (item) => {
          try {
            const contentType = item.content?.type === 'show' ? 'tv' : 'movie';
            const details = await tmdb.getDetails(contentType, item.content_id.toString());
            return {
              ...item,
              tmdb_id: item.content_id,
              type: contentType === 'tv' ? 'show' : 'movie',
              title: details.title || details.name,
              poster_path: details.poster_path,
              year: (details.release_date || details.first_air_date || '').split('-')[0],
              watched_at: item.last_watched,
              progress: item.completed ? 1 : null,
              minutesWatched: Math.floor(Number(item.position_seconds ?? 0) / 60),
            };
          } catch (e) {
            const fallbackType = item.content?.type === 'show' ? 'show' : 'movie';
            return {
              ...item,
              tmdb_id: item.content_id,
              type: fallbackType,
              title: item.content?.title || `TMDB ${item.content_id}`,
              poster_path: item.content?.poster_path || null,
              year: (item.content?.release_date || '').split('-')[0],
              watched_at: item.last_watched,
              progress: item.completed ? 1 : null,
              minutesWatched: Math.floor(Number(item.position_seconds ?? 0) / 60),
            };
          }
        })
      );
      historyItems = historyItems.filter(Boolean);
    }

    const { data: creatorHistory } = await db
      .from('user_youtube_history')
      .select('*, video:video_id(title,thumbnail_url,youtube_url,duration_seconds,channel_id,youtube_creators(name,category,country))')
      .eq('user_id', user.id)
      .order('watched_at', { ascending: false });

    creatorHistoryItems = (creatorHistory as any[] | null ?? []).map((item) => {
      const creator = Array.isArray(item.video?.youtube_creators)
        ? item.video.youtube_creators[0]
        : item.video?.youtube_creators;
      return {
        ...item,
        type: 'creator',
        title: item.video?.title || `YouTube video ${item.video_id}`,
        poster_path: item.video?.thumbnail_url || null,
        watched_at: item.watched_at,
        minutesWatched: Math.floor(Number(item.watch_duration_seconds ?? 0) / 60),
        creatorName: creator?.name || 'Creator',
        youtubeUrl: item.video?.youtube_url || `https://www.youtube.com/watch?v=${item.video_id}`,
      };
    });
  }

  // Group by date (Today, Yesterday, Earlier)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { [key: string]: any[] } = {
    'Today': [],
    'Yesterday': [],
    'Earlier': []
  };

  [...historyItems, ...creatorHistoryItems].forEach(item => {
    const d = new Date(item.watched_at);
    if (d >= today) groups['Today'].push(item);
    else if (d >= yesterday) groups['Yesterday'].push(item);
    else groups['Earlier'].push(item);
  });

  return (
    <div className="min-h-screen bg-[#05050f] text-white">
      {/* Header */}
      <div className="relative border-b border-white/[0.06] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/5 pointer-events-none" />
        <div className="max-w-screen-xl mx-auto px-6 py-10 relative">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-[0_0_24px_rgba(37,99,235,0.3)] flex items-center justify-center">
                <History className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">Watch History</h1>
                <p className="text-white/40 font-medium text-sm">
                  {historyItems.length + creatorHistoryItems.length} {historyItems.length + creatorHistoryItems.length === 1 ? 'item' : 'items'} in your history
                </p>
              </div>
            </div>
            
            {historyItems.length + creatorHistoryItems.length > 0 && (
              <form action={clearHistory}>
                <button type="submit" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/20 font-bold text-sm">
                  <Trash2 size={16} />
                  Clear History
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-10">
        {historyItems.length + creatorHistoryItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <div className="w-24 h-24 mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 rounded-full blur-xl animate-pulse" />
              <div className="relative w-full h-full bg-[#0a0a14] border border-white/10 rounded-full flex items-center justify-center">
                <Clock className="w-10 h-10 text-white/30" />
              </div>
            </div>
            <h2 className="text-2xl font-black text-white mb-3">No watch history</h2>
            <p className="text-white/40 max-w-sm mb-8 leading-relaxed">
              Titles you watch will appear here. Start watching something to build your history.
            </p>
            <Link href="/discover" className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform">
              Discover Content
            </Link>
          </div>
        ) : (
          <div className="space-y-12">
            {['Today', 'Yesterday', 'Earlier'].map((group) => {
              const items = groups[group];
              if (!items || items.length === 0) return null;
              
              return (
                <div key={group}>
                  <h3 className="text-lg font-black text-white/60 uppercase tracking-widest mb-4 flex items-center gap-3">
                    {group}
                    <div className="h-px bg-white/10 flex-1" />
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item) => (
                      <Link 
                        key={item.id} 
                        href={item.type === 'creator' ? item.youtubeUrl : `/${item.type === 'movie' ? 'movies' : 'shows'}/${item.tmdb_id}`}
                        target={item.type === 'creator' ? '_blank' : undefined}
                        rel={item.type === 'creator' ? 'noreferrer' : undefined}
                        className="group flex gap-4 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/10 transition-all items-center"
                      >
                        <div className="relative w-16 h-24 rounded-lg overflow-hidden shrink-0 border border-white/10 shadow-lg">
                          {item.poster_path ? (
                            item.type === 'creator' ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.poster_path} alt={item.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            ) : (
                            <Image
                              src={`https://image.tmdb.org/t/p/w200${item.poster_path}`}
                              alt={item.title}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            )
                          ) : (
                            <div className="w-full h-full bg-white/5 flex items-center justify-center">
                              {item.type === 'movie' ? <Film size={20} className="text-white/20" /> : <Tv size={20} className="text-white/20" />}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                            <PlayCircle size={24} className="text-white" />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 border border-white/10 rounded px-1.5 py-0.5 bg-white/5">
                              {item.type === 'creator' ? 'Creator' : item.type === 'movie' ? 'Movie' : 'TV'}
                            </span>
                            {item.year && <span className="text-xs text-white/30">{item.year}</span>}
                          </div>
                          <h4 className="font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                            {item.title}
                          </h4>
                          
                          {/* Progress bar if applicable */}
                          {item.progress !== undefined && item.progress !== null && (
                            <div className="mt-3">
                              <div className="flex justify-between text-[10px] text-white/40 mb-1 font-medium">
                                <span>{item.completed ? 'Completed' : 'Progress'}</span>
                                <span>{item.completed ? 'Done' : `${Math.round(item.progress * 100)}%`}</span>
                              </div>
                              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500 rounded-full" 
                                  style={{ width: `${Math.round(item.progress * 100)}%` }} 
                                />
                              </div>
                            </div>
                          )}
                          {item.type === 'creator' && (
                            <p className="mt-3 text-[11px] font-bold text-white/38">
                              {item.creatorName} {item.completed ? 'Completed' : item.minutesWatched > 0 ? `Started · ${item.minutesWatched} min` : 'Opened'}
                            </p>
                          )}
                          {item.type !== 'creator' && item.progress === null && item.minutesWatched > 0 && (
                            <p className="mt-3 text-[11px] font-bold text-white/38">
                              Started · {item.minutesWatched} min watched
                            </p>
                          )}
                          {item.type !== 'creator' && item.progress === null && item.minutesWatched === 0 && (
                            <p className="mt-3 text-[11px] font-bold text-white/38">
                              Started
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
