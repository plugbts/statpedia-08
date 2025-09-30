import { useState, useEffect, useCallback, useRef } from 'react';

interface BackgroundMusicOptions {
  enabled?: boolean;
  volume?: number;
  loop?: boolean;
}

export const useBackgroundMusic = (options: BackgroundMusicOptions = {}) => {
  const { enabled = true, volume = 0.1, loop = true } = options; // 10% volume
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [needsUserInteraction, setNeedsUserInteraction] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create a simple audio element with a data URL for ambient music
  const createAudioElement = useCallback(() => {
    try {
      // Clean up existing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Create audio element
      const audio = new Audio();
      audioRef.current = audio;

      // Set audio properties
      audio.loop = loop;
      audio.volume = isMuted ? 0 : volume;
      audio.preload = 'auto';

      // Create a simple data URL for ambient music
      // This creates a very subtle sine wave
      const sampleRate = 44100;
      const duration = 30; // 30 seconds
      const samples = sampleRate * duration;
      const buffer = new ArrayBuffer(44 + samples * 2);
      const view = new DataView(buffer);

      // WAV header
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };

      writeString(0, 'RIFF');
      view.setUint32(4, 36 + samples * 2, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(36, 'data');
      view.setUint32(40, samples * 2, true);

      // Generate sine wave data
      for (let i = 0; i < samples; i++) {
        const time = i / sampleRate;
        const frequency = 55; // Low A note
        const amplitude = 0.1; // Very quiet
        const sample = Math.sin(2 * Math.PI * frequency * time) * amplitude;
        const intSample = Math.max(-32768, Math.min(32767, sample * 32767));
        view.setInt16(44 + i * 2, intSample, true);
      }

      // Convert to data URL
      const blob = new Blob([buffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      audio.src = url;

      // Add event listeners
      audio.addEventListener('canplaythrough', () => {
        console.log('Audio ready to play');
        if (enabled && !isMuted && !needsUserInteraction) {
          audio.play().then(() => {
            console.log('Background music started');
            setIsPlaying(true);
          }).catch((error) => {
            console.log('Failed to play audio:', error);
            setNeedsUserInteraction(true);
          });
        }
      });

      audio.addEventListener('error', (e) => {
        console.error('Audio error:', e);
      });

      audio.addEventListener('ended', () => {
        if (loop) {
          audio.currentTime = 0;
          audio.play().catch(console.log);
        }
      });

      return audio;
    } catch (error) {
      console.error('Failed to create audio element:', error);
      return null;
    }
  }, [volume, isMuted, loop, enabled, needsUserInteraction]);

  // Start music
  const startMusic = useCallback(() => {
    console.log('startMusic called - enabled:', enabled, 'isMuted:', isMuted, 'needsUserInteraction:', needsUserInteraction);
    
    if (!enabled || isMuted) return;

    if (needsUserInteraction) {
      console.log('User interaction required to start audio');
      return;
    }

    const audio = createAudioElement();
    if (audio) {
      audio.play().then(() => {
        console.log('Background music started successfully');
        setIsPlaying(true);
      }).catch((error) => {
        console.log('Failed to start music:', error);
        setNeedsUserInteraction(true);
      });
    }
  }, [enabled, isMuted, needsUserInteraction, createAudioElement]);

  // Stop music
  const stopMusic = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  }, []);

  // Toggle music
  const toggleMusic = useCallback(() => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    if (audioRef.current) {
      audioRef.current.volume = newMutedState ? 0 : volume;
    }
  }, [isMuted, volume]);

  // Handle user interaction to enable audio
  const enableAudio = useCallback(() => {
    console.log('User interaction detected, enabling audio');
    setNeedsUserInteraction(false);
    
    // Try to start music if conditions are met
    if (enabled && !isMuted) {
      setTimeout(() => {
        startMusic();
      }, 100);
    }
  }, [enabled, isMuted, startMusic]);

  // Auto-start music when component mounts (if enabled and not muted)
  useEffect(() => {
    if (enabled && !isMuted && !needsUserInteraction) {
      startMusic();
    }
  }, [enabled, isMuted, needsUserInteraction, startMusic]);

  // Handle mute state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [isMuted, volume]);

  // Save mute preference to localStorage
  useEffect(() => {
    const savedMuteState = localStorage.getItem('statpedia_music_muted');
    if (savedMuteState !== null) {
      setIsMuted(JSON.parse(savedMuteState));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('statpedia_music_muted', JSON.stringify(isMuted));
  }, [isMuted]);

  // Add click listener to enable audio on first user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      if (needsUserInteraction) {
        enableAudio();
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);
      }
    };

    if (needsUserInteraction) {
      document.addEventListener('click', handleUserInteraction);
      document.addEventListener('keydown', handleUserInteraction);
      document.addEventListener('touchstart', handleUserInteraction);
    }

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [needsUserInteraction, enableAudio]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (needsUserInteraction) {
      enableAudio();
    } else if (isPlaying) {
      stopMusic();
    } else {
      startMusic();
    }
  }, [needsUserInteraction, enableAudio, isPlaying, stopMusic, startMusic]);

  return {
    isPlaying,
    isMuted,
    needsUserInteraction,
    toggleMusic,
    togglePlayPause,
    startMusic,
    stopMusic,
    enableAudio,
  };
};