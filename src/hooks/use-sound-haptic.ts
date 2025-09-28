import { useCallback } from 'react';

interface SoundHapticOptions {
  enableSound?: boolean;
  enableHaptic?: boolean;
  volume?: number;
}

export const useSoundHaptic = (options: SoundHapticOptions = {}) => {
  const { enableSound = true, enableHaptic = true, volume = 0.3 } = options;

  // Sound effects
  const playSound = useCallback((type: 'click' | 'hover' | 'success' | 'error' | 'notification') => {
    if (!enableSound) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      let frequency = 800;
      let duration = 100;

      switch (type) {
        case 'click':
          frequency = 1000;
          duration = 50;
          break;
        case 'hover':
          frequency = 600;
          duration = 30;
          break;
        case 'success':
          frequency = 800;
          duration = 200;
          // Success chord
          setTimeout(() => {
            const osc2 = audioContext.createOscillator();
            const gain2 = audioContext.createGain();
            osc2.connect(gain2);
            gain2.connect(audioContext.destination);
            osc2.frequency.setValueAtTime(1000, audioContext.currentTime);
            gain2.gain.setValueAtTime(volume * 0.3, audioContext.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            osc2.start();
            osc2.stop(audioContext.currentTime + 0.3);
          }, 100);
          break;
        case 'error':
          frequency = 300;
          duration = 300;
          break;
        case 'notification':
          frequency = 880;
          duration = 150;
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
            pattern = 25;
            break;
          case 'medium':
            pattern = 50;
            break;
          case 'heavy':
            pattern = 100;
            break;
          case 'selection':
            pattern = [10];
            break;
          case 'impact':
            pattern = [50, 50, 50];
            break;
          case 'notification':
            pattern = [100, 50, 100];
            break;
        }

        navigator.vibrate(pattern);
      }
    } catch (error) {
      console.log('Haptic feedback not available');
    }
  }, [enableHaptic]);

  // Combined interaction feedback
  const playInteraction = useCallback((type: 'click' | 'hover' | 'success' | 'error') => {
    switch (type) {
      case 'click':
        playSound('click');
        triggerHaptic('light');
        break;
      case 'hover':
        playSound('hover');
        triggerHaptic('selection');
        break;
      case 'success':
        playSound('success');
        triggerHaptic('notification');
        break;
      case 'error':
        playSound('error');
        triggerHaptic('heavy');
        break;
    }
  }, [playSound, triggerHaptic]);

  return {
    playSound,
    triggerHaptic,
    playInteraction,
  };
};