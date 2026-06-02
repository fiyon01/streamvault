import Link from 'next/link';
import { Star } from 'lucide-react';

type KdramaCardProps = {
  id: string | number;
  title: string;
  posterPath?: string | null;
  year?: string;
  rating?: number;
};

export function KdramaCard({ id, title, posterPath, year, rating }: KdramaCardProps) {
  const imageSrc = posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : null;

  return (
    <Link href={`/kdrama/${id}`} className="group block">
      <div className="overflow-hidden rounded-xl bg-surface transition duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-black/50">
        <div className="relative aspect-[2/3] overflow-hidden bg-white/[0.04]">
          {imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt={title}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full place-items-center p-4 text-center text-sm font-semibold text-white/35">
              {title}
            </div>
          )}
          {rating ? (
            <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[11px] font-black text-white backdrop-blur">
              <Star size={11} className="fill-yellow-400 text-yellow-400" />
              {rating.toFixed(1)}
            </div>
          ) : null}
        </div>
        <div className="p-3">
          <h3 className="line-clamp-1 text-sm font-bold group-hover:text-accent">{title}</h3>
          <p className="mt-1 text-xs text-muted">{year || 'K-drama'}</p>
        </div>
      </div>
    </Link>
  );
}

export function KdramaRail({ title, items }: { title: string; items: any[] }) {
  if (!items.length) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-xl font-black md:text-2xl">{title}</h2>
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Universal servers</span>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
        {items.slice(0, 12).map((item: any) => (
          <KdramaCard
            key={item.id}
            id={item.id}
            title={item.name || item.title}
            posterPath={item.poster_path}
            year={(item.first_air_date || item.release_date || '').split('-')[0]}
            rating={Number(item.vote_average || 0)}
          />
        ))}
      </div>
    </section>
  );
}
