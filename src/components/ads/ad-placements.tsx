import React from 'react';
import { NonIntrusiveAd } from './non-intrusive-ad';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Users, 
  Zap,
  Target,
  BarChart3,
  MessageSquare
} from 'lucide-react';

// Header Banner Ad
export const HeaderBannerAd: React.FC<{ userSubscription?: string }> = ({ userSubscription = 'free' }) => {
  const config = {
    id: 'header-banner',
    slot: '1234567890', // Replace with your AdSense slot ID
    format: 'auto' as const,
    responsive: true,
    style: {
      minHeight: '90px',
      maxHeight: '120px'
    }
  };

  return (
    <div className="w-full mb-4">
      <NonIntrusiveAd
        config={config}
        location="header"
        className="w-full"
        showLabel={false}
        allowDismiss={false}
        userSubscription={userSubscription}
      />
    </div>
  );
};

// Sidebar Rectangle Ad
export const SidebarRectangleAd: React.FC<{ userSubscription?: string }> = ({ userSubscription = 'free' }) => {
  const config = {
    id: 'sidebar-rectangle',
    slot: '1234567891', // Replace with your AdSense slot ID
    format: 'rectangle' as const,
    responsive: true,
    style: {
      width: '300px',
      height: '250px'
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Recommended
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <NonIntrusiveAd
          config={config}
          location="sidebar"
          className="w-full"
          userSubscription={userSubscription}
        />
      </CardContent>
    </Card>
  );
};

// In-Feed Ad (between posts)
export const InFeedAd: React.FC<{ userSubscription?: string }> = ({ userSubscription = 'free' }) => {
  const config = {
    id: 'in-feed',
    slot: '1234567892', // Replace with your AdSense slot ID
    format: 'auto' as const,
    responsive: true,
    style: {
      minHeight: '200px',
      maxHeight: '300px'
    }
  };

  return (
    <Card className="my-4 border-dashed border-2 border-muted/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Sponsored Content
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Ad
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <NonIntrusiveAd
          config={config}
          location="in-feed"
          className="w-full"
          userSubscription={userSubscription}
        />
      </CardContent>
    </Card>
  );
};

// Player Prop Card Ad
export const PlayerPropCardAd: React.FC<{ userSubscription?: string }> = ({ userSubscription = 'free' }) => {
  const config = {
    id: 'player-prop-card',
    slot: '1234567893', // Replace with your AdSense slot ID
    format: 'rectangle' as const,
    responsive: true,
    style: {
      width: '100%',
      height: '200px'
    }
  };

  return (
    <Card className="bg-gradient-card border border-border/50 mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="w-4 h-4" />
          Sports Betting Tools
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <NonIntrusiveAd
          config={config}
          location="player-props"
          className="w-full"
          userSubscription={userSubscription}
        />
      </CardContent>
    </Card>
  );
};

// Footer Banner Ad
export const FooterBannerAd: React.FC<{ userSubscription?: string }> = ({ userSubscription = 'free' }) => {
  const config = {
    id: 'footer-banner',
    slot: '1234567894', // Replace with your AdSense slot ID
    format: 'auto' as const,
    responsive: true,
    style: {
      minHeight: '90px',
      maxHeight: '120px'
    }
  };

  return (
    <div className="w-full mt-8">
        <NonIntrusiveAd
          config={config}
          location="footer"
          className="w-full"
          showLabel={false}
          allowDismiss={false}
          userSubscription={userSubscription}
        />
    </div>
  );
};

// Social Feed Ad
export const SocialFeedAd: React.FC<{ userSubscription?: string }> = ({ userSubscription = 'free' }) => {
  const config = {
    id: 'social-feed',
    slot: '1234567895', // Replace with your AdSense slot ID
    format: 'auto' as const,
    responsive: true,
    style: {
      minHeight: '150px',
      maxHeight: '250px'
    }
  };

  return (
    <Card className="my-4 border-dashed border-2 border-muted/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Community Partner
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Sponsored
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <NonIntrusiveAd
          config={config}
          location="social-feed"
          className="w-full"
          userSubscription={userSubscription}
        />
      </CardContent>
    </Card>
  );
};

// Analytics Dashboard Ad
export const AnalyticsDashboardAd: React.FC<{ userSubscription?: string }> = ({ userSubscription = 'free' }) => {
  const config = {
    id: 'analytics-dashboard',
    slot: '1234567896', // Replace with your AdSense slot ID
    format: 'rectangle' as const,
    responsive: true,
    style: {
      width: '100%',
      height: '180px'
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Analytics Tools
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <NonIntrusiveAd
          config={config}
          location="analytics"
          className="w-full"
          userSubscription={userSubscription}
        />
      </CardContent>
    </Card>
  );
};

// Mobile Banner Ad (responsive)
export const MobileBannerAd: React.FC<{ userSubscription?: string }> = ({ userSubscription = 'free' }) => {
  const config = {
    id: 'mobile-banner',
    slot: '1234567897', // Replace with your AdSense slot ID
    format: 'auto' as const,
    responsive: true,
    style: {
      minHeight: '50px',
      maxHeight: '100px'
    }
  };

  return (
    <div className="w-full my-4 md:hidden">
        <NonIntrusiveAd
          config={config}
          location="mobile-banner"
          className="w-full"
          showLabel={false}
          allowDismiss={true}
          userSubscription={userSubscription}
        />
    </div>
  );
};
