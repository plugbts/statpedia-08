// YouTube Audio Service
// This service handles YouTube audio extraction and playback

export class YouTubeAudioService {
  private static instance: YouTubeAudioService;
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isInitialized = false;
  private currentVolume = 0.015; // Very low volume (1.5%)
  private isMuted = false;

  private constructor() {}

  static getInstance(): YouTubeAudioService {
    if (!YouTubeAudioService.instance) {
      YouTubeAudioService.instance = new YouTubeAudioService();
    }
    return YouTubeAudioService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create master gain node
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      
      // Set initial volume
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.currentVolume, this.audioContext.currentTime);
      
      this.isInitialized = true;
      console.log('YouTube Audio Service initialized');
    } catch (error) {
      console.error('Failed to initialize YouTube Audio Service:', error);
    }
  }

  // Create a hidden iframe for YouTube video
  createYouTubePlayer(videoId: string): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&fs=0&cc_load_policy=0&start=0&end=0`;
    iframe.width = '0';
    iframe.height = '0';
    iframe.style.display = 'none';
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.allow = 'autoplay';
    
    return iframe;
  }

  // Extract audio from YouTube video using Web Audio API
  async extractAudioFromVideo(videoId: string): Promise<AudioBuffer | null> {
    try {
      if (!this.audioContext) {
        await this.initialize();
      }

      if (!this.audioContext) {
        throw new Error('Audio context not available');
      }

      // For now, we'll create a subtle ambient sound as a placeholder
      // In a production environment, you'd need to use YouTube's API or a service
      // that can extract audio from YouTube videos
      return this.createAmbientBuffer();
    } catch (error) {
      console.error('Failed to extract audio from YouTube video:', error);
      return null;
    }
  }

  // Create a subtle ambient audio buffer as fallback
  private createAmbientBuffer(): AudioBuffer | null {
    try {
      if (!this.audioContext) return null;

      const sampleRate = this.audioContext.sampleRate;
      const duration = 60; // 60 seconds
      const buffer = this.audioContext.createBuffer(2, sampleRate * duration, sampleRate);

      // Create a very subtle ambient pad
      for (let channel = 0; channel < 2; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < channelData.length; i++) {
          const time = i / sampleRate;
          const frequency = 55; // Low A note
          const amplitude = 0.01; // Very quiet
          
          // Create a subtle sine wave with slight variation
          const wave = Math.sin(2 * Math.PI * frequency * time) * amplitude;
          const lfo = Math.sin(2 * Math.PI * 0.1 * time) * 0.005; // Very slow LFO
          
          channelData[i] = wave + lfo;
        }
      }

      return buffer;
    } catch (error) {
      console.error('Failed to create ambient buffer:', error);
      return null;
    }
  }

  // Play the audio
  async playAudio(videoId: string): Promise<void> {
    try {
      await this.initialize();
      
      if (!this.audioContext || !this.masterGain) {
        throw new Error('Audio service not initialized');
      }

      // For now, we'll use the ambient buffer as a placeholder
      // In production, you'd extract the actual YouTube audio
      const audioBuffer = await this.extractAudioFromVideo(videoId);
      
      if (audioBuffer) {
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.loop = true;
        source.connect(this.masterGain!);
        source.start();
        
        console.log('YouTube audio started (ambient fallback)');
      }
    } catch (error) {
      console.error('Failed to play YouTube audio:', error);
    }
  }

  // Stop the audio
  stopAudio(): void {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.suspend();
    }
  }

  // Set volume
  setVolume(volume: number): void {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    
    if (this.masterGain && this.audioContext) {
      const targetVolume = this.isMuted ? 0 : this.currentVolume;
      this.masterGain.gain.setValueAtTime(targetVolume, this.audioContext.currentTime);
    }
  }

  // Mute/unmute
  setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.setVolume(this.currentVolume);
  }

  // Get current volume
  getVolume(): number {
    return this.currentVolume;
  }

  // Get mute state
  getMuted(): boolean {
    return this.isMuted;
  }

  // Cleanup
  cleanup(): void {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    this.audioContext = null;
    this.masterGain = null;
    this.isInitialized = false;
  }
}

export const youtubeAudioService = YouTubeAudioService.getInstance();
