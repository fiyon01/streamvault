export const SETTINGS_STORAGE_KEY = 'streamvault-settings';

export type StreamVaultSettings = {
  autoplayNextEpisode: boolean;
  skipIntroAuto: boolean;
  skipRecapAuto: boolean;
  preferHd: boolean;
  ambientAudio: boolean;
  dataSaver: boolean;
  historyTracking: boolean;
  creatorHistoryTracking: boolean;
  personalizedRecommendations: boolean;
  spoilerGuard: 'strict' | 'balanced' | 'open';
  defaultQuality: 'auto' | '4k' | '1080p' | '720p' | '480p';
  cardDensity: 'comfortable' | 'compact';
  vaultTone: 'decisive' | 'cinematic' | 'brief';
};

export const DEFAULT_STREAMVAULT_SETTINGS: StreamVaultSettings = {
  autoplayNextEpisode: true,
  skipIntroAuto: false,
  skipRecapAuto: false,
  preferHd: true,
  ambientAudio: true,
  dataSaver: false,
  historyTracking: true,
  creatorHistoryTracking: true,
  personalizedRecommendations: true,
  spoilerGuard: 'balanced',
  defaultQuality: 'auto',
  cardDensity: 'comfortable',
  vaultTone: 'decisive',
};

export function normalizeSettings(value: unknown): StreamVaultSettings {
  if (!value || typeof value !== 'object') return DEFAULT_STREAMVAULT_SETTINGS;
  const raw = value as Partial<StreamVaultSettings>;

  return {
    ...DEFAULT_STREAMVAULT_SETTINGS,
    ...raw,
    spoilerGuard: raw.spoilerGuard === 'strict' || raw.spoilerGuard === 'open' ? raw.spoilerGuard : raw.spoilerGuard === 'balanced' ? 'balanced' : DEFAULT_STREAMVAULT_SETTINGS.spoilerGuard,
    defaultQuality: ['auto', '4k', '1080p', '720p', '480p'].includes(String(raw.defaultQuality)) ? raw.defaultQuality as StreamVaultSettings['defaultQuality'] : DEFAULT_STREAMVAULT_SETTINGS.defaultQuality,
    cardDensity: raw.cardDensity === 'compact' ? 'compact' : 'comfortable',
    vaultTone: raw.vaultTone === 'cinematic' || raw.vaultTone === 'brief' ? raw.vaultTone : 'decisive',
  };
}

export function applySettingsToDocument(settings: StreamVaultSettings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.ambientAudio = settings.ambientAudio ? 'on' : 'off';
  root.dataset.dataSaver = settings.dataSaver ? 'on' : 'off';
  root.dataset.cardDensity = settings.cardDensity;
  root.dataset.vaultTone = settings.vaultTone;
  root.dataset.spoilerGuard = settings.spoilerGuard;
}
