export type AfricanCreatorCategory =
  | 'nigerian_comedy'
  | 'kenyan_creator'
  | 'food_travel'
  | 'african_drama'
  | 'music'
  | 'sports'
  | 'faith'
  | 'kids'
  | 'lifestyle';

export type YouTubeRegion = 'NG' | 'KE' | 'TZ' | 'UG' | 'ZA' | 'GH' | 'ET' | 'EG' | 'US' | 'GB';

export interface CreatorSeed {
  channelId: string;
  name: string;
  category: AfricanCreatorCategory;
  country: YouTubeRegion;
  tags: string[];
  isCanon?: boolean;
}

export interface YouTubeCreator {
  channelId: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  country?: string;
  category?: string;
  tags?: string[];
  subscriberCount?: number;
  videoCount?: number;
  isFeatured?: boolean;
  isCanon?: boolean;
  unseenCount?: number;
}

export interface YouTubeVideo {
  videoId: string;
  channelId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  publishedAt?: string;
  durationSeconds?: number;
  youtubeUrl: string;
  viewCount?: number;
  likeCount?: number;
  tags?: string[];
  category?: string;
  streamvaultScore?: number;
  isCurated?: boolean;
  creatorName?: string;
  creatorThumbnail?: string;
}
