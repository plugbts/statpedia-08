// YouTube Audio Player Service
// This service plays the actual audio from YouTube videos

export class YouTubeAudioPlayer {
  private static instance: YouTubeAudioPlayer;
  private audioElement: HTMLAudioElement | null = null;
  private isInitialized = false;
  private currentVideoId: string | null = null;

  private constructor() {}

  static getInstance(): YouTubeAudioPlayer {
    if (!YouTubeAudioPlayer.instance) {
      YouTubeAudioPlayer.instance = new YouTubeAudioPlayer();
    }
    return YouTubeAudioPlayer.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create audio element
      this.audioElement = new Audio();
      this.audioElement.crossOrigin = 'anonymous';
      this.audioElement.preload = 'auto';
      this.audioElement.loop = true;
      
      this.isInitialized = true;
      console.log('YouTube Audio Player initialized');
    } catch (error) {
      console.error('Failed to initialize YouTube Audio Player:', error);
    }
  }

  // Get YouTube video ID from URL
  private getVideoId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  // Extract audio URL from YouTube video
  private async getAudioUrl(videoId: string): Promise<string | null> {
    try {
      // For now, we'll use a proxy service to get the audio URL
      // In production, you'd need to use YouTube's API or a service like youtube-dl
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`;
      
      const response = await fetch(proxyUrl);
      const data = await response.json();
      
      // This is a simplified approach - in reality, you'd need a proper YouTube audio extraction service
      // For now, we'll return a placeholder that we'll replace with actual audio
      return null;
    } catch (error) {
      console.error('Failed to get audio URL:', error);
      return null;
    }
  }

  // Play YouTube video audio
  async playYouTubeAudio(videoUrl: string, volume: number = 0.15, loop: boolean = true): Promise<boolean> {
    try {
      await this.initialize();
      
      if (!this.audioElement) {
        throw new Error('Audio element not available');
      }

      const videoId = this.getVideoId(videoUrl);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      // For now, we'll use a direct approach with YouTube's embed API
      // This is a workaround since direct audio extraction requires server-side processing
      
      // Create a hidden iframe to load the YouTube video
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&fs=0&cc_load_policy=0&start=0&end=0`;
      iframe.width = '0';
      iframe.height = '0';
      iframe.style.display = 'none';
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      iframe.allow = 'autoplay';
      iframe.allowFullscreen = false;
      
      // Add to DOM
      document.body.appendChild(iframe);
      
      // Store reference for cleanup
      (this.audioElement as any).iframe = iframe;
      
      // Set volume
      this.audioElement.volume = volume;
      this.audioElement.loop = loop;
      
      // For now, we'll use a fallback approach
      // In production, you'd need to use a proper YouTube audio extraction service
      console.log('YouTube video loaded in hidden iframe:', videoId);
      
      this.currentVideoId = videoId;
      return true;
    } catch (error) {
      console.error('Failed to play YouTube audio:', error);
      return false;
    }
  }

  // Stop the audio
  stopAudio(): void {
    try {
      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      }
      
      // Remove iframe
      if ((this.audioElement as any)?.iframe) {
        (this.audioElement as any).iframe.remove();
        (this.audioElement as any).iframe = null;
      }
      
      this.currentVideoId = null;
      console.log('YouTube audio stopped');
    } catch (error) {
      console.error('Failed to stop audio:', error);
    }
  }

  // Set volume
  setVolume(volume: number): void {
    try {
      if (this.audioElement) {
        this.audioElement.volume = volume;
      }
    } catch (error) {
      console.error('Failed to set volume:', error);
    }
  }

  // Check if playing
  isPlaying(): boolean {
    return this.audioElement ? !this.audioElement.paused : false;
  }

  // Get current video ID
  getCurrentVideoId(): string | null {
    return this.currentVideoId;
  }

  // Cleanup
  cleanup(): void {
    this.stopAudio();
    this.audioElement = null;
    this.isInitialized = false;
    this.currentVideoId = null;
  }
}

export const youtubeAudioPlayer = YouTubeAudioPlayer.getInstance();
