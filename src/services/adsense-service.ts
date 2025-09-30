// Google AdSense Service
// Handles AdSense integration and ad management

export interface AdConfig {
  id: string;
  slot: string;
  format: 'auto' | 'rectangle' | 'vertical' | 'horizontal';
  responsive: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export interface AdPlacement {
  id: string;
  name: string;
  location: string;
  enabled: boolean;
  config: AdConfig;
  priority: number;
}

class AdSenseService {
  private isInitialized = false;
  private adPlacements: AdPlacement[] = [];
  private adBlockDetected = false;

  // Initialize Google AdSense
  async initialize(): Promise<void> {
    if (this.isInitialized || typeof window === 'undefined') return;

    try {
      // Check for ad blocker
      await this.detectAdBlocker();

      if (!this.adBlockDetected) {
        // Load Google AdSense script
        await this.loadAdSenseScript();
        this.isInitialized = true;
        console.log('Google AdSense initialized successfully');
      } else {
        console.log('Ad blocker detected, skipping AdSense initialization');
      }
    } catch (error) {
      console.error('Failed to initialize Google AdSense:', error);
    }
  }

  // Load Google AdSense script
  private async loadAdSenseScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script already exists
      if (document.querySelector('script[src*="adsbygoogle.js"]')) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
      script.crossOrigin = 'anonymous';
      
      // Add your AdSense client ID here
      script.setAttribute('data-ad-client', 'ca-pub-XXXXXXXXXXXXXXXX');
      
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load AdSense script'));

      document.head.appendChild(script);
    });
  }

  // Detect ad blocker
  private async detectAdBlocker(): Promise<void> {
    return new Promise((resolve) => {
      const testAd = document.createElement('div');
      testAd.innerHTML = '&nbsp;';
      testAd.className = 'adsbox';
      testAd.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;';
      
      document.body.appendChild(testAd);
      
      setTimeout(() => {
        const isBlocked = testAd.offsetHeight === 0;
        this.adBlockDetected = isBlocked;
        document.body.removeChild(testAd);
        resolve();
      }, 100);
    });
  }

  // Register ad placement
  registerAdPlacement(placement: AdPlacement): void {
    this.adPlacements.push(placement);
    this.adPlacements.sort((a, b) => a.priority - b.priority);
  }

  // Get ad placements for a specific location
  getAdPlacements(location: string): AdPlacement[] {
    return this.adPlacements
      .filter(placement => placement.location === location && placement.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  // Create ad element
  createAdElement(config: AdConfig): HTMLElement | null {
    if (!this.isInitialized || this.adBlockDetected) return null;

    try {
      const adElement = document.createElement('ins');
      adElement.className = 'adsbygoogle';
      adElement.style.display = 'block';
      adElement.setAttribute('data-ad-client', 'ca-pub-XXXXXXXXXXXXXXXX');
      adElement.setAttribute('data-ad-slot', config.slot);
      adElement.setAttribute('data-ad-format', config.format);
      
      if (config.responsive) {
        adElement.setAttribute('data-full-width-responsive', 'true');
      }

      if (config.className) {
        adElement.className += ` ${config.className}`;
      }

      if (config.style) {
        Object.assign(adElement.style, config.style);
      }

      return adElement;
    } catch (error) {
      console.error('Failed to create ad element:', error);
      return null;
    }
  }

  // Push ad to AdSense
  pushAd(element: HTMLElement): void {
    if (!this.isInitialized || this.adBlockDetected) return;

    try {
      if (window.adsbygoogle) {
        (window.adsbygoogle as any[]).push({});
      }
    } catch (error) {
      console.error('Failed to push ad:', error);
    }
  }

  // Check if ads are blocked
  isAdBlocked(): boolean {
    return this.adBlockDetected;
  }

  // Check if AdSense is initialized
  isReady(): boolean {
    return this.isInitialized && !this.adBlockDetected;
  }

  // Get ad performance metrics (placeholder)
  getAdMetrics(): { impressions: number; clicks: number; revenue: number } {
    // This would integrate with AdSense reporting API in production
    return {
      impressions: 0,
      clicks: 0,
      revenue: 0
    };
  }

  // Enable/disable ad placements
  toggleAdPlacement(placementId: string, enabled: boolean): void {
    const placement = this.adPlacements.find(p => p.id === placementId);
    if (placement) {
      placement.enabled = enabled;
    }
  }

  // Get all ad placements
  getAllPlacements(): AdPlacement[] {
    return [...this.adPlacements];
  }
}

export const adSenseService = new AdSenseService();
