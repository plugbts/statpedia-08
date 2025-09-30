import { useState, useEffect, useCallback, useRef } from 'react';
import { youtubeDirectPlayer } from '@/services/youtube-direct-player';

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
  const isInitialized = useRef(false);

  // YouTube video URL
  const YOUTUBE_VIDEO_URL = 'https://www.youtube.com/watch?v=I3j8tOvjvlc';

  // Initialize YouTube player
  const initializePlayer = useCallback(async () => {
    if (isInitialized.current) return;

    try {
      await youtubeDirectPlayer.initialize();
      isInitialized.current = true;
      console.log('YouTube player initialized');
    } catch (error) {
      console.error('Failed to initialize YouTube player:', error);
    }
  }, []);

  // Start YouTube music
  const startYouTubeMusic = useCallback(async () => {
    try {
      if (!isInitialized.current) {
        await initializePlayer();
      }

      // Stop any existing audio
      youtubeDirectPlayer.stopAudio();

      // Play the actual YouTube video audio
      const success = await youtubeDirectPlayer.playYouTubeAudio(
        YOUTUBE_VIDEO_URL,
        isMuted ? 0 : volume,
        (playing) => {
          console.log('YouTube player state changed:', playing ? 'PLAYING' : 'PAUSED');
          setIsPlaying(playing);
        }
      );

      if (success) {
        console.log('YouTube video audio started:', YOUTUBE_VIDEO_URL);
      } else {
        console.error('Failed to start YouTube video audio');
      }
    } catch (error) {
      console.error('Failed to start YouTube music:', error);
    }
  }, [volume, isMuted, initializePlayer]);

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
    youtubeDirectPlayer.stopAudio();
    setIsPlaying(false);
    console.log('YouTube video audio stopped');
  }, []);

  // Toggle music
  const toggleMusic = useCallback(() => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    youtubeDirectPlayer.setVolume(newMutedState ? 0 : volume);
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
      console.log('Stopping YouTube video audio');
      stopMusic();
    } else {
      console.log('Starting YouTube video audio');
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
    youtubeDirectPlayer.setVolume(isMuted ? 0 : volume);
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
      youtubeDirectPlayer.cleanup();
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