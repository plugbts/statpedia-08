import React from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BannerPreset {
  id: string;
  name: string;
  description?: string;
  image_url: string;
  category: 'sports' | 'abstract' | 'nature' | 'gradient' | 'solid';
  is_premium: boolean;
  created_at: string;
}

export interface BannerHistory {
  id: string;
  banner_url: string;
  banner_position: 'top' | 'center' | 'bottom';
  banner_blur: number;
  banner_brightness: number;
  banner_contrast: number;
  banner_saturation: number;
  changed_at: string;
}

export interface BannerSettings {
  banner_url?: string;
  banner_position?: 'top' | 'center' | 'bottom';
  banner_blur?: number;
  banner_brightness?: number;
  banner_contrast?: number;
  banner_saturation?: number;
}

class BannerService {
  // Get banner presets by category
  async getBannerPresets(category?: string, includePremium: boolean = true): Promise<BannerPreset[]> {
    try {
      const { data, error } = await supabase.rpc('get_banner_presets', {
        p_category: category || null,
        p_include_premium: includePremium
      });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Failed to get banner presets:', error);
      if (error?.code !== 'PGRST116' && !error?.message?.includes('function does not exist')) {
        throw error;
      }
      return [];
    }
  }

  // Get all banner categories
  async getBannerCategories(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('banner_presets')
        .select('category')
        .order('category');

      if (error) throw error;
      
      const categories = [...new Set(data?.map(item => item.category) || [])];
      return categories;
    } catch (error: any) {
      console.error('Failed to get banner categories:', error);
      return ['sports', 'abstract', 'nature', 'gradient', 'solid'];
    }
  }

  // Update user banner settings
  async updateUserBanner(settings: BannerSettings): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_profiles')
        .update(settings)
        .eq('user_id', user.id);

      if (error) throw error;

      // Save to banner history
      if (settings.banner_url) {
        await supabase.rpc('save_banner_history', {
          p_user_id: user.id,
          p_banner_url: settings.banner_url,
          p_banner_position: settings.banner_position || 'center',
          p_banner_blur: settings.banner_blur || 0,
          p_banner_brightness: settings.banner_brightness || 1.0,
          p_banner_contrast: settings.banner_contrast || 1.0,
          p_banner_saturation: settings.banner_saturation || 1.0
        });
      }
    } catch (error: any) {
      console.error('Failed to update user banner:', error);
      throw error;
    }
  }

  // Get user banner history
  async getUserBannerHistory(limit: number = 10): Promise<BannerHistory[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase.rpc('get_user_banner_history', {
        p_user_id: user.id,
        p_limit: limit
      });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Failed to get user banner history:', error);
      return [];
    }
  }

  // Upload custom banner to Supabase Storage
  async uploadCustomBanner(file: File): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Validate file
      const validation = this.validateBannerFile(file);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/banner_${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('user-banners')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('user-banners')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Failed to upload custom banner:', error);
      throw error;
    }
  }

  // Validate banner file
  validateBannerFile(file: File): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const minDimensions = { width: 1200, height: 300 };
    const maxDimensions = { width: 4000, height: 1000 };

    // Check file size
    if (file.size > maxSize) {
      errors.push('File size must be less than 5MB');
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      errors.push('File must be JPEG, PNG, or WebP format');
    }

    // Check dimensions (basic check - in real app you'd use canvas)
    if (file.name) {
      // This is a basic check - in production you'd validate actual dimensions
      const fileName = file.name.toLowerCase();
      if (!fileName.match(/\.(jpg|jpeg|png|webp)$/)) {
        errors.push('Invalid file extension');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Delete custom banner
  async deleteCustomBanner(bannerUrl: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Extract filename from URL
      const urlParts = bannerUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const fullPath = `${user.id}/${fileName}`;

      // Delete from storage
      const { error } = await supabase.storage
        .from('user-banners')
        .remove([fullPath]);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete custom banner:', error);
      throw error;
    }
  }

  // Get user's custom banners
  async getUserCustomBanners(): Promise<string[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase.storage
        .from('user-banners')
        .list(user.id, {
          limit: 50,
          offset: 0
        });

      if (error) throw error;

      return data?.map(file => {
        const { data: urlData } = supabase.storage
          .from('user-banners')
          .getPublicUrl(`${user.id}/${file.name}`);
        return urlData.publicUrl;
      }) || [];
    } catch (error) {
      console.error('Failed to get user custom banners:', error);
      return [];
    }
  }

  // Validate banner settings
  validateBannerSettings(settings: BannerSettings): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (settings.banner_blur !== undefined && (settings.banner_blur < 0 || settings.banner_blur > 20)) {
      errors.push('Blur must be between 0 and 20');
    }

    if (settings.banner_brightness !== undefined && (settings.banner_brightness < 0.1 || settings.banner_brightness > 2.0)) {
      errors.push('Brightness must be between 0.1 and 2.0');
    }

    if (settings.banner_contrast !== undefined && (settings.banner_contrast < 0.1 || settings.banner_contrast > 2.0)) {
      errors.push('Contrast must be between 0.1 and 2.0');
    }

    if (settings.banner_saturation !== undefined && (settings.banner_saturation < 0.1 || settings.banner_saturation > 2.0)) {
      errors.push('Saturation must be between 0.1 and 2.0');
    }

    if (settings.banner_position && !['top', 'center', 'bottom'].includes(settings.banner_position)) {
      errors.push('Position must be top, center, or bottom');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Generate banner CSS styles
  generateBannerStyles(settings: BannerSettings): React.CSSProperties {
    const styles: React.CSSProperties = {};

    if (settings.banner_url) {
      styles.backgroundImage = `url('${settings.banner_url}')`;
      styles.backgroundSize = 'cover';
      styles.backgroundRepeat = 'no-repeat';
      
      if (settings.banner_position) {
        styles.backgroundPosition = settings.banner_position;
      }
    }

    // Combine all filter effects into a single filter property
    const filters: string[] = [];
    
    if (settings.banner_blur && settings.banner_blur > 0) {
      filters.push(`blur(${settings.banner_blur}px)`);
    }

    if (settings.banner_brightness !== undefined && settings.banner_brightness !== 1.0) {
      filters.push(`brightness(${settings.banner_brightness})`);
    }

    if (settings.banner_contrast !== undefined && settings.banner_contrast !== 1.0) {
      filters.push(`contrast(${settings.banner_contrast})`);
    }

    if (settings.banner_saturation !== undefined && settings.banner_saturation !== 1.0) {
      filters.push(`saturate(${settings.banner_saturation})`);
    }

    if (filters.length > 0) {
      styles.filter = filters.join(' ');
    }

    return styles;
  }

  // Reset banner to default
  async resetBanner(): Promise<void> {
    try {
      await this.updateUserBanner({
        banner_url: null,
        banner_position: 'center',
        banner_blur: 0,
        banner_brightness: 1.0,
        banner_contrast: 1.0,
        banner_saturation: 1.0
      });
    } catch (error) {
      console.error('Failed to reset banner:', error);
      throw error;
    }
  }

  // Apply preset banner
  async applyPresetBanner(preset: BannerPreset): Promise<void> {
    try {
      await this.updateUserBanner({
        banner_url: preset.image_url,
        banner_position: 'center',
        banner_blur: 0,
        banner_brightness: 1.0,
        banner_contrast: 1.0,
        banner_saturation: 1.0
      });
    } catch (error) {
      console.error('Failed to apply preset banner:', error);
      throw error;
    }
  }
}

export const bannerService = new BannerService();
