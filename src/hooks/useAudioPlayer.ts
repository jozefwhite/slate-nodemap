import { create } from 'zustand';
import { MusicResult } from '@/lib/types';

interface AudioPlayerState {
  track: MusicResult | null;
  isPlaying: boolean;
  progress: number; // 0–1
  duration: number; // seconds
  currentTime: number; // seconds

  play: (track: MusicResult) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seek: (fraction: number) => void;
  setProgress: (currentTime: number, duration: number) => void;
}

export const useAudioPlayer = create<AudioPlayerState>((set, get) => ({
  track: null,
  isPlaying: false,
  progress: 0,
  duration: 0,
  currentTime: 0,

  play: (track) => set({ track, isPlaying: true, progress: 0, currentTime: 0, duration: 0 }),
  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),
  stop: () => set({ track: null, isPlaying: false, progress: 0, currentTime: 0, duration: 0 }),
  seek: (fraction) => {
    const { duration } = get();
    set({ progress: fraction, currentTime: fraction * duration });
  },
  setProgress: (currentTime, duration) =>
    set({
      currentTime,
      duration,
      progress: duration > 0 ? currentTime / duration : 0,
    }),
}));
