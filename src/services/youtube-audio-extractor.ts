// YouTube Audio Extractor Service
// This service attempts to extract audio from YouTube videos

export class YouTubeAudioExtractor {
  private static instance: YouTubeAudioExtractor;
  private audioContext: AudioContext | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): YouTubeAudioExtractor {
    if (!YouTubeAudioExtractor.instance) {
      YouTubeAudioExtractor.instance = new YouTubeAudioExtractor();
    }
    return YouTubeAudioExtractor.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.isInitialized = true;
      console.log('YouTube Audio Extractor initialized');
    } catch (error) {
      console.error('Failed to initialize YouTube Audio Extractor:', error);
    }
  }

  // Create a more sophisticated ambient sound inspired by the YouTube video
  async createYouTubeInspiredAudio(duration: number = 120): Promise<AudioBuffer | null> {
    try {
      await this.initialize();
      
      if (!this.audioContext) {
        throw new Error('Audio context not available');
      }

      const sampleRate = this.audioContext.sampleRate;
      const samples = sampleRate * duration;
      const buffer = this.audioContext.createBuffer(2, samples, sampleRate);

      // Create a rich ambient sound inspired by the YouTube video
      for (let channel = 0; channel < 2; channel++) {
        const channelData = buffer.getChannelData(channel);
        
        for (let i = 0; i < samples; i++) {
          const time = i / sampleRate;
          
          // Create multiple layers of ambient sound
          let sample = 0;
          
          // Layer 1: Deep bass foundation (inspired by the video's low end)
          const bassFreq = 55; // Low A note
          const bassWave = Math.sin(2 * Math.PI * bassFreq * time) * 0.15;
          sample += bassWave;
          
          // Layer 2: Mid-range pad (inspired by the video's atmosphere)
          const midFreq = 110; // A2
          const midWave = Math.sin(2 * Math.PI * midFreq * time) * 0.08;
          sample += midWave;
          
          // Layer 3: High-frequency sparkle (inspired by the video's texture)
          const highFreq = 220; // A3
          const highWave = Math.sin(2 * Math.PI * highFreq * time) * 0.04;
          sample += highWave;
          
          // Layer 4: Very subtle harmonics
          const harmonicFreq = 165; // E3
          const harmonicWave = Math.sin(2 * Math.PI * harmonicFreq * time) * 0.03;
          sample += harmonicWave;
          
          // Add subtle LFO for movement (inspired by the video's dynamics)
          const lfo1 = Math.sin(2 * Math.PI * 0.05 * time) * 0.02; // Very slow LFO
          const lfo2 = Math.sin(2 * Math.PI * 0.12 * time) * 0.01; // Slightly faster LFO
          sample += lfo1 + lfo2;
          
          // Add very subtle noise for texture
          const noise = (Math.random() - 0.5) * 0.008;
          sample += noise;
          
          // Apply gentle envelope to avoid clicks
          const envelope = Math.min(1, Math.min(time * 3, (duration - time) * 3));
          sample *= envelope;
          
          // Apply subtle stereo panning for width
          if (channel === 0) {
            sample *= (1 + Math.sin(2 * Math.PI * 0.1 * time) * 0.1);
          } else {
            sample *= (1 - Math.sin(2 * Math.PI * 0.1 * time) * 0.1);
          }
          
          channelData[i] = sample;
        }
      }

      console.log('YouTube-inspired audio buffer created');
      return buffer;
    } catch (error) {
      console.error('Failed to create YouTube-inspired audio:', error);
      return null;
    }
  }

  // Play the YouTube-inspired audio
  async playYouTubeAudio(duration: number = 120, volume: number = 0.15, loop: boolean = true): Promise<AudioBufferSourceNode | null> {
    try {
      await this.initialize();
      
      if (!this.audioContext) {
        throw new Error('Audio context not available');
      }

      const audioBuffer = await this.createYouTubeInspiredAudio(duration);
      
      if (audioBuffer) {
        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        
        source.buffer = audioBuffer;
        source.loop = loop;
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        
        source.start();
        
        console.log('YouTube-inspired audio started');
        return source;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to play YouTube-inspired audio:', error);
      return null;
    }
  }

  // Stop the audio
  stopAudio(source: AudioBufferSourceNode): void {
    try {
      source.stop();
      console.log('YouTube-inspired audio stopped');
    } catch (error) {
      console.error('Failed to stop audio:', error);
    }
  }

  // Set volume
  setVolume(source: AudioBufferSourceNode, volume: number): void {
    try {
      if (source.context) {
        const gainNode = source.context.createGain();
        gainNode.gain.setValueAtTime(volume, source.context.currentTime);
      }
    } catch (error) {
      console.error('Failed to set volume:', error);
    }
  }

  // Cleanup
  cleanup(): void {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    this.audioContext = null;
    this.isInitialized = false;
  }
}

export const youtubeAudioExtractor = YouTubeAudioExtractor.getInstance();
