"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";

interface AudioPlayerProps {
  src: string;
  autoPlay?: boolean;
}

export default function AudioPlayer({ src, autoPlay = true }: AudioPlayerProps) {
  const t = useTranslations("audioPlayer");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.35);
  const [showVolume, setShowVolume] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = false;
    audio.preload = "auto";
    audio.volume = volume;
    audioRef.current = audio;
    startedRef.current = false;

    const onEnded = () => setPlaying(false);
    audio.addEventListener("ended", onEnded);

    let interactionCleanedUp = false;

    const cleanupInteractionListeners = () => {
      if (interactionCleanedUp) return;
      interactionCleanedUp = true;
      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("keydown", handleFirstInteraction);
      document.removeEventListener("scroll", handleFirstInteraction);
    };

    const handleFirstInteraction = () => {
      if (startedRef.current || !audioRef.current) return;
      startedRef.current = true;
      cleanupInteractionListeners();
      const p = audioRef.current.play();
      if (p && typeof p.then === "function") {
        p.then(() => setPlaying(true)).catch(() => {});
      }
    };

    if (autoPlay) {
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.then === "function") {
        playPromise
          .then(() => {
            startedRef.current = true;
            setPlaying(true);
          })
          .catch(() => {
            document.addEventListener("click", handleFirstInteraction);
            document.addEventListener("keydown", handleFirstInteraction);
            document.addEventListener("scroll", handleFirstInteraction);
          });
      }
    }

    return () => {
      cleanupInteractionListeners();
      audio.pause();
      audio.removeEventListener("ended", onEnded);
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = muted;
    }
  }, [volume, muted]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      if (audio.ended) audio.currentTime = 0;
      const p = audio.play();
      if (p && typeof p.then === "function") {
        p.then(() => setPlaying(true)).catch(() => {});
      }
    }
  };

  const toggleMute = () => {
    setMuted((prev) => !prev);
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (v === 0) setMuted(true);
    else if (muted) setMuted(false);
  };

  const handleTouchToggleVolume = () => {
    setShowVolume((prev) => !prev);
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- hover reveal for volume slider, not a click target
    <div className="audio-player" onMouseEnter={() => setShowVolume(true)} onMouseLeave={() => setShowVolume(false)}>
      <div className={`audio-player-glow ${playing && !muted ? "active" : ""}`} />

      <button
        className="audio-player-btn"
        onClick={togglePlay}
        aria-label={playing ? t("pause") : t("play")}
        title={playing ? t("pause") : t("play")}
      >
        {playing ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="audio-icon"
          >
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" className="audio-icon">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
      </button>

      <button
        className="audio-player-btn"
        onClick={toggleMute}
        onTouchEnd={(e) => {
          e.preventDefault();
          toggleMute();
          handleTouchToggleVolume();
        }}
        aria-label={muted ? t("unmute") : t("mute")}
        title={muted ? t("unmute") : t("mute")}
      >
        {muted ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="audio-icon"
          >
            <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="audio-icon"
          >
            <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" />
            <path d="M15.54 8.46a5 5 0 010 7.07" />
            <path d="M19.07 4.93a10 10 0 010 14.14" />
          </svg>
        )}
      </button>

      <div className={`audio-volume-slider ${showVolume ? "visible" : ""}`}>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={muted ? 0 : volume}
          onChange={handleVolume}
          className="audio-range"
          aria-label={t("volume")}
        />
      </div>

      {playing && !muted && (
        <div className="audio-bars">
          <span />
          <span />
          <span />
          <span />
        </div>
      )}
    </div>
  );
}
