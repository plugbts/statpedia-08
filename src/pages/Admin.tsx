import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Shield, Users, Ban, Gift, Activity, Mail, AlertTriangle, MessageSquare, Target, DollarSign, Lock, ArrowLeft } from "lucide-react";
import { UserManagement } from "@/components/admin/user-management";
import { DiscordManagement } from "@/components/admin/discord-management";
import { PromoCodesAdmin } from "@/components/admin/promo-codes-admin";
import { EmailCampaignsAdmin } from "@/components/admin/email-campaigns-admin";
import { TrialAbuseAdmin } from "@/components/admin/trial-abuse-admin";
import { AuditLogs } from "@/components/admin/audit-logs";
import { SocialAdmin } from "@/components/admin/social-admin";
import { PredictionsAdmin } from "@/components/admin/predictions-admin";
import { AdManager } from "@/components/ads/ad-manager";
import { SecurityDashboard } from "@/components/admin/security-dashboard";
import { SyncStatus } from "@/components/sync/sync-status";
import { useUser } from "@/contexts/user-context";

export default function Admin() {
  const navigate = useNavigate();
  const { userRole, isLoading: userLoading, logSecurityEvent } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminRole();
  }, [userRole, userLoading]);

  const checkAdminRole = async () => {
    if (userLoading) return;
    
    if (!userRole || (userRole !== 'admin' && userRole !== 'owner')) {
      navigate("/");
      return;
    }

    setIsAdmin(true);
    setLoading(false);
  };

  const handleGoBack = () => {
    logSecurityEvent('ADMIN_PANEL_EXIT', {
      adminRole: userRole,
      action: 'navigate_back_to_main'
    });
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Admin Panel</h1>
              <p className="text-muted-foreground">Manage users, Discord integrations, and system settings</p>
            </div>
          </div>
          <Button 
            onClick={handleGoBack} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back to Navigation
          </Button>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className={`grid w-full ${userRole === 'owner' ? 'grid-cols-11' : 'grid-cols-10'}`}>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="discord">
              <Activity className="h-4 w-4 mr-2" />
              Discord
            </TabsTrigger>
            <TabsTrigger value="promos">
              <Gift className="h-4 w-4 mr-2" />
              Promo Codes
            </TabsTrigger>
            <TabsTrigger value="emails">
              <Mail className="h-4 w-4 mr-2" />
              Email Campaigns
            </TabsTrigger>
            <TabsTrigger value="abuse">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Trial Abuse
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Ban className="h-4 w-4 mr-2" />
              Audit Logs
            </TabsTrigger>
            <TabsTrigger value="social">
              <MessageSquare className="h-4 w-4 mr-2" />
              Social
            </TabsTrigger>
            <TabsTrigger value="predictions">
              <Target className="h-4 w-4 mr-2" />
              Predictions
            </TabsTrigger>
            <TabsTrigger value="ads">
              <DollarSign className="h-4 w-4 mr-2" />
              Ads
            </TabsTrigger>
            <TabsTrigger value="security">
              <Lock className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
            {userRole === 'owner' && (
              <TabsTrigger value="sync">
                <Activity className="h-4 w-4 mr-2" />
                Sync
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <UserManagement />
          </TabsContent>

          <TabsContent value="discord" className="space-y-4">
            <DiscordManagement />
          </TabsContent>

          <TabsContent value="promos" className="space-y-4">
            <PromoCodesAdmin />
          </TabsContent>

          <TabsContent value="emails" className="space-y-4">
            <EmailCampaignsAdmin />
          </TabsContent>

          <TabsContent value="abuse" className="space-y-4">
            <TrialAbuseAdmin />
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <AuditLogs />
          </TabsContent>

          <TabsContent value="social" className="space-y-4">
            <SocialAdmin />
          </TabsContent>

          <TabsContent value="predictions" className="space-y-4">
            <PredictionsAdmin />
          </TabsContent>

          <TabsContent value="ads" className="space-y-4">
            <AdManager isAdmin={true} />
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <SecurityDashboard />
          </TabsContent>

          {userRole === 'owner' && (
            <TabsContent value="sync" className="space-y-4">
              <SyncStatus showDetails={true} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
