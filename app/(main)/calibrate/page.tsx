'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Brain, CheckCircle2, ShieldCheck, Sparkles, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type CalibrationState = {
  loved: string[];
  overrated: string[];
  abandoned: string;
  abandonedReason: string;
};

const EMPTY_STATE: CalibrationState = {
  loved: ['', '', '', '', ''],
  overrated: ['', '', ''],
  abandoned: '',
  abandonedReason: '',
};

function cleanList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

export default function CalibratePage() {
  const [state, setState] = useState<CalibrationState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSummary, setSavedSummary] = useState<string | null>(null);

  useEffect(() => {
    async function loadCalibration() {
      const res = await fetch('/api/vault/calibration', { cache: 'no-store' });
      const body = await res.json().catch(() => null);
      if (body?.calibrated) {
        setState({
          loved: [...(body.loved ?? []), '', '', '', '', ''].slice(0, 5),
          overrated: [...(body.overrated ?? []), '', '', ''].slice(0, 3),
          abandoned: body.abandoned ?? '',
          abandonedReason: body.abandonedReason ?? '',
        });
        setSavedSummary(body.standardsSummary ?? null);
      }
      setLoading(false);
    }

    loadCalibration().catch(() => setLoading(false));
  }, []);

  const setLoved = (index: number, value: string) => {
    setState((current) => ({
      ...current,
      loved: current.loved.map((item, itemIndex) => itemIndex === index ? value : item),
    }));
  };

  const setOverrated = (index: number, value: string) => {
    setState((current) => ({
      ...current,
      overrated: current.overrated.map((item, itemIndex) => itemIndex === index ? value : item),
    }));
  };

  const lovedCount = cleanList(state.loved).length;
  const overratedCount = cleanList(state.overrated).length;
  const isComplete = lovedCount === 5 && overratedCount === 3 && state.abandoned.trim().length > 0;

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/vault/calibration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loved: state.loved,
          overrated: state.overrated,
          abandoned: state.abandoned,
          abandonedReason: state.abandonedReason,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || 'Calibration failed.');
        return;
      }
      setSavedSummary(body.standardsSummary ?? 'VAULT is calibrated.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05050f] px-5 py-8 text-white md:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(158,228,147,0.10)_46%,rgba(99,102,241,0.10))] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.38)] md:p-8">
          <div className="max-w-4xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#9ee493]/25 bg-[#9ee493]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#9ee493]">
              <Brain size={13} />
              VAULT first-session calibration
            </div>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-6xl">
              Nine signals. One taste map.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/58 md:text-base">
              Five titles you love tell VAULT what earns your trust. Three overrated titles tell it what not to overvalue. One abandoned title exposes your actual bail point.
            </p>
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-3">
            <SignalStat icon={CheckCircle2} label="Loved" value={`${lovedCount}/5`} />
            <SignalStat icon={X} label="Overrated" value={`${overratedCount}/3`} />
            <SignalStat icon={ShieldCheck} label="Abandoned" value={state.abandoned.trim() ? '1/1' : '0/1'} />
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-5">
            <CalibrationPanel
              eyebrow="Positive signal"
              title="5 titles you love"
              description="Not just favorites. Titles you would defend."
              accent="green"
            >
              <div className="grid gap-3 md:grid-cols-2">
                {state.loved.map((value, index) => (
                  <TitleInput
                    key={index}
                    label={`Loved ${index + 1}`}
                    value={value}
                    onChange={(next) => setLoved(index, next)}
                    placeholder={index === 0 ? 'The Last Kingdom' : 'Title name'}
                  />
                ))}
              </div>
            </CalibrationPanel>

            <CalibrationPanel
              eyebrow="Negative signal"
              title="3 titles you think are overrated"
              description="This protects you from famous-but-wrong recommendations."
              accent="amber"
            >
              <div className="grid gap-3 md:grid-cols-3">
                {state.overrated.map((value, index) => (
                  <TitleInput
                    key={index}
                    label={`Overrated ${index + 1}`}
                    value={value}
                    onChange={(next) => setOverrated(index, next)}
                    placeholder="Title name"
                  />
                ))}
              </div>
            </CalibrationPanel>

            <CalibrationPanel
              eyebrow="Standards signal"
              title="1 title you abandoned"
              description="The reason matters. VAULT needs to know where your patience ends."
              accent="red"
            >
              <div className="grid gap-3 md:grid-cols-[0.8fr_1.2fr]">
                <TitleInput
                  label="Abandoned title"
                  value={state.abandoned}
                  onChange={(value) => setState((current) => ({ ...current, abandoned: value }))}
                  placeholder="Title you quit"
                />
                <TitleInput
                  label="Why did you quit?"
                  value={state.abandonedReason}
                  onChange={(value) => setState((current) => ({ ...current, abandonedReason: value }))}
                  placeholder="Too slow, weak hook, messy ending, wrong tone..."
                />
              </div>
            </CalibrationPanel>
          </div>

          <aside className="h-fit rounded-3xl border border-white/10 bg-[#0b0d14] p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[#9ee493]/25 bg-[#9ee493]/10 text-[#9ee493]">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">What changes</p>
                <h2 className="font-black">VAULT stops guessing</h2>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm leading-relaxed text-white/55">
              <p>After this, VAULT can reference your standards instead of saying it does not know your taste.</p>
              <p>Discover and dashboard recommendations get nine durable signals before you have watched anything inside StreamVault.</p>
              <p>Your abandoned reason becomes a warning label against future bad fits.</p>
            </div>

            {error && (
              <div className="mt-5 rounded-2xl border border-red-400/25 bg-red-500/10 p-3 text-sm font-bold text-red-200">
                {error}
              </div>
            )}

            {savedSummary && (
              <div className="mt-5 rounded-2xl border border-[#9ee493]/25 bg-[#9ee493]/10 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9ee493]">Stored taste standard</p>
                <p className="mt-2 text-xs leading-relaxed text-white/70">{savedSummary}</p>
              </div>
            )}

            <button
              onClick={submit}
              disabled={!isComplete || saving || loading}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#9ee493] px-5 py-3 text-sm font-black text-black transition hover:bg-[#b9f5ae] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {saving ? 'Saving calibration...' : 'Lock taste map'}
              <ArrowRight size={16} />
            </button>

            <Link
              href="/dashboard"
              className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-white/62 transition hover:bg-white/10 hover:text-white"
            >
              Back to dashboard
            </Link>

            {savedSummary && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="text-xs font-bold leading-relaxed text-white/56">
                  Open VAULT and ask: “Use my calibration and make one watch decision for tonight.”
                </p>
              </div>
            )}
          </aside>
        </section>
      </div>
    </div>
  );
}

function SignalStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <Icon size={18} className="text-[#9ee493]" />
      <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/35">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function CalibrationPanel({
  eyebrow,
  title,
  description,
  accent,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  accent: 'green' | 'amber' | 'red';
  children: React.ReactNode;
}) {
  const accentClass = accent === 'green'
    ? 'text-[#9ee493] border-[#9ee493]/20 bg-[#9ee493]/10'
    : accent === 'amber'
      ? 'text-[#f9c74f] border-[#f9c74f]/20 bg-[#f9c74f]/10'
      : 'text-red-200 border-red-300/20 bg-red-400/10';

  return (
    <div className="rounded-3xl border border-white/10 bg-[#0b0d14] p-5">
      <div className={cn('mb-4 inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]', accentClass)}>
        {eyebrow}
      </div>
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="mt-1 text-sm text-white/45">{description}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function TitleInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-white/35">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/20 focus:border-[#9ee493]/45 focus:bg-white/[0.055]"
      />
    </label>
  );
}
