'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Download, Volume2 } from 'lucide-react';
import { formatDuracion } from './spechHelpers';

interface AudioPlayerProps {
  src: string;
  className?: string;
}

export default function AudioPlayer({ src, className = '' }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => setDuration(audio.duration || 0);
    const onTime = () => setCurrent(audio.currentTime || 0);
    const onEnded = () => setPlaying(false);
    const onErr = () => setError(true);

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onErr);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onErr);
    };
  }, [src]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => setError(true));
    }
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const v = Number(e.target.value);
    audio.currentTime = v;
    setCurrent(v);
  };

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  if (error) {
    return (
      <div className={`bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3 text-[13px] text-red-700 dark:text-red-400 ${className}`}>
        No se pudo cargar la grabacion.{' '}
        <a href={src} download className="underline hover:no-underline">
          Descargar archivo
        </a>
      </div>
    );
  }

  return (
    <div className={`bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl p-3 flex items-center gap-3 ${className}`}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={toggle}
        className="w-10 h-10 rounded-full bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 transition-colors shrink-0"
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          onChange={seek}
          className="w-full h-1 bg-[var(--bg-primary)] rounded-full appearance-none cursor-pointer accent-violet-600"
          style={{
            background: `linear-gradient(to right, rgb(139 92 246) ${progress}%, var(--bg-primary) ${progress}%)`,
          }}
        />
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[11px] font-mono text-[var(--text-tertiary)]">
            {formatDuracion(Math.floor(current))}
          </span>
          <Volume2 className="w-3 h-3 text-[var(--text-tertiary)]" />
          <span className="text-[11px] font-mono text-[var(--text-tertiary)]">
            {formatDuracion(Math.floor(duration))}
          </span>
        </div>
      </div>
      <a
        href={src}
        download
        className="p-2 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
        title="Descargar"
      >
        <Download className="w-4 h-4" />
      </a>
    </div>
  );
}
