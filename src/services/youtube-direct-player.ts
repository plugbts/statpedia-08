// YouTube Direct Player Service
// This service uses YouTube's iframe API to play actual video audio

export class YouTubeDirectPlayer {
  private static instance: YouTubeDirectPlayer;
  private player: any = null;
  private isInitialized = false;
  private currentVideoId: string | null = null;
  private onStateChange: ((isPlaying: boolean) => void) | null = null;

  private constructor() {}

  static getInstance(): YouTubeDirectPlayer {
    if (!YouTubeDirectPlayer.instance) {
      YouTubeDirectPlayer.instance = new YouTubeDirectPlayer();
    }
    return YouTubeDirectPlayer.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load YouTube iframe API if not already loaded
      if (!window.YT) {
        await this.loadYouTubeAPI();
      }

      this.isInitialized = true;
      console.log('YouTube Direct Player initialized');
    } catch (error) {
      console.error('Failed to initialize YouTube Direct Player:', error);
    }
  }

  private loadYouTubeAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.YT) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.onload = () => {
        window.onYouTubeIframeAPIReady = () => {
          console.log('YouTube iframe API loaded');
          resolve();
        };
      };
      script.onerror = () => {
        reject(new Error('Failed to load YouTube iframe API'));
      };
      document.head.appendChild(script);
    });
  }

  // Get YouTube video ID from URL
  private getVideoId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  // Play YouTube video audio
  async playYouTubeAudio(videoUrl: string, volume: number = 0.15, onStateChange?: (isPlaying: boolean) => void): Promise<boolean> {
    try {
      await this.initialize();
      
      if (!window.YT) {
        throw new Error('YouTube iframe API not available');
      }

      const videoId = this.getVideoId(videoUrl);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      // Clean up existing player
      if (this.player) {
        this.player.destroy();
        this.player = null;
      }

      // Create hidden div for YouTube player
      const playerDiv = document.createElement('div');
      playerDiv.id = 'youtube-player';
      playerDiv.style.display = 'none';
      playerDiv.style.position = 'absolute';
      playerDiv.style.left = '-9999px';
      playerDiv.style.top = '-9999px';
      document.body.appendChild(playerDiv);

      // Store callback
      this.onStateChange = onStateChange;

      // Create YouTube player
      this.player = new window.YT.Player('youtube-player', {
        height: '0',
        width: '0',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          mute: 0,
          loop: 1,
          playlist: videoId,
          controls: 0,
          showinfo: 0,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          fs: 0,
          cc_load_policy: 0,
          start: 0,
          end: 0
        },
        events: {
          onReady: (event: any) => {
            console.log('YouTube player ready');
            event.target.setVolume(volume * 100); // YouTube uses 0-100 scale
            event.target.playVideo();
          },
          onStateChange: (event: any) => {
            const isPlaying = event.data === window.YT.PlayerState.PLAYING;
            console.log('YouTube player state changed:', isPlaying ? 'PLAYING' : 'PAUSED');
            
            if (this.onStateChange) {
              this.onStateChange(isPlaying);
            }
          },
          onError: (event: any) => {
            console.error('YouTube player error:', event.data);
          }
        }
      });

      this.currentVideoId = videoId;
      console.log('YouTube video loaded:', videoId);
      return true;
    } catch (error) {
      console.error('Failed to play YouTube audio:', error);
      return false;
    }
  }

  // Stop the audio
  stopAudio(): void {
    try {
      if (this.player) {
        this.player.stopVideo();
      }
      
      // Remove player div
      const playerDiv = document.getElementById('youtube-player');
      if (playerDiv) {
        playerDiv.remove();
      }
      
      this.currentVideoId = null;
      console.log('YouTube audio stopped');
    } catch (error) {
      console.error('Failed to stop audio:', error);
    }
  }

  // Pause the audio
  pauseAudio(): void {
    try {
      if (this.player) {
        this.player.pauseVideo();
      }
    } catch (error) {
      console.error('Failed to pause audio:', error);
    }
  }

  // Resume the audio
  resumeAudio(): void {
    try {
      if (this.player) {
        this.player.playVideo();
      }
    } catch (error) {
      console.error('Failed to resume audio:', error);
    }
  }

  // Set volume
  setVolume(volume: number): void {
    try {
      if (this.player) {
        this.player.setVolume(volume * 100); // YouTube uses 0-100 scale
      }
    } catch (error) {
      console.error('Failed to set volume:', error);
    }
  }

  // Check if playing
  isPlaying(): boolean {
    try {
      return this.player ? this.player.getPlayerState() === window.YT.PlayerState.PLAYING : false;
    } catch (error) {
      console.error('Failed to check playing state:', error);
      return false;
    }
  }

  // Get current video ID
  getCurrentVideoId(): string | null {
    return this.currentVideoId;
  }

  // Cleanup
  cleanup(): void {
    this.stopAudio();
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
    this.isInitialized = false;
    this.currentVideoId = null;
    this.onStateChange = null;
  }
}

// Extend Window interface for YouTube API
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const youtubeDirectPlayer = YouTubeDirectPlayer.getInstance();
