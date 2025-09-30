import { useState, useEffect, useCallback, useRef } from 'react';

interface BackgroundMusicOptions {
  enabled?: boolean;
  volume?: number;
  loop?: boolean;
}

export const useBackgroundMusic = (options: BackgroundMusicOptions = {}) => {
  const { enabled = true, volume = 0.1, loop = true } = options;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create ambient background music using Web Audio API
  const createAmbientMusic = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create multiple oscillators for a rich, ambient sound
      const oscillators: OscillatorNode[] = [];
      const gainNodes: GainNode[] = [];
      
      // Base frequency for ambient pad
      const baseFreq = 55; // Low A note
      const frequencies = [
        baseFreq,           // A1
        baseFreq * 1.5,     // D2
        baseFreq * 2,       // A2
        baseFreq * 3,       // E3
        baseFreq * 4,       // A3
      ];

      frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
        oscillator.type = 'sine';
        
        // Very low volume for each oscillator
        const oscillatorVolume = volume * 0.1 * (1 - index * 0.1);
        gainNode.gain.setValueAtTime(oscillatorVolume, audioContext.currentTime);
        
        // Add subtle LFO for movement
        const lfo = audioContext.createOscillator();
        const lfoGain = audioContext.createGain();
        lfo.connect(lfoGain);
        lfoGain.connect(oscillator.frequency);
        lfo.frequency.setValueAtTime(0.1 + index * 0.05, audioContext.currentTime);
        lfoGain.gain.setValueAtTime(2, audioContext.currentTime);
        
        oscillators.push(oscillator);
        gainNodes.push(gainNode);
        
        lfo.start();
        oscillator.start();
      });

      // Store references for cleanup
      audioRef.current = {
        pause: () => {
          oscillators.forEach(osc => osc.stop());
          setIsPlaying(false);
        },
        play: () => {
          oscillators.forEach(osc => osc.start());
          setIsPlaying(true);
        },
        volume: volume,
        muted: isMuted
      } as any;

      return () => {
        oscillators.forEach(osc => {
          try {
            osc.stop();
          } catch (e) {
            // Oscillator might already be stopped
          }
        });
      };
    } catch (error) {
      console.log('Background music not available');
      return () => {};
    }
  }, [volume, isMuted]);

  // Start/stop background music
  const startMusic = useCallback(() => {
    if (!enabled || isMuted) return;
    
    const cleanup = createAmbientMusic();
    setIsPlaying(true);
    
    return cleanup;
  }, [enabled, isMuted, createAmbientMusic]);

  const stopMusic = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  }, []);

  const toggleMusic = useCallback(() => {
    if (isMuted) {
      setIsMuted(false);
      if (enabled) {
        startMusic();
      }
    } else {
      setIsMuted(true);
      stopMusic();
    }
  }, [isMuted, enabled, startMusic, stopMusic]);

  // Auto-start music when component mounts (if enabled and not muted)
  useEffect(() => {
    if (enabled && !isMuted) {
      const cleanup = startMusic();
      return cleanup;
    }
  }, [enabled, isMuted, startMusic]);

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

  return {
    isPlaying,
    isMuted,
    toggleMusic,
    startMusic,
    stopMusic,
  };
};
