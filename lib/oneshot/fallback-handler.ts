import { ParsedIntent } from './types';

export function broadenIntent(intent: ParsedIntent): ParsedIntent {
  // Make the search query more generic
  let newQuery = intent.searchQuery;
  
  // Strip out some specific words or keep only the first theme
  if (intent.themes && intent.themes.length > 0) {
    newQuery = intent.themes[0];
  }
  
  return {
    ...intent,
    searchQuery: newQuery,
    tone: 'neutral', // Reset tone
    themes: intent.themes.slice(0, 1) // Keep only the primary theme
  };
}

export function handleZeroResults(intent: ParsedIntent): ParsedIntent {
  // If we got zero results, broaden the intent
  return broadenIntent(intent);
}
