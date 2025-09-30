import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  Search, 
  UserX, 
  Clock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { messagingService, type BlockedUser } from '@/services/messaging-service';
import { useToast } from '@/hooks/use-toast';

interface BlockedUsersProps {
  userId: string;
}

export const BlockedUsers: React.FC<BlockedUsersProps> = ({ userId }) => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadBlockedUsers();
  }, [userId]);

  const loadBlockedUsers = async () => {
    try {
      setIsLoading(true);
      const data = await messagingService.getBlockedUsers(userId);
      setBlockedUsers(data);
    } catch (error) {
      console.error('Failed to load blocked users:', error);
      toast({
        title: "Error",
        description: "Failed to load blocked users",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblockUser = async (blockedUserId: string) => {
    try {
      await messagingService.unblockUser(userId, blockedUserId);
      setBlockedUsers(prev => prev.filter(user => user.blockedId !== blockedUserId));
      toast({
        title: "Success",
        description: "User unblocked successfully"
      });
    } catch (error) {
      console.error('Failed to unblock user:', error);
      toast({
        title: "Error",
        description: "Failed to unblock user",
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

  const filteredBlockedUsers = blockedUsers.filter(user =>
    user.blockedUser.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Blocked Users
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Manage users you have blocked from viewing your profile and messaging you
        </p>
        
        <Input
          placeholder="Search blocked users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mt-2"
        />
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-96">
          {blockedUsers.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Shield className="w-8 h-8 mx-auto mb-2" />
              <p>No blocked users</p>
              <p className="text-sm">Users you block will appear here</p>
            </div>
          ) : filteredBlockedUsers.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2" />
              <p>No users found</p>
              <p className="text-sm">Try a different search term</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredBlockedUsers.map((blockedUser, index) => (
                <div key={blockedUser.id}>
                  <div className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={blockedUser.blockedUser.avatar} />
                          <AvatarFallback>
                            {getInitials(blockedUser.blockedUser.name)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">
                              {blockedUser.blockedUser.name}
                            </p>
                            <Badge variant="destructive" className="text-xs">
                              Blocked
                            </Badge>
                          </div>
                          
                          {blockedUser.reason && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Reason: {blockedUser.reason}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              Blocked {formatTimeAgo(blockedUser.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnblockUser(blockedUser.blockedId)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Unblock
                      </Button>
                    </div>
                  </div>
                  
                  {index < filteredBlockedUsers.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
