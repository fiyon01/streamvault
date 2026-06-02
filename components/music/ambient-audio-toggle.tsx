'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { useAmbientAudio } from './ambient-audio-provider';

export function AmbientAudioToggle() {
  const { isEnabled, toggle } = useAmbientAudio();

  return (
    <button
      onClick={toggle}
      className="fixed bottom-6 left-6 z-[150] w-12 h-12 rounded-full bg-surface/50 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-surface hover:scale-105 transition-all text-white/70 hover:text-white"
      title={isEnabled ? "Mute ambient music" : "Enable ambient music"}
    >
      {isEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
    </button>
  );
}
