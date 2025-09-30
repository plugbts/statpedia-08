import { useState, useEffect, useCallback, useRef } from 'react';

interface BackgroundMusicOptions {
  enabled?: boolean;
  volume?: number;
  loop?: boolean;
}

export const useBackgroundMusic = (options: BackgroundMusicOptions = {}) => {
  const { enabled = true, volume = 0.15, loop = true } = options; // 15% volume
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [needsUserInteraction, setNeedsUserInteraction] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Create a simple audio context with oscillator
  const createAudio = useCallback(() => {
    try {
      // Clean up existing audio
      if (sourceRef.current) {
        sourceRef.current.stop();
        sourceRef.current = null;
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Create oscillator
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      // Connect audio chain
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Set oscillator properties
      oscillator.frequency.setValueAtTime(55, audioContext.currentTime); // Low A note
      oscillator.type = 'sine';
      
      // Set volume
      const currentVolume = isMuted ? 0 : volume;
      gainNode.gain.setValueAtTime(currentVolume, audioContext.currentTime);

      // Store references
      sourceRef.current = oscillator;
      (oscillator as any).gainNode = gainNode; // Store gain node for volume control

      // Start oscillator
      oscillator.start();
      setIsPlaying(true);

      console.log('Background music started with volume:', currentVolume);

      return oscillator;
    } catch (error) {
      console.error('Failed to create audio:', error);
      return null;
    }
  }, [volume, isMuted]);

  // Start music
  const startMusic = useCallback(() => {
    console.log('startMusic called - enabled:', enabled, 'isMuted:', isMuted, 'needsUserInteraction:', needsUserInteraction);
    
    if (!enabled || isMuted) return;

    if (needsUserInteraction) {
      console.log('User interaction required to start audio');
      return;
    }

    const oscillator = createAudio();
    if (oscillator) {
      console.log('Background music started successfully');
    }
  }, [enabled, isMuted, needsUserInteraction, createAudio]);

  // Stop music
  const stopMusic = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch (e) {
        // Oscillator might already be stopped
      }
      sourceRef.current = null;
    }
    
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {
        // Context might already be closed
      }
    }
    
    setIsPlaying(false);
    console.log('Background music stopped');
  }, []);

  // Toggle music
  const toggleMusic = useCallback(() => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    if (sourceRef.current && (sourceRef.current as any).gainNode) {
      const gainNode = (sourceRef.current as any).gainNode;
      const targetVolume = newMutedState ? 0 : volume;
      gainNode.gain.setValueAtTime(targetVolume, audioContextRef.current?.currentTime || 0);
    }
  }, [isMuted, volume]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    console.log('togglePlayPause called - needsUserInteraction:', needsUserInteraction, 'isPlaying:', isPlaying);
    
    if (needsUserInteraction) {
      console.log('Enabling audio after user interaction');
      setNeedsUserInteraction(false);
      // Start music after a short delay to ensure context is ready
      setTimeout(() => {
        startMusic();
      }, 100);
    } else if (isPlaying) {
      console.log('Stopping music');
      stopMusic();
    } else {
      console.log('Starting music');
      startMusic();
    }
  }, [needsUserInteraction, isPlaying, startMusic, stopMusic]);

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
    if (sourceRef.current && (sourceRef.current as any).gainNode) {
      const gainNode = (sourceRef.current as any).gainNode;
      const targetVolume = isMuted ? 0 : volume;
      gainNode.gain.setValueAtTime(targetVolume, audioContextRef.current?.currentTime || 0);
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