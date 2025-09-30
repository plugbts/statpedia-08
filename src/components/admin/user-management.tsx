import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  Shield, 
  Crown, 
  UserCheck, 
  UserX, 
  Mail, 
  Calendar,
  TrendingUp,
  Activity,
  Eye,
  Edit,
  Ban,
  Unlock,
  Trash2,
  RefreshCw,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useUser } from '@/contexts/user-context';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface UserData {
  id: string;
  email: string;
  display_name: string;
  username: string;
  role: string;
  subscription_tier: string;
  created_at: string;
  last_sign_in: string;
  is_active: boolean;
  karma: number;
  roi_percentage: number;
  total_posts: number;
  total_comments: number;
  is_muted: boolean;
  avatar_url?: string;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  premiumUsers: number;
  adminUsers: number;
  mutedUsers: number;
}

export function UserManagement() {
  const { userRole, validateUserAccess, getMaskedEmail, logSecurityEvent, isOwnerEmail } = useUser();
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
    premiumUsers: 0,
    adminUsers: 0,
    mutedUsers: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionChange, setSubscriptionChange] = useState({
    userId: '',
    newTier: '',
    reason: ''
  });
  const { toast } = useToast();

  // Check if user has admin access
  if (!validateUserAccess('admin')) {
    return (
      <Alert className="border-destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to access user management.
        </AlertDescription>
      </Alert>
    );
  }

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter, subscriptionFilter]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      
      // Load users from profiles table
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Load user profiles for social data
      const { data: userProfiles, error: userProfilesError } = await supabase
        .from('user_profiles')
        .select('*');

      if (userProfilesError) {
        console.warn('Could not load user profiles:', userProfilesError);
      }

      // Combine data
      const usersData: UserData[] = profiles.map(profile => {
        const userProfile = userProfiles?.find(up => up.user_id === profile.user_id);
        
        // Determine role based on email (for owner accounts)
        let role = userProfile?.role || 'user';
        if (profile.email && isOwnerEmail(profile.email)) {
          role = 'owner';
        } else if (profile.email?.includes('admin')) {
          role = 'admin';
        } else if (profile.email?.includes('mod')) {
          role = 'mod';
        }
        
        // Get username with better fallback - prioritize social tab username
        let username = userProfile?.username;
        if (!username) {
          // Try to get from email prefix
          username = profile.email?.split('@')[0] || `user_${profile.user_id.slice(0, 8)}`;
        }
        
        // Ensure username is consistent with social tab format
        if (username && !username.startsWith('@')) {
          // Username should not have @ prefix in data, but display with @
          username = username;
        }
        
        return {
          id: profile.user_id,
          email: profile.email || '',
          display_name: profile.display_name || profile.email?.split('@')[0] || 'Unknown',
          username: username,
          role: role,
          subscription_tier: profile.subscription_tier || 'free',
          created_at: profile.created_at,
          last_sign_in: profile.last_sign_in || profile.created_at,
          is_active: profile.is_active !== false,
          karma: userProfile?.karma || 0,
          roi_percentage: userProfile?.roi_percentage || 0,
          total_posts: userProfile?.total_posts || 0,
          total_comments: userProfile?.total_comments || 0,
          is_muted: userProfile?.is_muted || false,
          avatar_url: userProfile?.avatar_url
        };
      });

      setUsers(usersData);
      calculateStats(usersData);
      
      logSecurityEvent('ADMIN_USER_DATA_LOADED', { 
        userCount: usersData.length,
        adminRole: userRole 
      });
    } catch (error) {
      console.error('Failed to load users:', error);
      toast({
        title: "Error",
        description: "Failed to load user data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (usersData: UserData[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    setStats({
      totalUsers: usersData.length,
      activeUsers: usersData.filter(u => u.is_active).length,
      newUsersToday: usersData.filter(u => new Date(u.created_at) >= today).length,
      premiumUsers: usersData.filter(u => u.subscription_tier !== 'free').length,
      adminUsers: usersData.filter(u => ['admin', 'owner'].includes(u.role)).length,
      mutedUsers: usersData.filter(u => u.is_muted).length
    });
  };

  const filterUsers = () => {
    let filtered = users;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.display_name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query)
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Subscription filter
    if (subscriptionFilter !== 'all') {
      filtered = filtered.filter(user => user.subscription_tier === subscriptionFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      // First, check if user profile exists
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('user_profiles')
          .update({ role: newRole })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Create new profile with role
        const user = users.find(u => u.id === userId);
        if (!user) throw new Error('User not found');

        const { error } = await supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            username: user.username,
            display_name: user.display_name,
            role: newRole,
            karma: 0,
            roi_percentage: 0,
            total_posts: 0,
            total_comments: 0,
            is_muted: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));

      logSecurityEvent('USER_ROLE_CHANGED', {
        targetUserId: userId,
        newRole,
        adminRole: userRole
      });

      toast({
        title: "Success",
        description: `User role updated to ${newRole}`
      });
    } catch (error) {
      console.error('Failed to update role:', error);
      toast({
        title: "Error",
        description: `Failed to update user role: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const handleMuteToggle = async (userId: string, isMuted: boolean) => {
    try {
      // First, check if user profile exists
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('user_profiles')
          .update({ is_muted: isMuted })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Create new profile with mute status
        const user = users.find(u => u.id === userId);
        if (!user) throw new Error('User not found');

        const { error } = await supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            username: user.username,
            display_name: user.display_name,
            role: user.role,
            karma: 0,
            roi_percentage: 0,
            total_posts: 0,
            total_comments: 0,
            is_muted: isMuted,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, is_muted: isMuted } : user
      ));

      logSecurityEvent('USER_MUTE_TOGGLED', {
        targetUserId: userId,
        isMuted,
        adminRole: userRole
      });

      toast({
        title: "Success",
        description: `User ${isMuted ? 'muted' : 'unmuted'}`
      });
    } catch (error) {
      console.error('Failed to toggle mute:', error);
      toast({
        title: "Error",
        description: `Failed to update user mute status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const handleSubscriptionChange = async () => {
    if (!subscriptionChange.userId || !subscriptionChange.newTier) {
      toast({
        title: "Error",
        description: "Please select a user and subscription tier",
        variant: "destructive"
      });
      return;
    }

    try {
      // Update subscription in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ subscription_tier: subscriptionChange.newTier })
        .eq('user_id', subscriptionChange.userId);

      if (profileError) throw profileError;

      // Update subscription in user_profiles table if it exists
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', subscriptionChange.userId)
        .single();

      if (existingProfile) {
        const { error: userProfileError } = await supabase
          .from('user_profiles')
          .update({ subscription_tier: subscriptionChange.newTier })
          .eq('user_id', subscriptionChange.userId);

        if (userProfileError) throw userProfileError;
      }

      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === subscriptionChange.userId 
          ? { ...user, subscription_tier: subscriptionChange.newTier }
          : user
      ));

      logSecurityEvent('USER_SUBSCRIPTION_CHANGED', {
        targetUserId: subscriptionChange.userId,
        newTier: subscriptionChange.newTier,
        reason: subscriptionChange.reason,
        adminRole: userRole
      });

      toast({
        title: "Success",
        description: `User subscription updated to ${subscriptionChange.newTier}`
      });

      // Reset form
      setSubscriptionChange({
        userId: '',
        newTier: '',
        reason: ''
      });
      setShowSubscriptionModal(false);
    } catch (error) {
      console.error('Failed to update subscription:', error);
      toast({
        title: "Error",
        description: `Failed to update subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const syncUsernameWithSocial = async (userId: string, newUsername: string) => {
    try {
      // Update username in user_profiles table
      const { error: userProfileError } = await supabase
        .from('user_profiles')
        .update({ username: newUsername })
        .eq('user_id', userId);

      if (userProfileError) throw userProfileError;

      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, username: newUsername } : user
      ));

      logSecurityEvent('USERNAME_SYNCED', {
        targetUserId: userId,
        newUsername,
        adminRole: userRole
      });

      toast({
        title: "Success",
        description: "Username synced with social tab"
      });
    } catch (error) {
      console.error('Failed to sync username:', error);
      toast({
        title: "Error",
        description: "Failed to sync username with social tab",
        variant: "destructive"
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin': return <Shield className="w-4 h-4 text-red-500" />;
      case 'mod': return <UserCheck className="w-4 h-4 text-blue-500" />;
      default: return <Users className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const variants = {
      owner: 'default',
      admin: 'destructive',
      mod: 'secondary',
      user: 'outline'
    } as const;

    return (
      <Badge variant={variants[role as keyof typeof variants] || 'outline'}>
        {getRoleIcon(role)}
        <span className="ml-1 capitalize">{role}</span>
      </Badge>
    );
  };

  const getSubscriptionBadge = (tier: string) => {
    const variants = {
      premium: 'default',
      pro: 'secondary',
      free: 'outline'
    } as const;

    return (
      <Badge variant={variants[tier as keyof typeof variants] || 'outline'}>
        {tier.toUpperCase()}
      </Badge>
    );
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadUsers} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{stats.activeUsers}</div>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{stats.newUsersToday}</div>
                <p className="text-xs text-muted-foreground">New Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold">{stats.premiumUsers}</div>
                <p className="text-xs text-muted-foreground">Premium</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-500" />
              <div>
                <div className="text-2xl font-bold">{stats.adminUsers}</div>
                <p className="text-xs text-muted-foreground">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserX className="w-4 h-4 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{stats.mutedUsers}</div>
                <p className="text-xs text-muted-foreground">Muted</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Search by name, email, or username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="role-filter">Role</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="mod">Moderator</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="subscription-filter">Subscription</Label>
              <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subscriptions</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
    <Card>
      <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Manage user accounts and permissions
          </CardDescription>
      </CardHeader>
      <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>
                      {user.display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{user.display_name}</h3>
                      {user.is_muted && (
                        <Badge variant="destructive" className="text-xs">
                          Muted
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getMaskedEmail(user.email)} • @{user.username}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {getRoleBadge(user.role)}
                      {getSubscriptionBadge(user.subscription_tier)}
                      <span className="text-xs text-muted-foreground">
                        {user.karma} karma • {user.roi_percentage.toFixed(1)}% ROI
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedUser(user);
                      setShowUserDetails(true);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  {validateUserAccess('admin') && (
                    <>
                      <Select
                        value={user.role}
                        onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="mod">Moderator</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          {validateUserAccess('owner') && (
                            <SelectItem value="owner">Owner</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSubscriptionChange({
                            userId: user.id,
                            newTier: user.subscription_tier,
                            reason: ''
                          });
                          setShowSubscriptionModal(true);
                        }}
                        title="Manage Subscription"
                      >
                        <Crown className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => syncUsernameWithSocial(user.id, user.username)}
                        title="Sync Username with Social Tab"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMuteToggle(user.id, !user.is_muted)}
                      >
                        {user.is_muted ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <Card className="fixed inset-4 z-50 overflow-auto">
          <CardHeader>
            <CardTitle>User Details</CardTitle>
            <CardDescription>
              Detailed information about {selectedUser.display_name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Display Name</Label>
                <p className="text-sm font-medium">{selectedUser.display_name}</p>
              </div>
              <div>
                <Label>Username</Label>
                <p className="text-sm font-medium">@{selectedUser.username}</p>
              </div>
              <div>
                <Label>Email</Label>
                <p className="text-sm font-medium">{getMaskedEmail(selectedUser.email)}</p>
              </div>
              <div>
                <Label>Role</Label>
                <div className="flex items-center gap-2">
                  {getRoleIcon(selectedUser.role)}
                  <span className="text-sm font-medium capitalize">{selectedUser.role}</span>
                </div>
              </div>
              <div>
                <Label>Subscription</Label>
                <p className="text-sm font-medium">{selectedUser.subscription_tier.toUpperCase()}</p>
              </div>
              <div>
                <Label>Status</Label>
                <div className="flex items-center gap-2">
                  {selectedUser.is_active ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm font-medium">
                    {selectedUser.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div>
                <Label>Karma</Label>
                <p className="text-sm font-medium">{selectedUser.karma}</p>
              </div>
              <div>
                <Label>ROI</Label>
                <p className="text-sm font-medium">{selectedUser.roi_percentage.toFixed(1)}%</p>
              </div>
              <div>
                <Label>Posts</Label>
                <p className="text-sm font-medium">{selectedUser.total_posts}</p>
              </div>
              <div>
                <Label>Comments</Label>
                <p className="text-sm font-medium">{selectedUser.total_comments}</p>
              </div>
              <div>
                <Label>Created</Label>
                <p className="text-sm font-medium">
                  {new Date(selectedUser.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <Label>Last Sign In</Label>
                <p className="text-sm font-medium">
                  {new Date(selectedUser.last_sign_in).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowUserDetails(false)}
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Management Modal */}
      {showSubscriptionModal && (
        <Card className="fixed inset-4 z-50 overflow-auto">
          <CardHeader>
            <CardTitle>Manage User Subscription</CardTitle>
            <CardDescription>
              Change user subscription plan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="user-select">User</Label>
                <Select
                  value={subscriptionChange.userId}
                  onValueChange={(value) => setSubscriptionChange(prev => ({ ...prev, userId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.display_name} (@{user.username}) - {user.subscription_tier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="subscription-tier">Subscription Tier</Label>
                <Select
                  value={subscriptionChange.newTier}
                  onValueChange={(value) => setSubscriptionChange(prev => ({ ...prev, newTier: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="reason">Reason for Change</Label>
              <Input
                id="reason"
                placeholder="Enter reason for subscription change..."
                value={subscriptionChange.reason}
                onChange={(e) => setSubscriptionChange(prev => ({ ...prev, reason: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSubscriptionModal(false);
                  setSubscriptionChange({ userId: '', newTier: '', reason: '' });
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSubscriptionChange}>
                Update Subscription
              </Button>
            </div>
      </CardContent>
    </Card>
      )}
    </div>
  );
}
