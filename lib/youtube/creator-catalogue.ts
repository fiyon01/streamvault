import type { CreatorSeed } from './types';

export const CREATOR_CATALOGUE: CreatorSeed[] = [
  {
    channelId: 'UCQmZ9BIYOBSkxL-eqqg5z-g',
    name: 'Mark Angel Comedy',
    category: 'nigerian_comedy',
    country: 'NG',
    tags: ['comedy', 'skit', 'nigerian', 'family'],
    isCanon: true,
  },
  {
    channelId: 'UCJEzFkFXHbDqRHlxGAlzRjA',
    name: 'AY Comedian',
    category: 'nigerian_comedy',
    country: 'NG',
    tags: ['comedy', 'stand_up', 'nigerian'],
    isCanon: true,
  },
  {
    channelId: 'UCcRpJwOsaOhbFLKV2DGQXOA',
    name: 'Basketmouth',
    category: 'nigerian_comedy',
    country: 'NG',
    tags: ['comedy', 'stand_up', 'nigerian'],
    isCanon: true,
  },
  {
    channelId: 'UCbj7QVYV2MQTXF_7ynbgfDQ',
    name: 'Churchill Show',
    category: 'kenyan_creator',
    country: 'KE',
    tags: ['comedy', 'kenyan', 'stand_up', 'swahili'],
    isCanon: true,
  },
  {
    channelId: 'UCjQMNUNpZZlMJFoJbLOnYnw',
    name: 'Citizen TV Kenya',
    category: 'kenyan_creator',
    country: 'KE',
    tags: ['kenyan', 'news', 'drama', 'clips', 'swahili'],
  },
  {
    channelId: 'UC4tjY2tTltEKePusozUxtSA',
    name: 'Abel Mutua / Mkurugenzi',
    category: 'kenyan_creator',
    country: 'KE',
    tags: ['storytelling', 'kenyan', 'long_form', 'swahili', 'mkurugenzi'],
    isCanon: true,
  },
  {
    channelId: 'UCc9CjaAjsMMvaSghZB7-Kog',
    name: 'BeardMeatsFood',
    category: 'food_travel',
    country: 'GB',
    tags: ['food', 'challenge', 'long_form', 'travel'],
    isCanon: true,
  },
  {
    channelId: 'UCi6RNSBDQPKXqSoHJOI8MSA',
    name: 'CAF TV',
    category: 'sports',
    country: 'ZA',
    tags: ['football', 'afcon', 'highlights', 'african'],
    isCanon: true,
  },
  {
    channelId: 'UChi08h4577ovxyqvGMRadjg',
    name: 'Audiomack Africa',
    category: 'music',
    country: 'NG',
    tags: ['afrobeats', 'music', 'afropop', 'interviews'],
  },
  {
    channelId: 'UCev-b-xy-p5fHK8x3zJyn1Q',
    name: 'Diamond Platnumz',
    category: 'music',
    country: 'TZ',
    tags: ['bongo_flava', 'music', 'tanzania', 'swahili'],
    isCanon: true,
  },
  {
    channelId: 'UCg_GB9WS6YKHilQZIJEC4kg',
    name: 'Millard Ayo',
    category: 'kenyan_creator',
    country: 'TZ',
    tags: ['news', 'interviews', 'tanzania', 'swahili'],
  },
  {
    channelId: 'UCwga1dPCqBddbtq5KYRii2g',
    name: 'NTV Uganda',
    category: 'kenyan_creator',
    country: 'UG',
    tags: ['uganda', 'news', 'culture', 'east_africa'],
  },
];

export function getSeedCreator(channelId: string) {
  return CREATOR_CATALOGUE.find((creator) => creator.channelId === channelId) ?? null;
}
