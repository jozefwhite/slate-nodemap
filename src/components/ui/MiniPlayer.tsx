'use client';

import { useRef, useEffect, useCallback } from 'react';
import { Play, Pause, X } from 'lucide-react';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useIsMobile } from '@/hooks/useIsMobile';

export default function MiniPlayer() {
  const {
    track,
    isPlaying,
    progress,
    currentTime,
    duration,
    pause,
    resume,
    stop,
    seek,
    setProgress,
  } = useAudioPlayer();
  const isMobile = useIsMobile();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Create / swap audio element when track changes
  useEffect(() => {
    if (!track?.previewUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      return;
    }

    // If same URL is already loaded, don't recreate
    if (audioRef.current && audioRef.current.src === track.previewUrl) {
      return;
    }

    // Cleanup old
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(track.previewUrl);
    audioRef.current = audio;

    audio.addEventListener('timeupdate', () => {
      setProgress(audio.currentTime, audio.duration || 0);
    });

    audio.addEventListener('ended', () => {
      pause();
      setProgress(0, audio.duration || 0);
    });

    audio.addEventListener('loadedmetadata', () => {
      setProgress(0, audio.duration || 0);
    });

    audio.play().catch(() => {
      // Autoplay blocked
      pause();
    });

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', () => {});
      audio.removeEventListener('ended', () => {});
      audio.removeEventListener('loadedmetadata', () => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.previewUrl]);

  // Sync play/pause state
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => pause());
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, pause]);

  // Seek when store's seek is called
  useEffect(() => {
    if (!audioRef.current || duration === 0) return;
    const targetTime = progress * duration;
    // Only seek if there's a significant difference (avoid feedback loops)
    if (Math.abs(audioRef.current.currentTime - targetTime) > 0.5) {
      audioRef.current.currentTime = targetTime;
    }
  }, [progress, duration]);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressBarRef.current || !audioRef.current) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      seek(fraction);
      if (audioRef.current) {
        audioRef.current.currentTime = fraction * (audioRef.current.duration || 0);
      }
    },
    [seek]
  );

  const handleClose = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    stop();
  }, [stop]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!track) return null;

  return (
    <div className={`border-t border-surface-2 bg-white flex items-center gap-3 ${
      isMobile ? 'px-3 py-2' : 'px-4 py-1.5'
    }`}>
      {/* Artwork */}
      {track.artworkUrl && (
        <img
          src={track.artworkUrl}
          alt=""
          className={`flex-shrink-0 bg-surface-1 object-cover ${
            isMobile ? 'w-10 h-10' : 'w-8 h-8'
          }`}
        />
      )}

      {/* Track info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink-0 truncate leading-tight">{track.trackName}</p>
            <p className="text-2xs text-ink-3 truncate">{track.artistName}</p>
          </div>

          {/* Time */}
          <span className="text-2xs font-mono text-ink-3 flex-shrink-0 tabular-nums">
            {formatTime(currentTime)}/{formatTime(duration)}
          </span>
        </div>

        {/* Progress bar */}
        <div
          ref={progressBarRef}
          className="mt-1 h-1 bg-surface-2 cursor-pointer group"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-ink-0 transition-[width] duration-100 group-hover:bg-accent"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => (isPlaying ? pause() : resume())}
          className={`text-ink-0 hover:text-accent transition-colors ${
            isMobile ? 'p-2 min-w-[44px] min-h-[44px] flex items-center justify-center' : 'p-1.5'
          }`}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          onClick={handleClose}
          className={`text-ink-3 hover:text-ink-0 transition-colors ${
            isMobile ? 'p-2 min-w-[44px] min-h-[44px] flex items-center justify-center' : 'p-1'
          }`}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
