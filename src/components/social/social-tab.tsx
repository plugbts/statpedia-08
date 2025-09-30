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
  ImageIcon,
  Palette,
  Shield,
  X
} from 'lucide-react';
import { socialService, type Post, type UserProfile, type Friend } from '@/services/social-service';
import { recommendationService, type PersonalizedPost } from '@/services/recommendation-service';
import { bannerService, type BannerSettings } from '@/services/banner-service';
import { BannerEditor } from '@/components/social/banner-editor';
import { UserPredictionStats } from '@/components/predictions/user-prediction-stats';
import { KarmaTutorialPopup } from '@/components/ui/karma-tutorial-popup';
import { UsernamePrompt } from '@/components/ui/username-prompt';
import { SocialFeedAd } from '@/components/ads/ad-placements';
import { BetSlipSharer } from './bet-slip-sharer';
import { BetSlipCard } from './bet-slip-card';
import { BetSlipNotifications } from './bet-slip-notifications';
import { DirectMessages } from './direct-messages';
import { BlockedUsers } from './blocked-users';
import { FileAttachment } from './file-attachment';
import { PostAttachments } from './post-attachments';
import { betSlipSharingService, type SharedBetSlip } from '@/services/bet-slip-sharing';
import { messagingService } from '@/services/messaging-service';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/user-context';
import { UserDisplay } from '@/components/ui/user-display';

interface SocialTabProps {
  userRole?: string;
  userSubscription?: string;
  onReturnToDashboard?: () => void;
}

export const SocialTab: React.FC<SocialTabProps> = ({ onReturnToDashboard }) => {
  const { 
    userIdentity, 
    userRole, 
    userSubscription, 
    getUserDisplayName, 
    getUserUsername, 
    getUserInitials,
    updateUserIdentity,
    refreshUserIdentity 
  } = useUser();
  
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
  const [karmaTutorialChecked, setKarmaTutorialChecked] = useState(false);
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [sharedBetSlips, setSharedBetSlips] = useState<SharedBetSlip[]>([]);
  const [isLoadingBetSlips, setIsLoadingBetSlips] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [showFileAttachment, setShowFileAttachment] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'profile') {
      checkKarmaTutorial();
    } else {
      // Reset tutorial state when switching away from profile
      setKarmaTutorialChecked(false);
    }
  }, [activeTab]);

  const checkKarmaTutorial = async () => {
    if (activeTab === 'profile' && !karmaTutorialChecked && !showKarmaTutorial) {
      setKarmaTutorialChecked(true); // Prevent multiple checks in same session
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check localStorage for tutorial status - this persists across sessions
        const tutorialSeenKey = `karma_tutorial_seen_${user.id}`;
        const tutorialSeen = localStorage.getItem(tutorialSeenKey);
        
        console.log('Checking karma tutorial status:', { tutorialSeen, userId: user.id, showKarmaTutorial });
        
        if (tutorialSeen !== 'true') {
          // Tutorial not seen yet, show it
          console.log('Showing karma tutorial for first time');
          setTimeout(() => {
            if (!showKarmaTutorial) { // Double check before showing
              setShowKarmaTutorial(true);
            }
          }, 1000);
        } else {
          console.log('Karma tutorial already seen, not showing');
        }
      } catch (error) {
        console.error('Failed to check karma tutorial status:', error);
      }
    }
  };

  const handleKarmaTutorialClose = async () => {
    setShowKarmaTutorial(false);
    setKarmaTutorialChecked(true); // Mark as checked to prevent re-showing
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Mark tutorial as seen in localStorage - this ensures it never shows again
      const tutorialSeenKey = `karma_tutorial_seen_${user.id}`;
      localStorage.setItem(tutorialSeenKey, 'true');
      
      console.log('Karma tutorial marked as seen - will not show again for user:', user.id);
      
      // Also try to store in a more permanent way (could be database in future)
      try {
        // Store in sessionStorage as backup
        sessionStorage.setItem(tutorialSeenKey, 'true');
      } catch (e) {
        console.warn('Could not store in sessionStorage:', e);
      }
    } catch (error) {
      console.error('Failed to mark karma tutorial as seen:', error);
    }
  };

  const handleAcceptFriendRequest = async (requestId: string) => {
    try {
      await socialService.acceptFriendRequest(requestId);
      setFriendRequests(prev => prev.filter(req => req.id !== requestId));
      await loadInitialData(); // Reload friends list
      toast({
        title: "Success",
        description: "Friend request accepted"
      });
    } catch (error) {
      console.error('Failed to accept friend request:', error);
      toast({
        title: "Error",
        description: "Failed to accept friend request",
        variant: "destructive"
      });
    }
  };

  const handleDeclineFriendRequest = async (requestId: string) => {
    try {
      await socialService.declineFriendRequest(requestId);
      setFriendRequests(prev => prev.filter(req => req.id !== requestId));
      toast({
        title: "Success",
        description: "Friend request declined"
      });
    } catch (error) {
      console.error('Failed to decline friend request:', error);
      toast({
        title: "Error",
        description: "Failed to decline friend request",
        variant: "destructive"
      });
    }
  };

  const handleBlockUser = async (userIdToBlock: string) => {
    try {
      await messagingService.blockUser(userProfile?.user_id || '', userIdToBlock);
      toast({
        title: "Success",
        description: "User blocked successfully"
      });
    } catch (error) {
      console.error('Failed to block user:', error);
      toast({
        title: "Error",
        description: "Failed to block user",
        variant: "destructive"
      });
    }
  };

  const handleUsernameSet = async (username: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create or update user profile with username
      const profile = await socialService.createOrUpdateUserProfile(user.id, username, user.email);
      setUserProfile(profile);
      setShowUsernamePrompt(false);
      
      // Refresh user identity in context to update username across the app
      await refreshUserIdentity();
      
      // Reload all data now that profile is set up
      await loadInitialData();
    } catch (error: any) {
      console.error('Failed to set username:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (userProfile) {
      loadAlgorithmInsights();
    }
  }, [userProfile]);

  useEffect(() => {
    if (userProfile) {
      console.log('useEffect triggered for loadPosts, feedType:', feedType);
      loadPosts();
    }
  }, [feedType, userProfile]);

  const loadInitialData = async () => {
    try {
      console.log('Loading initial data...');
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found, returning');
        return;
      }
      console.log('User found:', user.id);
      setCurrentUserEmail(user.email || '');

      // Load each service individually to handle errors gracefully
      let profile: UserProfile | null = null;
      let postsData: Post[] = [];
      let friendsData: Friend[] = [];
      let requestsData: Friend[] = [];

      // Load user profile
      try {
        profile = await socialService.getUserProfile(user.id);
        if (!profile) {
          // Show username prompt if no profile exists
          console.log('No profile found, showing username prompt');
          setShowUsernamePrompt(true);
          setIsLoading(false);
          return;
        }

        // Check if user has a username set
        if (!profile.username || profile.username.trim() === '') {
          console.log('No username found, showing prompt');
          setShowUsernamePrompt(true);
          setIsLoading(false);
          return;
        }
      } catch (error: any) {
        console.log('Profile service error (expected if tables missing):', error);
        // Show username prompt if there's an error
        setShowUsernamePrompt(true);
        setIsLoading(false);
        return;
      }

      // Load posts with recommendation system
      try {
        console.log('Loading posts with feedType:', feedType);
        if (feedType === 'personalized') {
          postsData = await recommendationService.getPersonalizedFeed();
          console.log('Loaded personalized posts:', postsData.length);
        } else {
          const trendingPosts = await recommendationService.getTrendingPosts();
          postsData = trendingPosts.map(post => ({
            ...post,
            score: post.net_score,
            reason: 'Trending post'
          }));
          console.log('Loaded trending posts:', postsData.length);
        }
      } catch (error: any) {
        console.log('Posts service error (expected if tables missing):', error);
        // Fallback to regular posts
        try {
          console.log('Trying fallback posts...');
          const fallbackPosts = await socialService.getPosts();
          postsData = fallbackPosts.map(post => ({
            ...post,
            score: post.net_score,
            reason: 'Recent post'
          }));
          console.log('Loaded fallback posts:', postsData.length);
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

      console.log('Setting userProfile:', profile);
      setUserProfile(profile);
      // Convert Post[] to PersonalizedPost[] for compatibility
      const personalizedPosts: PersonalizedPost[] = postsData.map(post => ({
        ...post,
        score: 0,
        reason: 'recent'
      }));
      console.log('Setting posts:', personalizedPosts.length);
      setPosts(personalizedPosts);
      console.log('Setting friends:', friendsData.length);
      setFriends(friendsData);
      console.log('Setting friend requests:', requestsData.length);
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
      console.log('Finished loading initial data, isLoading set to false');
      setIsLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      console.log('loadPosts called with feedType:', feedType);
      if (feedType === 'personalized') {
        const personalizedPosts = await recommendationService.getPersonalizedFeed();
        console.log('Setting personalized posts:', personalizedPosts.length);
        setPosts(personalizedPosts);
      } else {
        const trendingPosts = await recommendationService.getTrendingPosts();
        const postsWithScore = trendingPosts.map(post => ({
          ...post,
          score: post.net_score,
          reason: 'Trending post'
        }));
        console.log('Setting trending posts:', postsWithScore.length);
        setPosts(postsWithScore);
      }
    } catch (error: any) {
      console.error('Failed to load posts:', error);
      // Fallback to regular posts
      try {
        console.log('Trying fallback posts in loadPosts...');
        const fallbackPosts = await socialService.getPosts();
        const postsWithScore = fallbackPosts.map(post => ({
          ...post,
          score: post.net_score,
          reason: 'Recent post'
        }));
        console.log('Setting fallback posts:', postsWithScore.length);
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
    // Ensure we're on the profile tab when closing banner editor
    setActiveTab('profile');
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


  const handleCreatePost = async () => {
    if (!newPost.trim() || !userProfile) return;

    try {
      setIsSubmitting(true);
      console.log('Creating post with content:', newPost.trim());
      
      // Create the post first
      const post = await socialService.createPost(userProfile.user_id, newPost.trim());
      console.log('Post created:', post);
      
      // Upload attachments if any
      if (attachedFiles.length > 0) {
        for (const file of attachedFiles) {
          const attachmentType = file.type.startsWith('image/') ? 'image' : 
                                file.type.startsWith('video/') ? 'video' : 'document';
          await socialService.createPostAttachment(post.id, userProfile.user_id, file, attachmentType);
        }
      }
      
      setNewPost('');
      setAttachedFiles([]);
      setShowFileAttachment(false);
      
      toast({
        title: "Success",
        description: "Post created successfully"
      });
      
      // Reload posts
      console.log('Reloading posts after creation...');
      const postsData = await socialService.getPosts();
      const personalizedPosts: PersonalizedPost[] = postsData.map(post => ({
        ...post,
        score: 0,
        reason: 'recent'
      }));
      console.log('Setting posts after creation:', personalizedPosts.length);
      setPosts(personalizedPosts);
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

  const handleDeletePost = async (postId: string) => {
    if (!userProfile) return;
    
    try {
      await socialService.deletePost(postId, userProfile.user_id);
      
      toast({
        title: "Success",
        description: "Post deleted successfully"
      });
      
      // Reload posts
      const postsData = await socialService.getPosts();
      const personalizedPosts: PersonalizedPost[] = postsData.map(post => ({
        ...post,
        score: 0,
        reason: 'recent'
      }));
      setPosts(personalizedPosts);
    } catch (error: any) {
      console.error('Failed to delete post:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete post",
        variant: "destructive"
      });
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
        <TabsList className="grid w-full grid-cols-7 gap-1">
          <TabsTrigger value="feed" className="text-xs">Feed</TabsTrigger>
          <TabsTrigger value="friends" className="text-xs">Friends</TabsTrigger>
          <TabsTrigger value="search" className="text-xs">Search</TabsTrigger>
          <TabsTrigger value="messages" className="text-xs">Messages</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs">Notifications</TabsTrigger>
          <TabsTrigger value="blocked" className="text-xs">Blocked</TabsTrigger>
          <TabsTrigger value="profile" className="text-xs">Profile</TabsTrigger>
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
          {userProfile ? (
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <UserDisplay 
                      userIdentity={userIdentity}
                      showAvatar={true}
                      showUsername={false}
                      showRole={false}
                      showSubscription={false}
                      size="lg"
                      variant="compact"
                    />
                    <div className="text-center">
                      <div className="text-xs font-medium text-foreground">
                        {getUserDisplayName()}
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
                    
                    {/* File Attachments */}
                    {showFileAttachment && (
                      <FileAttachment
                        onFilesSelected={(files) => setAttachedFiles(files)}
                        maxFiles={4}
                        maxFileSize={10}
                      />
                    )}
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {newPost.length}/150 characters
                        </span>
                        {attachedFiles.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {attachedFiles.length} file(s) attached
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowFileAttachment(!showFileAttachment)}
                          className="gap-2"
                        >
                          <ImageIcon className="w-4 h-4" />
                          {showFileAttachment ? 'Hide Files' : 'Attach Files'}
                        </Button>
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
          ) : (
            <Card>
              <CardContent className="p-4">
                <div className="text-center text-muted-foreground">
                  Loading user profile...
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
                      
                      {/* Post Attachments */}
                      {post.attachments && post.attachments.length > 0 && (
                        <PostAttachments attachments={post.attachments} />
                      )}
                      
                      <div className="flex items-center justify-between">
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
                        
                        {/* Delete button for post owner */}
                        {userProfile && post.user_id === userProfile.user_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePost(post.id)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
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
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAcceptFriendRequest(request.user_id)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeclineFriendRequest(request.user_id)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBlockUser(request.user_id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Shield className="w-4 h-4 mr-1" />
                        Block
                      </Button>
                    </div>
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

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-4">
          <DirectMessages userId={userProfile?.user_id || ''} />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <BetSlipNotifications userId={userProfile?.user_id || ''} />
        </TabsContent>

        {/* Blocked Users Tab */}
        <TabsContent value="blocked" className="space-y-4">
          <BlockedUsers userId={userProfile?.user_id || ''} />
        </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-3">
            {userProfile ? (
              <Card className="max-w-2xl mx-auto">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="w-4 h-4" />
                      Your Profile
                    </CardTitle>
                    {!isEditingProfile && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={openBannerEditor} className="text-xs px-2">
                          <Palette className="w-3 h-3 mr-1" />
                          Banner
                        </Button>
                        <Button variant="outline" size="sm" onClick={startEditingProfile} className="text-xs px-2">
                          <Settings className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 p-4">
                  {/* Banner */}
                  <div className="relative">
                    <div 
                      className="w-full h-24 rounded-lg border overflow-hidden relative"
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
                            <Image className="w-6 h-6 mx-auto mb-1" />
                            <p className="text-xs">No banner set</p>
                          </div>
                        </div>
                      )}
                    </div>
                    {!isEditingProfile && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-1 right-1 text-xs px-2"
                        onClick={openBannerEditor}
                      >
                        <Palette className="w-3 h-3 mr-1" />
                        Customize
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={userProfile.avatar_url} />
                      <AvatarFallback className="text-sm">
                        {getInitials(userProfile.display_name || userProfile.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      {isEditingProfile ? (
                        <div className="space-y-2">
                          <div>
                            <Label htmlFor="display-name" className="text-xs">Display Name</Label>
                            <Input
                              id="display-name"
                              value={editDisplayName}
                              onChange={(e) => setEditDisplayName(e.target.value)}
                              placeholder="Enter your display name (emojis allowed!)"
                              maxLength={50}
                              className="h-8 text-sm"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              {editDisplayName.length}/50 characters • Emojis and special characters allowed
                            </p>
                          </div>
                          <div>
                            <Label htmlFor="username" className="text-xs">Username</Label>
                            <Input
                              id="username"
                              value={editUsername}
                              onChange={(e) => setEditUsername(e.target.value)}
                              placeholder="Enter your username"
                              maxLength={20}
                              className="h-8 text-sm"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Username must be 3-20 characters, letters, numbers, and underscores only
                            </p>
                          </div>
                          <div>
                            <Label htmlFor="bio" className="text-xs">Bio</Label>
                            <Textarea
                              id="bio"
                              value={editBio}
                              onChange={(e) => setEditBio(e.target.value)}
                              placeholder="Tell us about yourself (emojis allowed!)"
                              maxLength={200}
                              className="min-h-[60px] resize-none text-sm"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              {editBio.length}/200 characters • Emojis and special characters allowed
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={saveProfileChanges}
                              disabled={isUpdatingProfile}
                              size="sm"
                              className="text-xs px-3"
                            >
                              {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={cancelEditingProfile}
                              disabled={isUpdatingProfile}
                              size="sm"
                              className="text-xs px-3"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <h3 className="text-lg font-bold">{userProfile.display_name || userProfile.username}</h3>
                          <p className="text-sm text-muted-foreground">@{userProfile.username}</p>
                          {userProfile.bio && (
                            <p className="text-xs text-muted-foreground mt-1">{userProfile.bio}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-xl font-bold text-yellow-500">{userProfile.karma}</div>
                      <div className="text-xs text-muted-foreground">Karma</div>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-xl font-bold text-green-500">{userProfile.roi_percentage.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">ROI</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-xl font-bold">{userProfile.total_posts}</div>
                      <div className="text-xs text-muted-foreground">Posts</div>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-xl font-bold">{userProfile.total_comments}</div>
                      <div className="text-xs text-muted-foreground">Comments</div>
                    </div>
                  </div>

                  {/* Prediction Stats */}
                  <UserPredictionStats isOwnProfile={true} />
                </CardContent>
              </Card>
            ) : (
              <Card className="max-w-2xl mx-auto">
                <CardContent className="p-6 text-center text-muted-foreground">
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

      {/* Username Prompt */}
      <UsernamePrompt
        isVisible={showUsernamePrompt}
        onClose={() => setShowUsernamePrompt(false)}
        onUsernameSet={handleUsernameSet}
        onReturnToDashboard={onReturnToDashboard}
        currentEmail={currentUserEmail}
      />
    </div>
  );
};
