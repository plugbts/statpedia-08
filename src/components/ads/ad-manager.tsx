import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Settings, 
  Eye, 
  EyeOff, 
  TrendingUp, 
  DollarSign,
  Users,
  Zap,
  Shield
} from 'lucide-react';
import { adSenseService, type AdPlacement } from '@/services/adsense-service';

interface AdManagerProps {
  isAdmin?: boolean;
}

export const AdManager: React.FC<AdManagerProps> = ({ isAdmin = false }) => {
  const [adPlacements, setAdPlacements] = useState<AdPlacement[]>([]);
  const [isAdBlocked, setIsAdBlocked] = useState(false);
  const [adMetrics, setAdMetrics] = useState({ impressions: 0, clicks: 0, revenue: 0 });
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadAdData();
  }, []);

  const loadAdData = async () => {
    try {
      await adSenseService.initialize();
      setIsAdBlocked(adSenseService.isAdBlocked());
      setAdPlacements(adSenseService.getAllPlacements());
      setAdMetrics(adSenseService.getAdMetrics());
    } catch (error) {
      console.error('Failed to load ad data:', error);
    }
  };

  const toggleAdPlacement = (placementId: string, enabled: boolean) => {
    adSenseService.toggleAdPlacement(placementId, enabled);
    setAdPlacements(adSenseService.getAllPlacements());
  };

  const refreshMetrics = () => {
    setAdMetrics(adSenseService.getAdMetrics());
  };

  if (!isAdmin) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {isAdBlocked ? 'Ad blocker detected' : 'Ads help support Statpedia'}
              </span>
            </div>
            <Badge variant={isAdBlocked ? 'destructive' : 'secondary'}>
              {isAdBlocked ? 'Blocked' : 'Active'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Ad Manager
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            {showSettings ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showSettings ? 'Hide' : 'Show'} Settings
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Ad Status */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Impressions</span>
            </div>
            <div className="text-lg font-bold">{adMetrics.impressions.toLocaleString()}</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">Clicks</span>
            </div>
            <div className="text-lg font-bold">{adMetrics.clicks.toLocaleString()}</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <DollarSign className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">Revenue</span>
            </div>
            <div className="text-lg font-bold">${adMetrics.revenue.toFixed(2)}</div>
          </div>
        </div>

        {/* Ad Block Status */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Ad Blocker Detection</span>
          </div>
          <Badge variant={isAdBlocked ? 'destructive' : 'secondary'}>
            {isAdBlocked ? 'Blocked' : 'Not Blocked'}
          </Badge>
        </div>

        {/* Ad Placements Settings */}
        {showSettings && (
          <div className="space-y-3">
            <h4 className="font-medium">Ad Placements</h4>
            {adPlacements.map((placement) => (
              <div key={placement.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-medium text-sm">{placement.name}</div>
                    <div className="text-xs text-muted-foreground">{placement.location}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Priority {placement.priority}
                  </Badge>
                </div>
                <Switch
                  checked={placement.enabled}
                  onCheckedChange={(enabled) => toggleAdPlacement(placement.id, enabled)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshMetrics}
            className="flex-1"
          >
            <Zap className="w-4 h-4 mr-2" />
            Refresh Metrics
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAdData}
            className="flex-1"
          >
            <Settings className="w-4 h-4 mr-2" />
            Reload Ads
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
