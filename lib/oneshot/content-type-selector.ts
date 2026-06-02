import { ParsedIntent, ContentTypeCard } from './types';

export function buildContentTypeCards(
  userProfile: any,
  parsedIntent: ParsedIntent
): ContentTypeCard[] {
  const cards: ContentTypeCard[] = [];

  // Movies card
  cards.push({
    type: 'movie',
    label: 'Movies',
    sublabel: getMovieSubLabel(parsedIntent),
    emoji: '🎬',
    visible: true,
    highlighted: userProfile.primaryContentType === 'movie'
  });

  // TV Shows card
  cards.push({
    type: 'tv_show',
    label: 'TV Shows',
    sublabel: getTVSubLabel(parsedIntent),
    emoji: '📺',
    visible: true,
    highlighted: userProfile.primaryContentType === 'tv_show'
  });

  // Anime card
  cards.push({
    type: 'anime',
    label: 'Anime',
    sublabel: userProfile.animeFormat === 'dub' ? 'Dubbed' : 'Sub / Dub',
    emoji: '🎌',
    visible: userProfile.hasAnimeHistory !== false && !(userProfile.hardBlockedGenres || []).includes('anime'),
    highlighted: userProfile.primaryContentType === 'anime'
  });

  // Cartoon card
  cards.push({
    type: 'cartoon',
    label: 'Animated',
    sublabel: 'Cartoons & Animation',
    emoji: '🎨',
    visible: userProfile.hasCartoonHistory !== false && !(userProfile.hardBlockedGenres || []).includes('animation'),
    highlighted: userProfile.primaryContentType === 'cartoon'
  });

  // Surprise Me
  cards.push({
    type: 'surprise',
    label: 'Surprise Me',
    sublabel: 'Best match, any format',
    emoji: '⚡',
    visible: true,
    highlighted: false
  });

  return cards.filter(c => c.visible);
}

function getMovieSubLabel(intent: ParsedIntent): string {
  const longThemes = ['epic', 'war', 'historical', 'saga'];
  const shortThemes = ['comedy', 'horror', 'thriller'];
  
  if (!intent || !intent.themes) return '~2 hours';

  if (intent.themes.some(t => longThemes.includes(t))) return '2-3 hours';
  if (intent.themes.some(t => shortThemes.includes(t))) return '~90 minutes';
  return '~2 hours';
}

function getTVSubLabel(intent: ParsedIntent): string {
  if (!intent || !intent.themes) return 'Episodes';
  const bingeThemes = ['mystery', 'thriller', 'cliffhanger', 'drama'];
  if (intent.themes.some(t => bingeThemes.includes(t))) return 'Binge-worthy';
  return 'Episodes';
}
