import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { 
  Users, 
  Search, 
  Shield, 
  VolumeX, 
  Volume2, 
  Trash2, 
  TrendingUp,
  TrendingDown,
  Star,
  MessageSquare
} from 'lucide-react';
import { socialService, type UserProfile, type Post, type Comment, type KarmaHistory } from '@/services/social-service';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/user-context';

export const SocialAdmin: React.FC = () => {
  const { userRole, validateUserAccess, getMaskedEmail, logSecurityEvent } = useUser();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [karmaHistory, setKarmaHistory] = useState<KarmaHistory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [karmaAdjustment, setKarmaAdjustment] = useState('');
  const [muteDuration, setMuteDuration] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Check if user has admin access
  if (!validateUserAccess('admin')) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Access Denied</h3>
          <p className="text-muted-foreground">You don't have permission to access social administration.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [usersData, postsData, commentsData] = await Promise.all([
        socialService.getAllUsers(),
        socialService.getPosts(100),
        socialService.getComments('post', '', 100)
      ]);

      setUsers(usersData);
      setPosts(postsData);
      setComments(commentsData);
      
      logSecurityEvent('SOCIAL_ADMIN_DATA_LOADED', { 
        userCount: usersData.length,
        postCount: postsData.length,
        commentCount: commentsData.length,
        adminRole: userRole 
      });
    } catch (error: any) {
      console.error('Failed to load admin data:', error);
      if (error?.code !== 'PGRST116' && !error?.message?.includes('relation')) {
        toast({
          title: "Error",
          description: "Failed to load admin data",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) {
      setUsers([]);
      return;
    }

    try {
      const results = await socialService.searchUsers(searchQuery);
      setUsers(results);
    } catch (error: any) {
      console.error('Failed to search users:', error);
      toast({
        title: "Error",
        description: "Failed to search users",
        variant: "destructive"
      });
    }
  };

  const handleKarmaAdjustment = async () => {
    if (!selectedUser || !karmaAdjustment) return;

    const amount = parseInt(karmaAdjustment);
    if (isNaN(amount)) {
      toast({
        title: "Error",
        description: "Please enter a valid number",
        variant: "destructive"
      });
      return;
    }

    try {
      await socialService.updateUserKarma(
        selectedUser.user_id, 
        amount, 
        'admin_adjustment'
      );

      logSecurityEvent('USER_KARMA_ADJUSTED', {
        targetUserId: selectedUser.user_id,
        adjustment: amount,
        adminRole: userRole
      });

      toast({
        title: "Success",
        description: `Karma adjusted by ${amount > 0 ? '+' : ''}${amount}`,
      });

      setKarmaAdjustment('');
      setSelectedUser(null);
      loadData();
    } catch (error: any) {
      console.error('Failed to adjust karma:', error);
      toast({
        title: "Error",
        description: "Failed to adjust karma",
        variant: "destructive"
      });
    }
  };

  const handleMuteUser = async () => {
    if (!selectedUser) return;

    try {
      const muteUntil = muteDuration ? new Date(Date.now() + parseInt(muteDuration) * 24 * 60 * 60 * 1000).toISOString() : undefined;
      await socialService.muteUser(selectedUser.user_id, muteUntil);

      toast({
        title: "Success",
        description: muteDuration ? `User muted for ${muteDuration} days` : "User muted indefinitely",
      });

      setMuteDuration('');
      setSelectedUser(null);
      loadData();
    } catch (error: any) {
      console.error('Failed to mute user:', error);
      toast({
        title: "Error",
        description: "Failed to mute user",
        variant: "destructive"
      });
    }
  };

  const handleUnmuteUser = async (userId: string) => {
    try {
      await socialService.unmuteUser(userId);
      toast({
        title: "Success",
        description: "User unmuted",
      });
      loadData();
    } catch (error: any) {
      console.error('Failed to unmute user:', error);
      toast({
        title: "Error",
        description: "Failed to unmute user",
        variant: "destructive"
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await socialService.deleteCommentAsAdmin(commentId);
      toast({
        title: "Success",
        description: "Comment deleted",
      });
      loadData();
    } catch (error: any) {
      console.error('Failed to delete comment:', error);
      toast({
        title: "Error",
        description: "Failed to delete comment",
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
      <div className="flex items-center gap-2">
        <Shield className="w-6 h-6" />
        <h2 className="text-2xl font-bold">Social Administration</h2>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="karma">Karma</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search users by username or display name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchUsers()}
                />
                <Button onClick={handleSearchUsers}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Karma</TableHead>
                    <TableHead>ROI</TableHead>
                    <TableHead>Posts</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs font-medium">
                            {getInitials(user.display_name || user.username)}
                          </div>
                          <div>
                            <div className="font-medium">{user.display_name || user.username}</div>
                            <div className="text-xs text-muted-foreground">@{user.username}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          {user.karma}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {user.roi_percentage >= 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-500" />
                          )}
                          {user.roi_percentage.toFixed(1)}%
                        </div>
                      </TableCell>
                      <TableCell>{user.total_posts}</TableCell>
                      <TableCell>
                        {user.is_muted ? (
                          <Badge variant="destructive">Muted</Badge>
                        ) : (
                          <Badge variant="default">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedUser(user)}
                              >
                                <Star className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Adjust Karma</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Adjust karma for {user.display_name || user.username} (Current: {user.karma})
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="karma-adjustment">Karma Adjustment</Label>
                                  <Input
                                    id="karma-adjustment"
                                    type="number"
                                    placeholder="Enter positive or negative number"
                                    value={karmaAdjustment}
                                    onChange={(e) => setKarmaAdjustment(e.target.value)}
                                  />
                                </div>
                              </div>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleKarmaAdjustment}>
                                  Adjust Karma
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          {user.is_muted ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnmuteUser(user.user_id)}
                            >
                              <Volume2 className="w-4 h-4" />
                            </Button>
                          ) : (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedUser(user)}
                                >
                                  <VolumeX className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Mute User</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Mute {user.display_name || user.username} from commenting
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="mute-duration">Mute Duration (days)</Label>
                                    <Input
                                      id="mute-duration"
                                      type="number"
                                      placeholder="Leave empty for indefinite mute"
                                      value={muteDuration}
                                      onChange={(e) => setMuteDuration(e.target.value)}
                                    />
                                  </div>
                                </div>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleMuteUser}>
                                    Mute User
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Posts Tab */}
        <TabsContent value="posts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Recent Posts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {posts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No posts found
                  </div>
                ) : (
                  posts.map((post) => (
                    <div key={post.id} className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-medium">
                          {getInitials(post.user_profile?.display_name || post.user_profile?.username || 'U')}
                        </div>
                        <span className="font-medium text-sm">
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
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm">{post.net_score}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {post.upvotes} upvotes • {post.downvotes} downvotes
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comments Tab */}
        <TabsContent value="comments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Recent Comments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No comments found
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-medium">
                            {getInitials(comment.user_profile?.display_name || comment.user_profile?.username || 'U')}
                          </div>
                          <span className="font-medium text-sm">
                            {comment.user_profile?.display_name || comment.user_profile?.username || 'Unknown User'}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {comment.user_profile?.karma || 0} karma
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(comment.created_at)}
                          </span>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this comment? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteComment(comment.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete Comment
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm">{comment.net_score}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {comment.upvotes} upvotes • {comment.downvotes} downvotes
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Karma Tab */}
        <TabsContent value="karma" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                Karma Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-yellow-500">
                    {users.reduce((sum, user) => sum + user.karma, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Karma</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-500">
                    {users.filter(user => user.karma > 0).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Positive Karma Users</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-red-500">
                    {users.filter(user => user.karma < 0).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Negative Karma Users</div>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Karma</TableHead>
                    <TableHead>Posts</TableHead>
                    <TableHead>Comments</TableHead>
                    <TableHead>ROI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users
                    .sort((a, b) => b.karma - a.karma)
                    .map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs font-medium">
                              {getInitials(user.display_name || user.username)}
                            </div>
                            <div>
                              <div className="font-medium">{user.display_name || user.username}</div>
                              <div className="text-xs text-muted-foreground">@{user.username}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <span className={user.karma >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {user.karma}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{user.total_posts}</TableCell>
                        <TableCell>{user.total_comments}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {user.roi_percentage >= 0 ? (
                              <TrendingUp className="w-4 h-4 text-green-500" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-500" />
                            )}
                            <span className={user.roi_percentage >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {user.roi_percentage.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
