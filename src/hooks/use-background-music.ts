import { useState, useEffect, useCallback, useRef } from 'react';

interface BackgroundMusicOptions {
  enabled?: boolean;
  volume?: number;
  loop?: boolean;
}

export const useBackgroundMusic = (options: BackgroundMusicOptions = {}) => {
  const { enabled = true, volume = 0.05, loop = true } = options; // Low volume (5%)
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Create YouTube background music using a more direct approach
  const createYouTubeMusic = useCallback(() => {
    try {
      // Clean up existing audio if it exists
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
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
      
      // Create master gain node
      const masterGain = audioContext.createGain();
      masterGain.connect(audioContext.destination);
      masterGainRef.current = masterGain;
      
      // Set initial volume
      const currentVolume = isMuted ? 0 : volume;
      masterGain.gain.setValueAtTime(currentVolume, audioContext.currentTime);
      
      // Create a very subtle ambient sound that mimics the YouTube video
      // This is a placeholder - in production you'd extract the actual YouTube audio
      const sampleRate = audioContext.sampleRate;
      const duration = 120; // 2 minutes
      const buffer = audioContext.createBuffer(2, sampleRate * duration, sampleRate);
      
      // Create ambient pad similar to the YouTube video's mood
      for (let channel = 0; channel < 2; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < channelData.length; i++) {
          const time = i / sampleRate;
          
          // Create a subtle ambient pad with multiple frequencies
          const baseFreq = 55; // Low A note
          const frequencies = [baseFreq, baseFreq * 1.5, baseFreq * 2, baseFreq * 3];
          let sample = 0;
          
          frequencies.forEach((freq, index) => {
            const amplitude = 0.008 * (1 - index * 0.2); // Decreasing amplitude
            const wave = Math.sin(2 * Math.PI * freq * time) * amplitude;
            
            // Add subtle LFO for movement
            const lfo = Math.sin(2 * Math.PI * (0.05 + index * 0.02) * time) * 0.002;
            
            sample += wave + lfo;
          });
          
          // Add very subtle noise for texture
          const noise = (Math.random() - 0.5) * 0.001;
          sample += noise;
          
          channelData[i] = sample;
        }
      }
      
      // Create and start the audio source
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.loop = loop;
      source.connect(masterGain);
      sourceRef.current = source;
      
      source.start();
      setIsPlaying(true);
      
      console.log('YouTube-style ambient background music started with volume:', currentVolume);
      
      return () => {
        try {
          source.stop();
        } catch (e) {
          // Source might already be stopped
        }
      };
    } catch (error) {
      console.log('YouTube background music not available:', error);
      return () => {};
    }
  }, [volume, isMuted, loop]);

  // Start/stop background music
  const startMusic = useCallback(() => {
    console.log('startMusic called - enabled:', enabled, 'isMuted:', isMuted);
    if (!enabled || isMuted) return;
    
    createYouTubeMusic();
  }, [enabled, isMuted, createYouTubeMusic]);

  const stopMusic = useCallback(() => {
    // Stop audio source
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch (e) {
        // Source might already be stopped
      }
      sourceRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {
        // Context might already be closed
      }
    }
    
    setIsPlaying(false);
  }, []);

  const toggleMusic = useCallback(() => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    // Control volume through master gain node
    if (masterGainRef.current && audioContextRef.current) {
      const targetVolume = newMutedState ? 0 : volume;
      masterGainRef.current.gain.setValueAtTime(targetVolume, audioContextRef.current.currentTime);
    }
  }, [isMuted, volume]);

  // Auto-start music when component mounts (if enabled and not muted)
  useEffect(() => {
    if (enabled && !isMuted) {
      startMusic();
    }
  }, [enabled, isMuted, startMusic]);

  // Handle mute state changes
  useEffect(() => {
    if (masterGainRef.current && audioContextRef.current) {
      const targetVolume = isMuted ? 0 : volume;
      masterGainRef.current.gain.setValueAtTime(targetVolume, audioContextRef.current.currentTime);
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

  return {
    isPlaying,
    isMuted,
    toggleMusic,
    startMusic,
    stopMusic,
  };
};