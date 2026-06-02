'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Brain, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

type CalibrationStatus = {
  calibrated: boolean;
  loved?: string[];
  overrated?: string[];
  abandoned?: string;
  standardsSummary?: string;
};

export function FirstSessionCalibrationCard() {
  const [status, setStatus] = useState<CalibrationStatus | null>(null);

  useEffect(() => {
    fetch('/api/vault/calibration', { cache: 'no-store' })
      .then((res) => res.json())
      .then((body) => setStatus(body))
      .catch(() => setStatus({ calibrated: false }));
  }, []);

  if (status?.calibrated) {
    return (
      <section className="px-6 pt-5 md:px-8 lg:px-12">
        <div className="overflow-hidden rounded-3xl border border-[#9ee493]/20 bg-[#9ee493]/8 p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#9ee493]/25 bg-[#9ee493]/10 text-[#9ee493]">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9ee493]">VAULT calibrated</p>
                <h2 className="mt-1 text-lg font-black text-white">Your first-session taste map is active.</h2>
                <p className="mt-1 max-w-3xl text-xs leading-relaxed text-white/50">
                  {status.standardsSummary || 'VAULT has your loved, overrated, and abandoned signals.'}
                </p>
              </div>
            </div>
            <Link href="/calibrate" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-black text-white/65 transition hover:bg-white/10 hover:text-white">
              Refine
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 pt-5 md:px-8 lg:px-12">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(158,228,147,0.10)_45%,rgba(99,102,241,0.08))] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.32)] md:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#9ee493]/25 bg-[#9ee493]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#9ee493]">
              <Brain size={13} />
              First-session magic
            </div>
            <h2 className="max-w-2xl text-2xl font-black tracking-tight text-white md:text-3xl">
              Give VAULT nine signals before it wastes your night.
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/55">
              Five loved, three overrated, one abandoned. That is enough to make the first watch decision feel personal instead of generic.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-white/45">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1"><CheckCircle2 size={12} /> Positive taste</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1"><ShieldCheck size={12} /> Negative standards</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1"><Sparkles size={12} /> One first pick</span>
            </div>
          </div>
          <Link href="/calibrate" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#9ee493] px-5 py-3 text-sm font-black text-black transition hover:bg-[#b9f5ae]">
            Calibrate VAULT
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
