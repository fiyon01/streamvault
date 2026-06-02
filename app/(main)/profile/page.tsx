'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Brain,
  Camera,
  Database,
  Download,
  Gauge,
  ListChecks,
  LogOut,
  Mail,
  Palette,
  PlayCircle,
  Save,
  Shield,
  Trash2,
  User as UserIcon,
  Volume2,
} from 'lucide-react';
import { TasteProfileCard } from '@/components/profile/taste-profile-card';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';
import {
  applySettingsToDocument,
  DEFAULT_STREAMVAULT_SETTINGS,
  normalizeSettings,
  SETTINGS_STORAGE_KEY,
  type StreamVaultSettings,
} from '@/lib/settings/preferences';

type Tab = 'account' | 'playback' | 'vault' | 'appearance' | 'privacy';

type ToggleKey = {
  key: keyof Pick<
    StreamVaultSettings,
    | 'autoplayNextEpisode'
    | 'skipIntroAuto'
    | 'skipRecapAuto'
    | 'preferHd'
    | 'ambientAudio'
    | 'dataSaver'
    | 'historyTracking'
    | 'creatorHistoryTracking'
    | 'personalizedRecommendations'
  >;
  label: string;
  desc: string;
  icon: LucideIcon;
};

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'account', label: 'Account', icon: UserIcon },
  { id: 'playback', label: 'Playback', icon: PlayCircle },
  { id: 'vault', label: 'VAULT', icon: Brain },
  { id: 'appearance', label: 'Display', icon: Palette },
  { id: 'privacy', label: 'Privacy', icon: Shield },
];

const PLAYBACK_PREFS: ToggleKey[] = [
  { key: 'autoplayNextEpisode', label: 'Autoplay next episode', desc: 'Continue a series when the current episode ends.', icon: PlayCircle },
  { key: 'skipIntroAuto', label: 'Auto-skip intros', desc: 'Skip intros when StreamVault detects a known intro window.', icon: Gauge },
  { key: 'skipRecapAuto', label: 'Auto-skip recaps', desc: 'Skip previously-on segments when episode metadata supports it.', icon: Gauge },
  { key: 'preferHd', label: 'Prefer HD playback', desc: 'Start with the best available stream before falling back.', icon: PlayCircle },
];

const PRIVACY_PREFS: ToggleKey[] = [
  { key: 'historyTracking', label: 'Track movie, TV, anime, and cartoon history', desc: 'Feeds Continue Watching, History, VAULT memory, and better picks.', icon: Database },
  { key: 'creatorHistoryTracking', label: 'Track creator-video progress', desc: 'Lets Creator Hub show unseen videos first.', icon: ListChecks },
  { key: 'personalizedRecommendations', label: 'Use history for recommendations', desc: 'Lets VAULT use watch outcomes instead of answering cold.', icon: Brain },
];

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={enabled}
      className={cn(
        'relative h-6 w-12 flex-shrink-0 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-accent/60',
        enabled ? 'bg-accent' : 'bg-border'
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300',
          enabled ? 'translate-x-6' : 'translate-x-0'
        )}
      />
    </button>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('account');
  const [settings, setSettings] = useState<StreamVaultSettings>(DEFAULT_STREAMVAULT_SETTINGS);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;

      setUser(data.user);
      const email = data.user?.email || '';
      setDisplayName(email.split('@')[0] || 'Viewer');

      const local = typeof window !== 'undefined'
        ? normalizeSettings(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || 'null'))
        : DEFAULT_STREAMVAULT_SETTINGS;

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url, preferences')
          .eq('id', data.user.id)
          .maybeSingle();

        if (cancelled) return;
        if (profile?.username) setDisplayName(profile.username);
        if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);

        const merged = normalizeSettings({ ...local, ...(profile?.preferences as object | null ?? {}) });
        setSettings(merged);
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
        applySettingsToDocument(merged);
        return;
      }

      setSettings(local);
      applySettingsToDocument(local);
    }

    loadProfile().catch(() => {
      const local = normalizeSettings(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || 'null'));
      setSettings(local);
      applySettingsToDocument(local);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateSetting = <K extends keyof StreamVaultSettings>(key: K, value: StreamVaultSettings[K]) => {
    setSettings((current) => {
      const next = normalizeSettings({ ...current, [key]: value });
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
      applySettingsToDocument(next);
      return next;
    });
  };

  const toggleSetting = (key: ToggleKey['key']) => {
    updateSetting(key, !settings[key]);
  };

  const saveProfile = async () => {
    setStatus('Saving settings...');
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    applySettingsToDocument(settings);

    if (user) {
      const { error } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          username: displayName.trim() || null,
          avatar_url: avatarUrl,
          preferences: settings,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      setStatus(error ? `Saved locally. Cloud sync failed: ${error.message}` : 'Settings saved.');
      return;
    }

    setStatus('Settings saved on this device.');
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        const url = `${data.publicUrl}?t=${Date.now()}`;
        setAvatarUrl(url);
        await supabase.from('profiles').upsert({ id: user.id, avatar_url: url }, { onConflict: 'id' });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSignOut = async () => {
    setSignOutLoading(true);
    await supabase.auth.signOut();
    router.push('/login');
  };

  const exportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      account: { id: user?.id ?? null, email: user?.email ?? null, displayName },
      settings,
      lists: JSON.parse(localStorage.getItem('streamvault-lists') || '[]') as unknown,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'streamvault-data.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearWatchHistory = async () => {
    if (!user || !confirm('Clear your watch history on this account?')) return;
    setStatus('Clearing history...');
    const [history, creatorHistory] = await Promise.all([
      supabase.from('watch_history').delete().eq('user_id', user.id),
      supabase.from('user_youtube_history').delete().eq('user_id', user.id),
    ]);

    if (history.error || creatorHistory.error) {
      setStatus(history.error?.message || creatorHistory.error?.message || 'History clear failed.');
      return;
    }

    setStatus('Watch history cleared.');
  };

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '-';

  const initials = (user?.email || 'U')[0].toUpperCase();

  return (
    <div className="min-h-screen pb-20 animate-in fade-in duration-500" style={{ background: 'var(--color-bg)' }}>
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-surface to-bg" />
        <div className="relative z-10 mx-auto max-w-5xl px-6 py-12 md:px-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="group relative flex-shrink-0">
              <div
                className="h-24 w-24 cursor-pointer overflow-hidden rounded-full border-4 border-border shadow-2xl transition group-hover:border-accent"
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent to-purple-600 text-4xl font-black text-white">
                    {initials}
                  </div>
                )}
              </div>
              <div
                className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/60 opacity-0 transition group-hover:opacity-100"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Camera className="h-8 w-8 text-white" />}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-black tracking-tight">{displayName || 'Viewer'}</h1>
              <p className="mt-1 flex items-center gap-2 text-muted">
                <Mail size={15} />
                <span className="font-mono text-sm">{user?.email || 'Loading...'}</span>
              </p>
              <p className="mt-1 text-sm text-muted">Member since {memberSince}</p>
            </div>

            <button
              onClick={saveProfile}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-white transition hover:bg-accent-hover"
            >
              <Save size={17} /> Save System Settings
            </button>
          </div>
          {status && <p className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-muted">{status}</p>}
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-5xl px-6 md:px-10">
        <div className="mb-8 flex gap-1 overflow-x-auto border-b border-border">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'mb-[-1px] flex items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3 text-sm font-semibold transition',
                activeTab === tab.id ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-text'
              )}
            >
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'account' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {user && <TasteProfileCard userId={user.id} />}
            <div className="overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="border-b border-border p-6">
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div className="p-6">
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted">Account ID</label>
                <div className="break-all rounded-xl border border-border bg-bg px-4 py-3 font-mono text-xs text-muted">{user?.id || '-'}</div>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              disabled={signOutLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-6 py-3 font-bold text-muted transition hover:bg-bg hover:text-text"
            >
              {signOutLoading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <LogOut size={18} />} Sign Out
            </button>
            <Link
              href="/calibrate"
              className="ml-3 inline-flex items-center gap-2 rounded-xl border border-[#9ee493]/25 bg-[#9ee493]/10 px-6 py-3 font-bold text-[#9ee493] transition hover:bg-[#9ee493]/15"
            >
              <Brain size={18} /> Calibrate VAULT
            </Link>
          </div>
        )}

        {activeTab === 'playback' && (
          <SettingsPanel items={PLAYBACK_PREFS} settings={settings} onToggle={toggleSetting} />
        )}

        {activeTab === 'vault' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="font-bold">VAULT behavior</h2>
              <p className="mt-1 text-sm text-muted">This controls how the assistant speaks and how much risk it takes when making a watch decision.</p>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {(['decisive', 'cinematic', 'brief'] as const).map((tone) => (
                  <button
                    key={tone}
                    onClick={() => updateSetting('vaultTone', tone)}
                    className={cn(
                      'rounded-xl border p-4 text-left transition',
                      settings.vaultTone === tone ? 'border-accent bg-accent/10 text-text' : 'border-border bg-bg text-muted hover:text-text'
                    )}
                  >
                    <div className="text-sm font-black capitalize">{tone}</div>
                    <div className="mt-1 text-xs leading-relaxed">
                      {tone === 'decisive' ? 'One verdict first, explanation second.' : tone === 'cinematic' ? 'Warmer, richer framing with taste language.' : 'Short answers, fast actions, fewer words.'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="font-bold">Spoiler guard</h2>
              <select
                value={settings.spoilerGuard}
                onChange={(event) => updateSetting('spoilerGuard', event.target.value as StreamVaultSettings['spoilerGuard'])}
                className="mt-4 w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="strict">Strict: never reveal future plot</option>
                <option value="balanced">Balanced: context without reveals</option>
                <option value="open">Open: allow full discussion when I ask</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="font-bold">Color Theme</h2>
              <p className="mt-1 text-sm text-muted">Themes still live in the theme gallery, but density and media behavior are now system settings.</p>
              <Link href="/themes" className="mt-5 inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-accent to-purple-600 px-6 py-3 font-bold text-white transition hover:opacity-90">
                <Palette size={18} /> Open Theme Gallery
              </Link>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="font-bold">Default video quality</h2>
              <select
                value={settings.defaultQuality}
                onChange={(event) => updateSetting('defaultQuality', event.target.value as StreamVaultSettings['defaultQuality'])}
                className="mt-4 w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="auto">Auto</option>
                <option value="4k">4K Ultra HD</option>
                <option value="1080p">1080p Full HD</option>
                <option value="720p">720p HD</option>
                <option value="480p">480p data saver</option>
              </select>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-surface">
              {[
                { key: 'ambientAudio' as const, label: 'Ambient audio layer', desc: 'Allow StreamVault soundscape controls in the app shell.', icon: Volume2 },
                { key: 'dataSaver' as const, label: 'Data saver', desc: 'Prefer lighter images and lower default playback quality when supported.', icon: Gauge },
              ].map((item) => (
                <SettingRow key={item.key} item={item} enabled={settings[item.key]} onToggle={() => toggleSetting(item.key)} />
              ))}
            </div>

            <div className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="font-bold">Card density</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(['comfortable', 'compact'] as const).map((density) => (
                  <button
                    key={density}
                    onClick={() => updateSetting('cardDensity', density)}
                    className={cn(
                      'rounded-xl border px-4 py-3 text-left text-sm font-bold capitalize transition',
                      settings.cardDensity === density ? 'border-accent bg-accent/10' : 'border-border bg-bg text-muted hover:text-text'
                    )}
                  >
                    {density}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <SettingsPanel items={PRIVACY_PREFS} settings={settings} onToggle={toggleSetting} />
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Data controls</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                <button onClick={exportData} className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-bg">
                  <Download size={16} /> Export My Data
                </button>
                <button onClick={clearWatchHistory} className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-bg">
                  <Trash2 size={16} /> Clear Watch History
                </button>
                <button
                  onClick={() => setDeleteConfirm(!deleteConfirm)}
                  className="inline-flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-5 py-2.5 text-sm font-bold text-danger transition hover:bg-danger/20"
                >
                  <AlertTriangle size={16} /> Delete Account
                </button>
              </div>
              {deleteConfirm && (
                <div className="mt-4 space-y-3 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm">
                  <p className="font-bold text-danger">Account deletion is not automated yet.</p>
                  <p className="text-muted">For safety, this button does not destroy auth records from the browser. Export data first, then handle deletion through an admin flow.</p>
                  <button onClick={() => setDeleteConfirm(false)} className="rounded-lg border border-border px-4 py-2 text-sm transition hover:bg-bg">
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsPanel({
  items,
  settings,
  onToggle,
}: {
  items: ToggleKey[];
  settings: StreamVaultSettings;
  onToggle: (key: ToggleKey['key']) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface animate-in fade-in duration-300">
      {items.map((item) => (
        <SettingRow key={item.key} item={item} enabled={Boolean(settings[item.key])} onToggle={() => onToggle(item.key)} />
      ))}
    </div>
  );
}

function SettingRow({
  item,
  enabled,
  onToggle,
}: {
  item: ToggleKey;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-5 border-b border-border p-5 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-bg text-muted">
          <item.icon size={17} />
        </div>
        <div>
          <div className="text-sm font-semibold">{item.label}</div>
          <div className="mt-0.5 text-xs leading-relaxed text-muted">{item.desc}</div>
        </div>
      </div>
      <Toggle enabled={enabled} onChange={onToggle} />
    </div>
  );
}
