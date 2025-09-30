import { useCallback } from 'react';

interface SoundHapticOptions {
  enableSound?: boolean;
  enableHaptic?: boolean;
  volume?: number;
}

export const useSoundHaptic = (options: SoundHapticOptions = {}) => {
  const { enableSound = true, enableHaptic = true, volume = 0.1 } = options;

  // Sound effects
  const playSound = useCallback((type: 'click' | 'hover' | 'success' | 'error' | 'notification') => {
    if (!enableSound) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      let frequency = 400;
      let duration = 80;

      switch (type) {
        case 'click':
          frequency = 500;
          duration = 30;
          break;
        case 'hover':
          frequency = 300;
          duration = 20;
          break;
        case 'success':
          frequency = 400;
          duration = 120;
          // Subtle success chord
          setTimeout(() => {
            const osc2 = audioContext.createOscillator();
            const gain2 = audioContext.createGain();
            osc2.connect(gain2);
            gain2.connect(audioContext.destination);
            osc2.frequency.setValueAtTime(600, audioContext.currentTime);
            gain2.gain.setValueAtTime(volume * 0.2, audioContext.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            osc2.start();
            osc2.stop(audioContext.currentTime + 0.2);
          }, 60);
          break;
        case 'error':
          frequency = 200;
          duration = 150;
          break;
        case 'notification':
          frequency = 350;
          duration = 100;
          break;
      }

      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (error) {
      // Fallback for browsers that don't support Web Audio API
      console.log('Audio not available');
    }
  }, [enableSound, volume]);

  // Haptic feedback
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' | 'selection' | 'impact' | 'notification') => {
    if (!enableHaptic) return;

    try {
      if (navigator.vibrate) {
        let pattern: number | number[] = 50;

        switch (type) {
          case 'light':
            pattern = 10;
            break;
          case 'medium':
            pattern = 20;
            break;
          case 'heavy':
            pattern = 40;
            break;
          case 'selection':
            pattern = [5];
            break;
          case 'impact':
            pattern = [20, 10, 20];
            break;
          case 'notification':
            pattern = [30, 15, 30];
            break;
        }

        navigator.vibrate(pattern);
      }
    } catch (error) {
      console.log('Haptic feedback not available');
    }
  }, [enableHaptic]);

  // Combined interaction feedback (more subtle)
  const playInteraction = useCallback((type: 'click' | 'hover' | 'success' | 'error') => {
    switch (type) {
      case 'click':
        playSound('click');
        triggerHaptic('selection');
        break;
      case 'hover':
        // Only play sound on hover, no haptic
        playSound('hover');
        break;
      case 'success':
        playSound('success');
        triggerHaptic('light');
        break;
      case 'error':
        playSound('error');
        triggerHaptic('medium');
        break;
    }
  }, [playSound, triggerHaptic]);

  return {
    playSound,
    triggerHaptic,
    playInteraction,
  };
};