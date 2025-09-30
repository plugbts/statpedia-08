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
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodesRef = useRef<GainNode[]>([]);
  const masterGainRef = useRef<GainNode | null>(null);

  // Create ambient background music using Web Audio API
  const createAmbientMusic = useCallback(() => {
    try {
      // Clean up existing audio context if it exists
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      // Create a master gain node for volume control
      const masterGain = audioContext.createGain();
      masterGain.connect(audioContext.destination);
      
      // Set volume based on mute state
      const currentVolume = isMuted ? 0 : volume;
      masterGain.gain.setValueAtTime(currentVolume, audioContext.currentTime);
      
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
        gainNode.connect(masterGain);
        
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

      // Store references for cleanup and control
      oscillatorsRef.current = oscillators;
      gainNodesRef.current = gainNodes;
      masterGainRef.current = masterGain;

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
    // Stop all oscillators
    oscillatorsRef.current.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {
        // Oscillator might already be stopped
      }
    });
    
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
      const cleanup = startMusic();
      return cleanup;
    }
  }, [enabled, startMusic]);

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
