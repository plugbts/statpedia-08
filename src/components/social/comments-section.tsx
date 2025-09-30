import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageCircle, 
  ThumbsUp, 
  ThumbsDown, 
  Send, 
  MoreVertical,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { socialService, type Comment, type UserProfile } from '@/services/social-service';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CommentsSectionProps {
  parentType: 'player_prop' | 'prediction' | 'post';
  parentId: string;
  userRole?: string;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({
  parentType,
  parentId,
  userRole
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [typingUsers, setTypingUsers] = useState<UserProfile[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  useEffect(() => {
    loadComments();
    loadUserProfile();
    setupTypingIndicators();
    
    // Cleanup typing indicators on unmount
    return () => {
      if (isTyping) {
        socialService.setTypingIndicator(parentType, parentId, false);
      }
    };
  }, [parentType, parentId]);

  const loadComments = async () => {
    try {
      setIsLoading(true);
      const commentsData = await socialService.getComments(parentType, parentId);
      
      // Get user votes for comments
      const { data: { user } } = await supabase.auth.getUser();
      if (user && commentsData.length > 0) {
        const commentIds = commentsData.map(c => c.id);
        const userVotes = await socialService.getUserVotes('comment', commentIds);
        
        // Add user vote info to comments
        const commentsWithVotes = commentsData.map(comment => {
          const userVote = userVotes.find(v => v.target_id === comment.id);
          return {
            ...comment,
            user_vote: userVote?.vote_type
          };
        });
        
        setComments(commentsWithVotes);
      } else {
        setComments(commentsData);
      }
    } catch (error: any) {
      console.error('Failed to load comments:', error);
      if (error?.code !== 'PGRST116' && !error?.message?.includes('relation')) {
        toast({
          title: "Error",
          description: "Failed to load comments",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const profile = await socialService.getUserProfile(user.id);
      setUserProfile(profile);
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  const setupTypingIndicators = () => {
    // Set up real-time subscription for typing indicators
    const typingSubscription = supabase
      .channel(`typing-${parentType}-${parentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'typing_indicators',
        filter: `target_type=eq.${parentType}`
      }, (payload) => {
        if (payload.new.target_id === parentId) {
          loadTypingIndicators();
        }
      })
      .subscribe();

    // Load initial typing indicators
    loadTypingIndicators();

    return () => {
      typingSubscription.unsubscribe();
    };
  };

  const loadTypingIndicators = async () => {
    try {
      const typingData = await socialService.getTypingIndicators(parentType, parentId);
      setTypingUsers(typingData.map(t => t.user_profile!).filter(Boolean));
    } catch (error) {
      console.error('Failed to load typing indicators:', error);
    }
  };

  const handleCommentSubmit = async () => {
    if (!newComment.trim() || !userProfile) return;

    try {
      setIsSubmitting(true);
      await socialService.createComment(parentType, parentId, newComment.trim());
      
      setNewComment('');
      setIsTyping(false);
      await socialService.setTypingIndicator(parentType, parentId, false);
      
      toast({
        title: "Success",
        description: "Comment posted successfully"
      });
      
      loadComments();
    } catch (error: any) {
      console.error('Failed to create comment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to post comment",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (commentId: string, voteType: 'upvote' | 'downvote') => {
    try {
      await socialService.vote('comment', commentId, voteType);
      loadComments(); // Reload to get updated vote counts
    } catch (error: any) {
      console.error('Failed to vote:', error);
      toast({
        title: "Error",
        description: "Failed to vote on comment",
        variant: "destructive"
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await socialService.deleteComment(commentId, userProfile!.user_id);
      toast({
        title: "Success",
        description: "Comment deleted successfully"
      });
      loadComments();
    } catch (error: any) {
      console.error('Failed to delete comment:', error);
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive"
      });
    }
  };

  const handleDeleteCommentAsAdmin = async (commentId: string) => {
    try {
      await socialService.deleteCommentAsAdmin(commentId);
      toast({
        title: "Success",
        description: "Comment deleted by admin"
      });
      loadComments();
    } catch (error: any) {
      console.error('Failed to delete comment as admin:', error);
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive"
      });
    }
  };

  const handleTyping = (value: string) => {
    setNewComment(value);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (value.trim() && !isTyping) {
      setIsTyping(true);
      socialService.setTypingIndicator(parentType, parentId, true);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socialService.setTypingIndicator(parentType, parentId, false);
    }, 1000);
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Comments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comment Input */}
        {userProfile ? (
          <div className="space-y-3">
            <div className="flex gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={userProfile.avatar_url} />
                <AvatarFallback>{getInitials(userProfile.display_name || userProfile.username)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  placeholder="Share your thoughts..."
                  value={newComment}
                  onChange={(e) => handleTyping(e.target.value)}
                  maxLength={500}
                  className="min-h-[80px] resize-none"
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-muted-foreground">
                    {newComment.length}/500 characters
                  </span>
                  <Button
                    onClick={handleCommentSubmit}
                    disabled={!newComment.trim() || isSubmitting}
                    size="sm"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Posting...' : 'Post'}
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Typing Indicators */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex -space-x-2">
                  {typingUsers.slice(0, 3).map((user, index) => (
                    <Avatar key={user.id} className="w-6 h-6 border-2 border-background">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {getInitials(user.display_name || user.username)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span>
                  {typingUsers.length === 1 
                    ? `${typingUsers[0].display_name || typingUsers[0].username} is typing...`
                    : `${typingUsers.length} people are typing...`
                  }
                </span>
              </div>
            )}
          </div>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please create a profile to comment
            </AlertDescription>
          </Alert>
        )}

        {/* Comments List */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No comments yet. Be the first to share your thoughts!
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 p-3 border rounded-lg">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={comment.user_profile?.avatar_url} />
                  <AvatarFallback>
                    {getInitials(comment.user_profile?.display_name || comment.user_profile?.username || 'U')}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
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
                  
                  <p className="text-sm">{comment.content}</p>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVote(comment.id, 'upvote')}
                        className={`h-8 w-8 p-0 ${comment.user_vote === 'upvote' ? 'text-green-500' : ''}`}
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground min-w-[20px] text-center">
                        {comment.net_score}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVote(comment.id, 'downvote')}
                        className={`h-8 w-8 p-0 ${comment.user_vote === 'downvote' ? 'text-red-500' : ''}`}
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {/* Comment Actions */}
                    {(userProfile?.user_id === comment.user_id || userRole === 'admin' || userRole === 'owner') && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {userProfile?.user_id === comment.user_id && (
                            <DropdownMenuItem
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                          {(userRole === 'admin' || userRole === 'owner') && (
                            <DropdownMenuItem
                              onClick={() => handleDeleteCommentAsAdmin(comment.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete as Admin
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
