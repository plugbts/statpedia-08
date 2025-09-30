import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Search, 
  UserPlus, 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  Send,
  TrendingUp,
  Star,
  User,
  Settings,
  RefreshCw,
  Image,
  Palette
} from 'lucide-react';
import { socialService, type Post, type UserProfile, type Friend } from '@/services/social-service';
import { recommendationService, type PersonalizedPost } from '@/services/recommendation-service';
import { bannerService, type BannerSettings } from '@/services/banner-service';
import { BannerEditor } from '@/components/social/banner-editor';
import { UserPredictionStats } from '@/components/predictions/user-prediction-stats';
import { KarmaTutorialPopup } from '@/components/ui/karma-tutorial-popup';
import { SocialFeedAd } from '@/components/ads/ad-placements';
import { BetSlipSharer } from './bet-slip-sharer';
import { BetSlipCard } from './bet-slip-card';
import { BetSlipNotifications } from './bet-slip-notifications';
import { betSlipSharingService, type SharedBetSlip } from '@/services/bet-slip-sharing';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SocialTabProps {
  userRole?: string;
  userSubscription?: string;
}

export const SocialTab: React.FC<SocialTabProps> = ({ userRole, userSubscription = 'free' }) => {
  const [activeTab, setActiveTab] = useState('feed');
  const [posts, setPosts] = useState<PersonalizedPost[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<Friend[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [newPost, setNewPost] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedType, setFeedType] = useState<'personalized' | 'trending'>('personalized');
  const [algorithmInsights, setAlgorithmInsights] = useState<any>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [showBannerEditor, setShowBannerEditor] = useState(false);
  const [currentBanner, setCurrentBanner] = useState<BannerSettings | null>(null);
  const [showKarmaTutorial, setShowKarmaTutorial] = useState(false);
  const [sharedBetSlips, setSharedBetSlips] = useState<SharedBetSlip[]>([]);
  const [isLoadingBetSlips, setIsLoadingBetSlips] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    checkKarmaTutorial();
  }, [activeTab]);

  const checkKarmaTutorial = async () => {
    if (activeTab === 'profile') {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check if user has seen karma tutorial
        const { data: tutorialData } = await supabase
          .from('user_preferences')
          .select('karma_tutorial_seen')
          .eq('user_id', user.id)
          .single();

        if (!tutorialData?.karma_tutorial_seen) {
          // Show tutorial after a short delay
          setTimeout(() => {
            setShowKarmaTutorial(true);
          }, 1000);
        }
      } catch (error) {
        console.error('Failed to check karma tutorial status:', error);
      }
    }
  };

  const handleKarmaTutorialClose = async () => {
    setShowKarmaTutorial(false);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Mark tutorial as seen
      await supabase
        .from('user_preferences')
        .upsert([{
          user_id: user.id,
          karma_tutorial_seen: true,
          updated_at: new Date().toISOString()
        }]);
    } catch (error) {
      console.error('Failed to mark karma tutorial as seen:', error);
    }
  };

  useEffect(() => {
    if (userProfile) {
      loadAlgorithmInsights();
    }
  }, [userProfile]);

  useEffect(() => {
    if (userProfile) {
      loadPosts();
    }
  }, [feedType]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load each service individually to handle errors gracefully
      let profile: UserProfile | null = null;
      let postsData: Post[] = [];
      let friendsData: Friend[] = [];
      let requestsData: Friend[] = [];

      // Load user profile
      try {
        profile = await socialService.getUserProfile(user.id);
        if (!profile) {
          // Create profile if it doesn't exist using user's metadata or email
          const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'user';
          const username = user.user_metadata?.username || user.email?.split('@')[0] || 'user';
          profile = await socialService.createUserProfile(user.id, username, displayName);
        }
      } catch (error: any) {
        console.log('Profile service error (expected if tables missing):', error);
        // Create a default profile for UI
        const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'user';
        const username = user.user_metadata?.username || user.email?.split('@')[0] || 'user';
        profile = {
          id: '',
          user_id: user.id,
          username: username,
          display_name: displayName,
          bio: '',
          avatar_url: '',
          karma: 0,
          roi_percentage: 0,
          total_posts: 0,
          total_comments: 0,
          is_muted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      // Load posts with recommendation system
      try {
        if (feedType === 'personalized') {
          postsData = await recommendationService.getPersonalizedFeed();
        } else {
          const trendingPosts = await recommendationService.getTrendingPosts();
          postsData = trendingPosts.map(post => ({
            ...post,
            score: post.net_score,
            reason: 'Trending post'
          }));
        }
      } catch (error: any) {
        console.log('Posts service error (expected if tables missing):', error);
        // Fallback to regular posts
        try {
          const fallbackPosts = await socialService.getPosts();
          postsData = fallbackPosts.map(post => ({
            ...post,
            score: post.net_score,
            reason: 'Recent post'
          }));
        } catch (fallbackError) {
          console.log('Fallback posts error:', fallbackError);
        }
      }

      // Load friends
      try {
        friendsData = await socialService.getFriends(user.id);
      } catch (error: any) {
        console.log('Friends service error (expected if tables missing):', error);
      }

      // Load friend requests
      try {
        requestsData = await socialService.getFriendRequests(user.id);
      } catch (error: any) {
        console.log('Friend requests service error (expected if tables missing):', error);
      }

      setUserProfile(profile);
      setPosts(postsData);
      setFriends(friendsData);
      setFriendRequests(requestsData);

      // Load shared bet slips
      try {
        setIsLoadingBetSlips(true);
        const betSlipsData = await betSlipSharingService.getSharedBetSlips(user.id);
        setSharedBetSlips(betSlipsData);
      } catch (error: any) {
        console.log('Bet slips service error (expected if tables missing):', error);
      } finally {
        setIsLoadingBetSlips(false);
      }
    } catch (error: any) {
      console.error('Unexpected error in loadInitialData:', error);
      toast({
        title: "Error",
        description: "Failed to load social data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      if (feedType === 'personalized') {
        const personalizedPosts = await recommendationService.getPersonalizedFeed();
        setPosts(personalizedPosts);
      } else {
        const trendingPosts = await recommendationService.getTrendingPosts();
        const postsWithScore = trendingPosts.map(post => ({
          ...post,
          score: post.net_score,
          reason: 'Trending post'
        }));
        setPosts(postsWithScore);
      }
    } catch (error: any) {
      console.error('Failed to load posts:', error);
      // Fallback to regular posts
      try {
        const fallbackPosts = await socialService.getPosts();
        const postsWithScore = fallbackPosts.map(post => ({
          ...post,
          score: post.net_score,
          reason: 'Recent post'
        }));
        setPosts(postsWithScore);
      } catch (fallbackError) {
        console.error('Fallback posts error:', fallbackError);
      }
    }
  };

  const loadAlgorithmInsights = async () => {
    try {
      const insights = await recommendationService.getAlgorithmInsights();
      setAlgorithmInsights(insights);
    } catch (error) {
      console.error('Failed to load algorithm insights:', error);
    }
  };

  const handleFeedTypeChange = (type: 'personalized' | 'trending') => {
    setFeedType(type);
  };

  const handlePostInteraction = async (postId: string, interactionType: 'view' | 'vote' | 'comment') => {
    try {
      await recommendationService.trackInteraction(interactionType, 'post', postId);
    } catch (error) {
      console.error('Failed to track interaction:', error);
    }
  };

  const startEditingProfile = () => {
    if (userProfile) {
      setEditUsername(userProfile.username);
      setEditDisplayName(userProfile.display_name || '');
      setEditBio(userProfile.bio || '');
      setIsEditingProfile(true);
    }
  };

  const cancelEditingProfile = () => {
    setIsEditingProfile(false);
    setEditUsername('');
    setEditDisplayName('');
    setEditBio('');
  };

  const saveProfileChanges = async () => {
    if (!userProfile) return;

    try {
      setIsUpdatingProfile(true);
      
      // Update username if changed
      if (editUsername !== userProfile.username) {
        await socialService.updateUsername(userProfile.user_id, editUsername);
      }
      
      // Update display name if changed
      if (editDisplayName !== (userProfile.display_name || '')) {
        await socialService.updateDisplayName(userProfile.user_id, editDisplayName);
      }
      
      // Update bio if changed
      if (editBio !== (userProfile.bio || '')) {
        await socialService.updateBio(userProfile.user_id, editBio);
      }

      // Reload profile data
      const updatedProfile = await socialService.getUserProfile(userProfile.user_id);
      if (updatedProfile) {
        setUserProfile(updatedProfile);
      }

      setIsEditingProfile(false);
      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleBannerChange = async (bannerSettings: BannerSettings) => {
    try {
      await bannerService.updateUserBanner(bannerSettings);
      
      // Update local profile state
      if (userProfile) {
        const updatedProfile = {
          ...userProfile,
          ...bannerSettings
        };
        setUserProfile(updatedProfile);
      }
      
      toast({
        title: "Success",
        description: "Banner updated successfully"
      });
    } catch (error: any) {
      console.error('Failed to update banner:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update banner",
        variant: "destructive"
      });
    }
  };

  const openBannerEditor = () => {
    if (userProfile) {
      setCurrentBanner({
        banner_url: userProfile.banner_url,
        banner_position: userProfile.banner_position,
        banner_blur: userProfile.banner_blur,
        banner_brightness: userProfile.banner_brightness,
        banner_contrast: userProfile.banner_contrast,
        banner_saturation: userProfile.banner_saturation
      });
      setShowBannerEditor(true);
    }
  };

  const closeBannerEditor = () => {
    setShowBannerEditor(false);
    setCurrentBanner(null);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const results = await socialService.searchUsers(searchQuery);
      setSearchResults(results);
    } catch (error: any) {
      console.error('Failed to search users:', error);
      toast({
        title: "Error",
        description: "Failed to search users",
        variant: "destructive"
      });
    }
  };

  const handleSendFriendRequest = async (friendId: string) => {
    try {
      await socialService.sendFriendRequest(friendId);
      toast({
        title: "Success",
        description: "Friend request sent"
      });
    } catch (error: any) {
      console.error('Failed to send friend request:', error);
      toast({
        title: "Error",
        description: "Failed to send friend request",
        variant: "destructive"
      });
    }
  };

  const handleAcceptFriendRequest = async (friendId: string) => {
    try {
      await socialService.acceptFriendRequest(friendId);
      toast({
        title: "Success",
        description: "Friend request accepted"
      });
      loadInitialData(); // Reload to update friends list
    } catch (error: any) {
      console.error('Failed to accept friend request:', error);
      toast({
        title: "Error",
        description: "Failed to accept friend request",
        variant: "destructive"
      });
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.trim() || !userProfile) return;

    try {
      setIsSubmitting(true);
      await socialService.createPost(userProfile.user_id, newPost.trim());
      
      setNewPost('');
      toast({
        title: "Success",
        description: "Post created successfully"
      });
      
      // Reload posts
      const postsData = await socialService.getPosts();
      setPosts(postsData);
    } catch (error: any) {
      console.error('Failed to create post:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (postId: string, voteType: 'upvote' | 'downvote') => {
    try {
      await socialService.vote('post', postId, voteType);
      
      // Track the interaction
      await handlePostInteraction(postId, 'vote');
      
      // Reload posts to get updated vote counts
      await loadPosts();
    } catch (error: any) {
      console.error('Failed to vote:', error);
      toast({
        title: "Error",
        description: "Failed to vote on post",
        variant: "destructive"
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

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
        <h2 className="text-2xl font-bold">Social</h2>
        {userProfile && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">{userProfile.karma} Karma</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">{userProfile.roi_percentage.toFixed(1)}% ROI</span>
            </div>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="friends">Friends</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        {/* Feed Tab */}
        <TabsContent value="feed" className="space-y-4">
          {/* Feed Controls */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={feedType === 'personalized' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleFeedTypeChange('personalized')}
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Personalized
                    </Button>
                    <Button
                      variant={feedType === 'trending' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleFeedTypeChange('trending')}
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Trending
                    </Button>
                  </div>
                  
                  {algorithmInsights && (
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{algorithmInsights.totalInteractions} interactions</span>
                      <span>{algorithmInsights.totalPreferences} preferences</span>
                      {algorithmInsights.lastUpdate && (
                        <span>Updated {formatTimeAgo(algorithmInsights.lastUpdate)}</span>
                      )}
                    </div>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => recommendationService.refreshRecommendations()}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Create Post */}
          {userProfile && (
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={userProfile.avatar_url} />
                      <AvatarFallback className="text-sm font-medium">
                        {getInitials(userProfile.display_name || userProfile.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                      <div className="text-xs font-medium text-foreground">
                        {userProfile.display_name || userProfile.username}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {userProfile.karma} karma
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <Textarea
                      placeholder="Share your thoughts... (max 150 characters)"
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      maxLength={150}
                      className="min-h-[80px] resize-none"
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        {newPost.length}/150 characters
                      </span>
                      <div className="flex gap-2">
                        <BetSlipSharer 
                          userId={userProfile?.user_id || ''} 
                          onBetSlipShared={(betSlip) => {
                            setSharedBetSlips(prev => [betSlip, ...prev]);
                            toast({
                              title: "Success",
                              description: "Bet slip shared to social feed!"
                            });
                          }}
                        />
                        <Button
                          onClick={handleCreatePost}
                          disabled={!newPost.trim() || isSubmitting}
                          size="sm"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          {isSubmitting ? 'Posting...' : 'Post'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Posts Feed */}
          <div className="space-y-4">
            {posts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No posts yet. Be the first to share your thoughts!
                </CardContent>
              </Card>
            ) : (
            posts.map((post) => (
              <Card key={post.id} onMouseEnter={() => handlePostInteraction(post.id, 'view')}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={post.user_profile?.avatar_url} />
                      <AvatarFallback>
                        {getInitials(post.user_profile?.display_name || post.user_profile?.username || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {post.user_profile?.display_name || post.user_profile?.username || 'Unknown User'}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {post.user_profile?.karma || 0} karma
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(post.created_at)}
                          </span>
                        </div>
                        
                        {post.reason && (
                          <Badge variant="secondary" className="text-xs">
                            {post.reason}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm">{post.content}</p>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVote(post.id, 'upvote')}
                            className={`h-8 w-8 p-0 ${post.user_vote === 'upvote' ? 'text-green-500' : ''}`}
                          >
                            <ThumbsUp className="w-4 h-4" />
                          </Button>
                          <span className="text-sm text-muted-foreground min-w-[20px] text-center">
                            {post.net_score}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVote(post.id, 'downvote')}
                            className={`h-8 w-8 p-0 ${post.user_vote === 'downvote' ? 'text-red-500' : ''}`}
                          >
                            <ThumbsDown className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        {feedType === 'personalized' && post.score && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="w-3 h-3" />
                            <span>Score: {post.score.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
            )}
            
            {/* Shared Bet Slips */}
            {sharedBetSlips.map((betSlip) => (
              <BetSlipCard
                key={betSlip.id}
                betSlip={betSlip}
                currentUserId={userProfile?.user_id}
                onTail={(betSlipId) => {
                  setSharedBetSlips(prev => 
                    prev.map(bs => 
                      bs.id === betSlipId 
                        ? { ...bs, tailCount: bs.tailCount + 1, isTailed: true }
                        : bs
                    )
                  );
                }}
                onLike={(betSlipId) => {
                  setSharedBetSlips(prev => 
                    prev.map(bs => 
                      bs.id === betSlipId 
                        ? { 
                            ...bs, 
                            likeCount: bs.isLiked ? bs.likeCount - 1 : bs.likeCount + 1,
                            isLiked: !bs.isLiked
                          }
                        : bs
                    )
                  );
                }}
              />
            ))}

            {/* Social Feed Ad - Show after every 3 posts */}
            {posts.length > 0 && posts.length % 3 === 0 && (
              <SocialFeedAd userSubscription={userSubscription} />
            )}
          </div>
        </TabsContent>

        {/* Friends Tab */}
        <TabsContent value="friends" className="space-y-4">
          {/* Friend Requests */}
          {friendRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Friend Requests ({friendRequests.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {friendRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={request.friend_profile?.avatar_url} />
                        <AvatarFallback>
                          {getInitials(request.friend_profile?.display_name || request.friend_profile?.username || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {request.friend_profile?.display_name || request.friend_profile?.username || 'Unknown User'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {request.friend_profile?.karma || 0} karma
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAcceptFriendRequest(request.user_id)}
                    >
                      Accept
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Friends List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Friends ({friends.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {friends.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No friends yet. Search for users to add them as friends!
                </div>
              ) : (
                <div className="space-y-3">
                  {friends.map((friend) => (
                    <div key={friend.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={friend.friend_profile?.avatar_url} />
                        <AvatarFallback>
                          {getInitials(friend.friend_profile?.display_name || friend.friend_profile?.username || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-medium">
                          {friend.friend_profile?.display_name || friend.friend_profile?.username || 'Unknown User'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {friend.friend_profile?.karma || 0} karma • {friend.friend_profile?.roi_percentage.toFixed(1)}% ROI
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Search Users
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by username or display name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-3">
                  {searchResults.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback>
                            {getInitials(user.display_name || user.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.display_name || user.username}</div>
                          <div className="text-sm text-muted-foreground">
                            @{user.username} • {user.karma} karma • {user.roi_percentage.toFixed(1)}% ROI
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSendFriendRequest(user.user_id)}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Friend
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <BetSlipNotifications userId={userProfile?.user_id || ''} />
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          {userProfile ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Your Profile
                  </CardTitle>
                  {!isEditingProfile && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={openBannerEditor}>
                        <Palette className="w-4 h-4 mr-2" />
                        Edit Banner
                      </Button>
                      <Button variant="outline" size="sm" onClick={startEditingProfile}>
                        <Settings className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Banner */}
                <div className="relative">
                  <div 
                    className="w-full h-32 rounded-lg border overflow-hidden relative"
                    style={bannerService.generateBannerStyles({
                      banner_url: userProfile.banner_url,
                      banner_position: userProfile.banner_position,
                      banner_blur: userProfile.banner_blur,
                      banner_brightness: userProfile.banner_brightness,
                      banner_contrast: userProfile.banner_contrast,
                      banner_saturation: userProfile.banner_saturation
                    })}
                  >
                    {!userProfile.banner_url && (
                      <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white">
                        <div className="text-center">
                          <Image className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-sm">No banner set</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {!isEditingProfile && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={openBannerEditor}
                    >
                      <Palette className="w-4 h-4 mr-2" />
                      Customize
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={userProfile.avatar_url} />
                    <AvatarFallback className="text-lg">
                      {getInitials(userProfile.display_name || userProfile.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    {isEditingProfile ? (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="display-name">Display Name</Label>
                          <Input
                            id="display-name"
                            value={editDisplayName}
                            onChange={(e) => setEditDisplayName(e.target.value)}
                            placeholder="Enter your display name"
                            maxLength={50}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {editDisplayName.length}/50 characters
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="username">Username</Label>
                          <Input
                            id="username"
                            value={editUsername}
                            onChange={(e) => setEditUsername(e.target.value)}
                            placeholder="Enter your username"
                            maxLength={20}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Username must be 3-20 characters, letters, numbers, and underscores only
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="bio">Bio</Label>
                          <Textarea
                            id="bio"
                            value={editBio}
                            onChange={(e) => setEditBio(e.target.value)}
                            placeholder="Tell us about yourself..."
                            maxLength={200}
                            className="min-h-[80px] resize-none"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {editBio.length}/200 characters
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={saveProfileChanges}
                            disabled={isUpdatingProfile}
                            size="sm"
                          >
                            {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={cancelEditingProfile}
                            disabled={isUpdatingProfile}
                            size="sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h3 className="text-xl font-bold">{userProfile.display_name || userProfile.username}</h3>
                        <p className="text-muted-foreground">@{userProfile.username}</p>
                        {userProfile.bio && (
                          <p className="text-sm text-muted-foreground mt-2">{userProfile.bio}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-yellow-500">{userProfile.karma}</div>
                    <div className="text-sm text-muted-foreground">Karma</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-500">{userProfile.roi_percentage.toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">ROI</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{userProfile.total_posts}</div>
                    <div className="text-sm text-muted-foreground">Posts</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{userProfile.total_comments}</div>
                    <div className="text-sm text-muted-foreground">Comments</div>
                  </div>
                </div>

                {/* Prediction Stats */}
                <UserPredictionStats isOwnProfile={true} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No profile found. Please refresh the page.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Banner Editor Modal */}
      {showBannerEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <BannerEditor
                currentBanner={currentBanner || undefined}
                onBannerChange={handleBannerChange}
                onClose={closeBannerEditor}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Karma Tutorial Popup */}
      <KarmaTutorialPopup
        isVisible={showKarmaTutorial}
        onClose={handleKarmaTutorialClose}
      />
    </div>
  );
};
