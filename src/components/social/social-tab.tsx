import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  Settings
} from 'lucide-react';
import { socialService, type Post, type UserProfile, type Friend } from '@/services/social-service';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SocialTabProps {
  userRole?: string;
}

export const SocialTab: React.FC<SocialTabProps> = ({ userRole }) => {
  const [activeTab, setActiveTab] = useState('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<Friend[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [newPost, setNewPost] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load user profile
      let profile = await socialService.getUserProfile(user.id);
      if (!profile) {
        // Create profile if it doesn't exist
        profile = await socialService.createUserProfile(user.id, user.email?.split('@')[0] || 'user');
      }
      setUserProfile(profile);

      // Load posts and friends
      const [postsData, friendsData, requestsData] = await Promise.all([
        socialService.getPosts(),
        socialService.getFriends(user.id),
        socialService.getFriendRequests(user.id)
      ]);

      setPosts(postsData);
      setFriends(friendsData);
      setFriendRequests(requestsData);
    } catch (error: any) {
      console.error('Failed to load social data:', error);
      if (error?.code !== 'PGRST116' && !error?.message?.includes('relation')) {
        toast({
          title: "Error",
          description: "Failed to load social data",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
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
      
      // Reload posts to get updated vote counts
      const postsData = await socialService.getPosts();
      setPosts(postsData);
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="friends">Friends</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        {/* Feed Tab */}
        <TabsContent value="feed" className="space-y-4">
          {/* Create Post */}
          {userProfile && (
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={userProfile.avatar_url} />
                    <AvatarFallback>{getInitials(userProfile.display_name || userProfile.username)}</AvatarFallback>
                  </Avatar>
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
                <Card key={post.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={post.user_profile?.avatar_url} />
                        <AvatarFallback>
                          {getInitials(post.user_profile?.display_name || post.user_profile?.username || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 space-y-2">
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
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
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

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          {userProfile ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Your Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={userProfile.avatar_url} />
                    <AvatarFallback className="text-lg">
                      {getInitials(userProfile.display_name || userProfile.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold">{userProfile.display_name || userProfile.username}</h3>
                    <p className="text-muted-foreground">@{userProfile.username}</p>
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

                {userProfile.bio && (
                  <div>
                    <h4 className="font-medium mb-2">Bio</h4>
                    <p className="text-sm text-muted-foreground">{userProfile.bio}</p>
                  </div>
                )}
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
    </div>
  );
};
