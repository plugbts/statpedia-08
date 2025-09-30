import { useState, useEffect, useCallback, useRef } from 'react';
import { youtubeAudioExtractor } from '@/services/youtube-audio-extractor';

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
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Start YouTube-inspired music
  const startYouTubeMusic = useCallback(async () => {
    try {
      // Clean up existing audio
      if (sourceRef.current) {
        youtubeAudioExtractor.stopAudio(sourceRef.current);
        sourceRef.current = null;
      }

      // Play YouTube-inspired audio
      const source = await youtubeAudioExtractor.playYouTubeAudio(120, isMuted ? 0 : volume, loop);
      
      if (source) {
        sourceRef.current = source;
        setIsPlaying(true);
        console.log('YouTube-inspired background music started');
      }
    } catch (error) {
      console.error('Failed to start YouTube-inspired music:', error);
    }
  }, [volume, isMuted, loop]);

  // Start music
  const startMusic = useCallback(() => {
    console.log('startMusic called - enabled:', enabled, 'isMuted:', isMuted, 'needsUserInteraction:', needsUserInteraction);
    
    if (!enabled || isMuted) return;

    if (needsUserInteraction) {
      console.log('User interaction required to start audio');
      return;
    }

    startYouTubeMusic();
  }, [enabled, isMuted, needsUserInteraction, startYouTubeMusic]);

  // Stop music
  const stopMusic = useCallback(() => {
    if (sourceRef.current) {
      youtubeAudioExtractor.stopAudio(sourceRef.current);
      sourceRef.current = null;
    }
    
    setIsPlaying(false);
    console.log('YouTube-inspired background music stopped');
  }, []);

  // Toggle music
  const toggleMusic = useCallback(() => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    if (sourceRef.current) {
      youtubeAudioExtractor.setVolume(sourceRef.current, newMutedState ? 0 : volume);
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
      console.log('Stopping YouTube-inspired music');
      stopMusic();
    } else {
      console.log('Starting YouTube-inspired music');
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
    if (sourceRef.current) {
      youtubeAudioExtractor.setVolume(sourceRef.current, isMuted ? 0 : volume);
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sourceRef.current) {
        youtubeAudioExtractor.stopAudio(sourceRef.current);
      }
      youtubeAudioExtractor.cleanup();
    };
  }, []);

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