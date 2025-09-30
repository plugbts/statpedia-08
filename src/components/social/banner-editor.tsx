import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  Image, 
  Settings, 
  RotateCcw, 
  Download,
  Trash2,
  Check,
  X,
  Palette,
  Camera,
  Sparkles
} from 'lucide-react';
import { bannerService, type BannerPreset, type BannerSettings } from '@/services/banner-service';
import { useToast } from '@/hooks/use-toast';

interface BannerEditorProps {
  currentBanner?: BannerSettings;
  onBannerChange: (settings: BannerSettings) => void;
  onClose: () => void;
}

export const BannerEditor: React.FC<BannerEditorProps> = ({
  currentBanner,
  onBannerChange,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState('presets');
  const [presets, setPresets] = useState<BannerPreset[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [customBanners, setCustomBanners] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [bannerSettings, setBannerSettings] = useState<BannerSettings>({
    banner_url: currentBanner?.banner_url || '',
    banner_position: currentBanner?.banner_position || 'center',
    banner_blur: currentBanner?.banner_blur || 0,
    banner_brightness: currentBanner?.banner_brightness || 1.0,
    banner_contrast: currentBanner?.banner_contrast || 1.0,
    banner_saturation: currentBanner?.banner_saturation || 1.0
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadBannerData();
  }, []);

  const loadBannerData = async () => {
    try {
      setIsLoading(true);
      const [presetsData, categoriesData, customBannersData] = await Promise.all([
        bannerService.getBannerPresets(),
        bannerService.getBannerCategories(),
        bannerService.getUserCustomBanners()
      ]);

      setPresets(presetsData);
      setCategories(['all', ...categoriesData]);
      setCustomBanners(customBannersData);
    } catch (error) {
      console.error('Failed to load banner data:', error);
      toast({
        title: "Error",
        description: "Failed to load banner options",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const bannerUrl = await bannerService.uploadCustomBanner(file);
      
      setBannerSettings(prev => ({ ...prev, banner_url: bannerUrl }));
      setCustomBanners(prev => [bannerUrl, ...prev]);
      
      toast({
        title: "Success",
        description: "Banner uploaded successfully"
      });
    } catch (error: any) {
      console.error('Failed to upload banner:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload banner",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePresetSelect = (preset: BannerPreset) => {
    setBannerSettings(prev => ({
      ...prev,
      banner_url: preset.image_url,
      banner_position: 'center',
      banner_blur: 0,
      banner_brightness: 1.0,
      banner_contrast: 1.0,
      banner_saturation: 1.0
    }));
  };

  const handleCustomBannerSelect = (bannerUrl: string) => {
    setBannerSettings(prev => ({ ...prev, banner_url: bannerUrl }));
  };

  const handleDeleteCustomBanner = async (bannerUrl: string) => {
    try {
      await bannerService.deleteCustomBanner(bannerUrl);
      setCustomBanners(prev => prev.filter(url => url !== bannerUrl));
      
      if (bannerSettings.banner_url === bannerUrl) {
        setBannerSettings(prev => ({ ...prev, banner_url: '' }));
      }
      
      toast({
        title: "Success",
        description: "Banner deleted successfully"
      });
    } catch (error: any) {
      console.error('Failed to delete banner:', error);
      toast({
        title: "Error",
        description: "Failed to delete banner",
        variant: "destructive"
      });
    }
  };

  const handleSettingsChange = (key: keyof BannerSettings, value: any) => {
    setBannerSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyBanner = () => {
    onBannerChange(bannerSettings);
    onClose();
  };

  const handleResetBanner = () => {
    setBannerSettings({
      banner_url: '',
      banner_position: 'center',
      banner_blur: 0,
      banner_brightness: 1.0,
      banner_contrast: 1.0,
      banner_saturation: 1.0
    });
  };

  const filteredPresets = selectedCategory === 'all' 
    ? presets 
    : presets.filter(preset => preset.category === selectedCategory);

  const bannerStyles = bannerService.generateBannerStyles(bannerSettings);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Customize Banner</h3>
        <Button variant="outline" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Banner Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="w-full h-32 rounded-lg border overflow-hidden relative"
            style={bannerStyles}
          >
            {!bannerSettings.banner_url && (
              <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Image className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">No banner selected</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="presets">Presets</TabsTrigger>
          <TabsTrigger value="custom">Custom</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Presets Tab */}
        <TabsContent value="presets" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category === 'all' ? 'All' : category.charAt(0).toUpperCase() + category.slice(1)}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredPresets.map(preset => (
              <Card 
                key={preset.id} 
                className="cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                onClick={() => handlePresetSelect(preset)}
              >
                <CardContent className="p-2">
                  <div className="aspect-[4/1] rounded overflow-hidden mb-2">
                    <img 
                      src={preset.image_url} 
                      alt={preset.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{preset.name}</p>
                      <p className="text-xs text-muted-foreground">{preset.category}</p>
                    </div>
                    {preset.is_premium && (
                      <Badge variant="secondary" className="text-xs">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Premium
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Custom Tab */}
        <TabsContent value="custom" className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="banner-upload">Upload Custom Banner</Label>
              <div className="mt-2">
                <Input
                  ref={fileInputRef}
                  id="banner-upload"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  JPEG, PNG, or WebP format. Max 5MB. Recommended: 1200x300px
                </p>
              </div>
            </div>

            {customBanners.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Your Custom Banners</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {customBanners.map((bannerUrl, index) => (
                    <Card 
                      key={index}
                      className="cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                      onClick={() => handleCustomBannerSelect(bannerUrl)}
                    >
                      <CardContent className="p-2">
                        <div className="aspect-[4/1] rounded overflow-hidden mb-2 relative">
                          <img 
                            src={bannerUrl} 
                            alt={`Custom banner ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1 h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCustomBanner(bannerUrl);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">Custom Banner {index + 1}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label>Position</Label>
              <div className="flex gap-2 mt-2">
                {(['top', 'center', 'bottom'] as const).map(position => (
                  <Button
                    key={position}
                    variant={bannerSettings.banner_position === position ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSettingsChange('banner_position', position)}
                  >
                    {position.charAt(0).toUpperCase() + position.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label>Blur: {bannerSettings.banner_blur}px</Label>
              <Slider
                value={[bannerSettings.banner_blur || 0]}
                onValueChange={([value]) => handleSettingsChange('banner_blur', value)}
                max={20}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Brightness: {bannerSettings.banner_brightness}</Label>
              <Slider
                value={[bannerSettings.banner_brightness || 1.0]}
                onValueChange={([value]) => handleSettingsChange('banner_brightness', value)}
                min={0.1}
                max={2.0}
                step={0.1}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Contrast: {bannerSettings.banner_contrast}</Label>
              <Slider
                value={[bannerSettings.banner_contrast || 1.0]}
                onValueChange={([value]) => handleSettingsChange('banner_contrast', value)}
                min={0.1}
                max={2.0}
                step={0.1}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Saturation: {bannerSettings.banner_saturation}</Label>
              <Slider
                value={[bannerSettings.banner_saturation || 1.0]}
                onValueChange={([value]) => handleSettingsChange('banner_saturation', value)}
                min={0.1}
                max={2.0}
                step={0.1}
                className="mt-2"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={handleResetBanner}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
        <Button onClick={handleApplyBanner}>
          <Check className="w-4 h-4 mr-2" />
          Apply Banner
        </Button>
      </div>
    </div>
  );
};
